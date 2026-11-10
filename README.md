# Daybook

A personal day app for Android, built as an installable web app: planner,
health, study, home, hobbies, notebook and insight in one place. It works
offline, keeps its data on the phone, and backs up by hand through a file.

The app lives at https://kitschkitschs.github.io/Keystone/

## Files

| File | What it does |
| --- | --- |
| `index.html` | The whole app in one file. It is built from `src/`, so don't edit it by hand. |
| `store.js` | Saves and reads data on the phone (IndexedDB). Used by the app and by `sw.js`. |
| `sw.js` | The service worker: keeps a copy of the app so it opens offline, and shows reminders when a ping arrives. |
| `manifest.webmanifest` | Name and icon used when the app is installed to the home screen. |
| `icons/` | The app icon. `badge.png` is the small symbol on reminder notifications. |
| `worker/` | The reminder sender, a tiny program that runs on Cloudflare. |
| `.github/workflows/deploy-reminders.yml` | Publishes `worker/` to Cloudflare when it changes. |
| `src/` | The app's source: `page.html` (layout and styles), `app.js` and the other parts, the icons, and `build.py`. |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. |

## Changing the app

Edit the files in `src/`, then build:

```
cd src
python3 build.py
```

That writes a new `index.html` (and copies `store.js`) into the folder above.
Commit both the source and the built file.

## Where the data lives

Everything stays on the phone, in the browser's own storage for this site.
Photos and PDFs are kept there as files. Nothing is sent anywhere, with one
exception: reminder times (see below).

## Backups

In the ⋯ menu, under Data:

- **Save a backup** opens Android's share menu with a file named like
  `daybook-2026-11-11-0915.txt`. Send it to Proton Drive. Every save is a new
  file with everything in it, photos included. On a computer the file
  downloads instead. The file is JSON inside, but ends in `.txt` because
  Chrome won't share `.json` files.
- **Load a backup** replaces everything on the phone with what is in the
  file. It asks first.
- When the last backup is more than 7 days old, a dot shows on the ⋯ button
  and the Save a backup line turns red (`BK_DAYS` in `src/host.js`).

## Reminders

Chrome can't wake a web app at an exact time by itself, so a small sender on
Cloudflare does it (`worker/`).

1. Planner > Reminders > the bell > **Turn on** asks for permission to show
   notifications and signs the phone up with the sender.
2. The app sends the sender only times and days, never the words.
3. At each time the sender pings the phone with an empty message. `sw.js`
   then shows the reminders that are due, using the words kept on the phone.

A reminder linked to an item ("only if this isn't done yet") stays quiet on a
day the item is already ticked.

The sender needs two repository secrets to publish itself:
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Its web address is set as
`REM_SENDER` in `src/host.js`.

## Trying it on a computer

Service workers only run from a web address, not by double-clicking
`index.html`. One easy way, in this folder:

```
python3 -m http.server 8080
```

and open http://localhost:8080.

## Privacy

This repository is public. Never commit personal data or backup files.
