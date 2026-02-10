# Work on One App at a Time (Avoid OOM)

You can work on each app **separately** while keeping **one GitHub repo** and **the same Render services**. The hub still connects everything.

---

## 1. Stop Cursor from loading the 17k file (do this first)

Add these lines to the **repo root** `.cursorignore` so Cursor never indexes the giant dues-tracker `app.js` or heavy build output:

```
# OOM prevention: exclude 17k+ line dues-tracker app.js and heavy build output
FrontEnd/public/dues-tracker/app.js
FrontEnd/dist/
FrontEnd/public/dues-tracker/
```

After saving, **reload the Cursor window** (or close and reopen the folder). Then you can open the full project without OOM.

---

## 2. Two ways to work

### Option A: Open the full repo (recommended after updating .cursorignore)

- **Folder to open:** `Front Range Pool Hub App` (repo root)
- You can edit hub, ladder, league, dues-tracker wrapper, shared, backend.
- The 17k `app.js` is excluded; you won’t see it in search/index. To change dues-tracker logic without opening that file, use the split script (see below).

### Option B: Open only one app folder

- **Hub:** open `apps/hub`
- **Ladder:** open `apps/ladder`
- **League:** open `apps/singles-league`
- **Dues Tracker (wrapper):** open `apps/dues-tracker`
- **Cueless:** open `apps/cueless`

Each of these folders has a `jsconfig.json` so `@shared` resolves to the repo’s `shared` folder. The **build still runs from the repo root or from `FrontEnd`** (same as now). You’re just limiting what Cursor has open to avoid OOM.

---

## 3. Same GitHub and Render

- **One repo** – no new repos. All apps live under `apps/` and `FrontEnd/`.
- **Same GitHub** – push and pull as you do now.
- **Same Render** – `render.yaml` and your existing backend/frontend deploy setup stay as they are. The hub and app routing don’t change.

---

## 4. How the hub connects the apps

- The hub (`apps/hub`) is the entry UI and routes to `/ladder` and `/league`.
- Ladder and league are React apps under `apps/ladder` and `apps/singles-league`.
- Dues Tracker is loaded via an iframe to `/dues-tracker/index.html` (the legacy app in `FrontEnd/public/dues-tracker/`). The React wrapper is in `apps/dues-tracker`.
- All of this is built and served from the same monorepo and deployment.

---

## 5. Editing the 17k dues-tracker `app.js` without loading it

The file `FrontEnd/public/dues-tracker/app.js` is excluded so Cursor won’t open it. To change it safely:

1. **Split it first** – From repo root, run:  
   `node scripts/split-dues-app-js.cjs`  
   That script reads `app.js` in chunks (no full load into memory), splits it into smaller modules, and leaves the original intact. After that you can edit the new small files.

2. **Or use another editor** – Open only `FrontEnd/public/dues-tracker/app.js` in VS Code or another editor that handles large files better, if you prefer not to split yet.

---

## Quick reference

| Goal                     | Action |
|--------------------------|--------|
| No OOM when opening repo | Add the 3 lines above to root `.cursorignore`, then reload Cursor. |
| Focus on one app         | Open only `apps/hub`, `apps/ladder`, etc. |
| Same GitHub/Render       | Keep one repo and current `render.yaml`; no changes needed. |
| Change dues-tracker logic| Run `node scripts/split-dues-app-js.cjs`, then edit the new modules. |
