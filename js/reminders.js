// reminders.js: reminders that ping the phone at a set time each day.
//
// Each reminder is an item (see db.js) like this:
//   { id: "reminder-...", kind: "reminder", day: "", text: "What movement today?", time: "13:00" }
// "day" is empty because a reminder isn't tied to one day.
//
// How a reminder reaches the phone:
//   1. "Turn on reminders" asks for permission to show notifications and
//      signs this phone up with the reminder sender (worker/ in this repo).
//   2. The app sends the sender only the list of times, never the texts.
//   3. At each time the sender pings the phone. The service worker (sw.js)
//      then shows the reminders that are due, using the texts kept here.

// The sender's web address. Filled in after it is published on Cloudflare.
const REMINDER_SENDER_URL = '';

async function getReminders() {
  const items = await getAllItems();
  return items
    .filter((item) => item.kind === 'reminder' && !item.deleted)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function addReminder(text, time) {
  return putItem({ id: newId('reminder'), kind: 'reminder', day: '', text, time });
}

// A random name for this phone, so the sender can tell phones apart.
async function getDeviceKey() {
  let key = await getMeta('reminderDeviceKey');
  if (!key) {
    key = crypto.randomUUID();
    await setMeta('reminderDeviceKey', key);
  }
  return key;
}

function remindersSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function senderRequest(path, body) {
  const response = await fetch(REMINDER_SENDER_URL + path, body && {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `The reminder sender answered ${response.status}.`);
  return result;
}

// Asks for permission and signs this phone up. Must be started by a tap.
async function turnOnReminders() {
  if (!REMINDER_SENDER_URL) throw new Error("The reminder sender isn't set up yet.");
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notifications are blocked. Allow them in Chrome\'s site settings for Keystone.');
  }
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const { publicKey } = await senderRequest('/public-key');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64urlToBytes(publicKey),
    });
  }
  await sendSchedule();
}

// Tells the sender which times to ping this phone at.
// Returns false if reminders aren't turned on for this phone.
async function sendSchedule() {
  if (!REMINDER_SENDER_URL || !remindersSupported() || Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;

  const reminders = await getReminders();
  await senderRequest('/schedule', {
    deviceKey: await getDeviceKey(),
    endpoint: subscription.endpoint,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    times: reminders.map((reminder) => reminder.time),
  });
  return true;
}

function base64urlToBytes(string) {
  const base64 = string.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}
