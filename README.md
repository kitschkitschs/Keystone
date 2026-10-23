# Keystone

A personal day-structure app for Android, built as an installable web app.
It works offline, keeps its data on the phone, and syncs by hand through
backup files.

This is the skeleton: the plumbing for installing, offline use, storage and
sync, with a plain test screen. There's no visual design yet.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page itself. |
| `style.css` | Styling. Kept minimal for now. |
| `js/db.js` | Saves and reads data on the device (IndexedDB). |
| `js/sync.js` | Saves a backup file and loads one back in. |
| `js/reminders.js` | Daily reminders, and signing the phone up for pings. |
| `js/app.js` | Connects the screen to the files above. |
| `sw.js` | The service worker, which keeps a copy of the app so it opens offline. |
| `manifest.webmanifest` | Name and icon used when the app is installed to the home screen. |
| `icons/` | Placeholder icons. `badge.png` is the small symbol on reminder notifications. |
| `worker/` | The reminder sender, a tiny program that runs on Cloudflare. |
| `.github/workflows/deploy-reminders.yml` | Publishes `worker/` to Cloudflare when it changes. |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. |

There's no build step. The files in this folder are exactly what runs.

## How data is stored

Every piece of data is an "item" with a unique `id`, the `day` it belongs to,
and `updatedAt`, the time it last changed. Deleting an item keeps it with
`deleted: true`, so the deletion can sync to your other device.

## How sync works

- **Save to file** opens Android's share menu with a file named like
  `keystone-2026-10-23-1415.txt`. Send it to Proton Drive. Every save is a new
  file, so each one is also a backup. On a PC, the file downloads instead.
- **Load from file**: download the newest backup from Proton Drive, then pick it
  from Downloads. The app compares each item with what's already there and keeps
  whichever copy changed most recently. Loading an older file never wipes newer data.
- A reminder appears when your last save is more than 7 days old
  (`BACKUP_REMINDER_DAYS` in `js/app.js`).

The file is JSON inside, but ends in `.txt` because Chrome won't share `.json` files.

## How reminders (Notice) work

Chrome can't wake a web app at an exact time, so a small free program on
Cloudflare (`worker/`) does it. Once a minute it checks its list, and at each
reminder time it sends an empty ping to the phone. The service worker
(`sw.js`) then shows whichever reminders are due, with their texts from the
phone's own data.

The sender only knows the phone's push address, its time zone and the list of
times. It never sees reminder texts or anything else from Keystone.

Setup, done once:

1. A free Cloudflare account, with a workers.dev subdomain chosen
   (Cloudflare asks for one the first time you open **Workers & Pages**).
2. Two repository secrets in GitHub (**Settings > Secrets and variables >
   Actions**): `CLOUDFLARE_API_TOKEN`, made from the "Edit Cloudflare Workers"
   token template, and `CLOUDFLARE_ACCOUNT_ID`.
3. After the first publish, the sender's address goes into
   `REMINDER_SENDER_URL` in `js/reminders.js`.

On the phone, tap **Let Notice reach this phone**. To get reminders on a
watch, switch on notifications for Keystone in the watch's phone app
(for Garmin, the Garmin Connect app).

## Trying it on your PC

Service workers only run from a web address, not by double-clicking
`index.html`. One easy way: install [Node.js](https://nodejs.org), then in this
folder run

```
npx http-server -c-1
```

and open the address it prints.

## Adding a new file

If you add a new file the app needs, also add it to `APP_FILES` in `sw.js`,
so it's available offline.

## Privacy

This repository is public. Never commit personal data or backup files.
