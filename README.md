# Keystone

A personal day-structure app for Android, built as an installable web app.
It works offline, keeps its data on the phone, and syncs by hand through
backup files.

The home page is a cosy pixel-art room with a cat. You decorate it with your
own pieces (cut from any picture, kept on the phone and in your backup, never
in this repo), the cat comes from a sprite sheet, and the light follows the
clock. The Insight page shows habits and health over time.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page itself. |
| `style.css` | The look: paper, ink, fonts, layout. |
| `js/db.js` | Saves and reads data on the device (IndexedDB). |
| `js/sync.js` | Saves a backup file and loads one back in. |
| `js/reminders.js` | Daily reminders, and signing the phone up for pings. |
| `js/plan.js` | Tasks and habits, kept for the Insight page. |
| `js/health.js` | What the Health page tracked, kept for the Insight page. |
| `js/look.js` | Colours, the emotion palette and icons. |
| `js/colours.js` | The Colours page in the menu. |
| `js/charts.js`, `js/insight.js` | The Insight page. |
| `js/sample.js` | Made-up data, for "Show sample data" in the menu. |
| `js/room.js` | The room: the tile grid, placing and moving pieces, the cat, day and night. |
| `js/room-add.js` | Cutting your own pieces from a picture, and setting up the cat's sprite sheet. |
| `js/room-pieces.js` | The Pieces page: every piece in a list, to name them, sort them into sets and set up several at once. |
| `js/room-gacha.js` | The gacha machine that unlocks pieces, and the catalogue of everything there is to collect. |
| `js/room-duck.js` | The duck that waddles about the room, once you've given it a sprite sheet. |
| `js/farm.js` | The garden the pets tend, the farmer's market, the pantry and the stove. |
| `js/farm-page.js` | The Farm page: your own crops, market goods and recipes, picked from sprite sheets. |
| `js/map.js` | Your own tile sets (a sheet for each season) and tiles, the garden's map, and the seasons. |
| `js/map-page.js` | The Map page: cut tiles from a tile sheet and paint the garden's map with them. |
| `js/room-hud.js` | The game's buttons on the room, and its pop-up windows. |
| `js/room-art.js` | The placeholder pieces, the cat's standard sheet layout, and picture helpers. |
| `room-art/` | Placeholder art drawn for Keystone: `starter.png` (furniture) and `cat.png` (a grey tabby, Stardew pet layout). |
| `js/app.js` | Moves between pages, and connects the menu to the files above. |
| `fonts/` | Lora and Roboto, kept here so they work offline. Both are free fonts (SIL Open Font License). |
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
- **Save game only** saves just the room game (pieces, the room and what's in it,
  the pets and their breeds, the garden, crops, market goods, recipes, the pantry, tile sets, tiles and the map) as `keystone-game-….txt`. Load it on the other device
  like any backup: it merges the same way, so game changes made on the computer
  carry over to the phone without touching anything else.
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
