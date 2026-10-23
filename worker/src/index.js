// The reminder sender. It runs on Cloudflare, not on the phone.
//
// Chrome can't wake a web app at an exact time by itself, so this sender
// does it. Once a minute it checks its list, and when one of your reminder
// times comes up, it sends an empty "ping" to your phone. The phone then
// looks up which reminders are due in its own data and shows them.
//
// What the sender knows, per phone:
//   - the phone's push address (a random web address from Google's push service)
//   - the phone's time zone, such as "Europe/Copenhagen"
//   - a list of times, such as ["08:30", "13:00"]
// It never sees reminder texts, habit names or any other Keystone data.
// The pings are empty, so there is nothing in them to read.
//
// Addresses the app talks to:
//   GET  /public-key  the sender's public key, which the phone needs to sign up
//   POST /schedule    { deviceKey, endpoint, timeZone, times } saves one phone's list
//   POST /remove      { deviceKey } forgets one phone

import { DurableObject } from 'cloudflare:workers';

// Only the app's own web addresses may talk to the sender.
const ALLOWED_ORIGINS = [
  'https://kitschkitschs.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

// How many phones the sender keeps, so a stranger can't fill it up.
const MAX_DEVICES = 3;
const MAX_TIMES = 100;

// If Cloudflare skips a minute, pings from up to this many minutes ago still go out.
const CATCH_UP_MINUTES = 10;

// How long Google's push service keeps trying to deliver a ping while the phone is offline.
const PING_LIFETIME_SECONDS = 3600;

// Tells push services who runs this sender. Required by the push rules.
const CONTACT = 'https://github.com/kitschkitschs/keystone';

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    const store = env.STORE.get(env.STORE.idFromName('keystone'));
    const path = new URL(request.url).pathname;

    try {
      if (request.method === 'GET' && path === '/public-key') {
        return reply({ publicKey: await store.publicKey() }, 200, headers);
      }
      if (request.method === 'POST' && path === '/schedule') {
        await store.saveDevice(await request.json());
        return reply({ ok: true }, 200, headers);
      }
      if (request.method === 'POST' && path === '/remove') {
        const { deviceKey } = await request.json();
        await store.removeDevice(deviceKey);
        return reply({ ok: true }, 200, headers);
      }
      return reply({ error: 'Not found' }, 404, headers);
    } catch (error) {
      return reply({ error: error.message }, 400, headers);
    }
  },

  // Called by Cloudflare once a minute (see wrangler.toml).
  async scheduled(event, env, ctx) {
    const store = env.STORE.get(env.STORE.idFromName('keystone'));
    ctx.waitUntil(store.sendDuePings(event.scheduledTime));
  },
};

// The sender's storage. There is exactly one of these.
export class ReminderStore extends DurableObject {
  async publicKey() {
    return (await this.vapidKeys()).publicKey;
  }

  // The key pair that signs pings, made once on first use and kept here.
  // The private half never leaves the sender.
  async vapidKeys() {
    let keys = await this.ctx.storage.get('vapid');
    if (!keys) {
      const pair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      keys = {
        privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
        publicKey: base64url(await crypto.subtle.exportKey('raw', pair.publicKey)),
      };
      await this.ctx.storage.put('vapid', keys);
    }
    return keys;
  }

  async saveDevice(input) {
    const device = checkDevice(input);
    const devices = (await this.ctx.storage.get('devices')) || {};

    // The same phone signing up again (for example after clearing the app)
    // replaces its old entry.
    for (const [key, other] of Object.entries(devices)) {
      if (other.endpoint === device.endpoint) delete devices[key];
    }
    if (!devices[input.deviceKey] && Object.keys(devices).length >= MAX_DEVICES) {
      throw new Error('The reminder sender already has the most phones it allows.');
    }

    devices[input.deviceKey] = device;
    await this.ctx.storage.put('devices', devices);
  }

  async removeDevice(deviceKey) {
    const devices = (await this.ctx.storage.get('devices')) || {};
    delete devices[deviceKey];
    await this.ctx.storage.put('devices', devices);
  }

  async sendDuePings(now) {
    const lastRun = (await this.ctx.storage.get('lastRun')) || now - 60000;
    await this.ctx.storage.put('lastRun', now);

    // The minutes since the last run, usually just this one.
    const from = Math.max(lastRun, now - CATCH_UP_MINUTES * 60000);
    const minutes = [];
    for (let t = Math.floor(from / 60000) * 60000 + 60000; t <= now; t += 60000) minutes.push(t);

    const devices = (await this.ctx.storage.get('devices')) || {};
    const keys = await this.vapidKeys();
    let changed = false;

    for (const [deviceKey, device] of Object.entries(devices)) {
      const due = minutes.some((t) => device.times.includes(localTime(t, device.timeZone)));
      if (!due) continue;

      const response = await sendPing(device.endpoint, keys);
      if (response.status === 404 || response.status === 410) {
        // The phone has unsubscribed (for example the app was uninstalled).
        delete devices[deviceKey];
        changed = true;
      } else if (!response.ok) {
        console.log(`Ping failed with status ${response.status}`);
      }
    }

    if (changed) await this.ctx.storage.put('devices', devices);
  }
}

// --- Checking what the app sends ---

function checkDevice({ deviceKey, endpoint, timeZone, times }) {
  if (typeof deviceKey !== 'string' || deviceKey.length < 20 || deviceKey.length > 100) {
    throw new Error('Missing device key.');
  }
  if (typeof endpoint !== 'string' || endpoint.length > 1000 || !endpoint.startsWith('https://')) {
    throw new Error('Missing push address.');
  }
  try {
    localTime(Date.now(), timeZone);
  } catch {
    throw new Error('Unknown time zone.');
  }
  if (!Array.isArray(times) || times.length > MAX_TIMES ||
      !times.every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    throw new Error('Times must look like "13:00".');
  }
  return { endpoint, timeZone, times: [...new Set(times)] };
}

// "13:00" for a moment in time, as a clock in that time zone would show it.
function localTime(ms, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(ms));
}

// --- Sending a ping (the Web Push standard, with no message inside) ---

async function sendPing(endpoint, keys) {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(endpoint, keys),
      TTL: String(PING_LIFETIME_SECONDS),
      Urgency: 'high',
    },
    body: new Uint8Array(0),
  });
}

// A short signed note that proves the ping comes from this sender (VAPID).
async function vapidAuthorization(endpoint, keys) {
  const header = base64url(text(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = base64url(text(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: CONTACT,
  })));
  const privateKey = await crypto.subtle.importKey(
    'jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, privateKey, text(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${base64url(signature)}, k=${keys.publicKey}`;
}

// --- Small helpers ---

function text(string) {
  return new TextEncoder().encode(string);
}

function base64url(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const headers = { 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function reply(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
