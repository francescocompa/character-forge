# Installing Character Forge

Character Forge is a web app that installs to your home screen and runs fully
offline — at the table, in a basement, on a plane. Nothing you do is sent
anywhere; every character and every session lives on your device.

The app shell lives at:

> **https://<your-github-username>.github.io/character-forge/**

Open that once while online, then install it with the steps below.

---

## iPhone / iPad (add to Home Screen)

1. Open the link above in **Safari** (Chrome on iOS can't install web apps).
2. Tap the **Share** button (the square with an up-arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Keep the name **Character Forge**, tap **Add**.
5. Launch it from the new home-screen icon. It now opens full-screen, with no
   Safari chrome, and works with no signal.

The first launch caches the whole app. After that it loads instantly and works
in Airplane Mode.

## Mac / desktop (install)

- **Chrome / Edge:** open the link, then click the **install icon** in the
  address bar (a monitor with a down-arrow), or menu → **Install Character
  Forge**.
- **Safari (macOS):** File → **Add to Dock**.

You can also just use it in a browser tab — install is optional; it only adds
the standalone window and the icon.

---

## Loading a character

Characters are single `.character.json` files that Claude Code compiles from a
build document. They are **not** bundled with the app — you import the ones you
want. The files sync through **Google Drive**.

### On the Mac

1. Compiled character files live in
   `~/Documents/D&D/D&D Character Builder/Characters/`. With **Google Drive for
   desktop** running, that folder syncs to Drive automatically.
2. In Character Forge, drag a `.character.json` onto the window, or use the
   **Import** button and pick the file.

### On the iPhone

1. Make sure the **Google Drive** app (or the Drive location in **Files**) is
   set up, so your `Characters` folder is reachable from the Files app.
2. In Character Forge, tap **Import**.
3. In the file picker, browse to **Google Drive → … → Characters** and pick the
   `.character.json`.

Imported characters are stored on the device — you don't re-import on every
launch. When a build changes, re-import the same file: the app offers a
**Refresh** that updates the sheet while keeping your live session (HP, slots,
prepared spells).

> **Variants** of one character (same `characterId`, different build choices)
> group under one card with a switcher. Each variant keeps its own session.

---

## Updates

When a new version of the app is deployed, you'll see a **"New version
available — Reload"** toast the next time you open it. Tap **Reload** to switch
to the new version. Nothing swaps out from under you mid-session.

## Keeping your data

The app asks the browser to keep its storage **persistent** so your characters
and sessions aren't evicted. To be safe before anything important, use **Export
session** in the top bar to save a `.session.json` you can re-import later.

## Troubleshooting

- **"Add to Home Screen" is missing** — you're not in Safari. Open the link in
  Safari and try again.
- **The app looks stale after a deploy** — open it once online so the update
  toast can appear, then tap **Reload**.
- **A character won't import** — it must be a `.character.json` this app version
  understands. If it was built for a newer format, update the app (reinstall /
  reload) first.
