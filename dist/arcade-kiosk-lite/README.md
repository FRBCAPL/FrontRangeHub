# Arcade Lite Kiosk (Android 4.4+)

Plain HTML/JS version of the Legends arcade kiosk for **old tablets** that cannot run the main React app (Android 4.4 KitKat, old WebView).

## URL

**Production:** `https://frontrangepool.com/arcade-kiosk-lite/index.html`

**Local dev:** `http://localhost:5173/arcade-kiosk-lite/index.html`

Bookmark the **`index.html`** URL on the tablet. Do **not** use `#/arcade/kiosk` on KitKat — that route requires a modern browser.

## Tablet lockdown (cabinet SM-T320)

Use **Fully Kiosk Browser** — step-by-step: **[TABLET-LOCKDOWN.md](./TABLET-LOCKDOWN.md)**

Summary: install Fully Kiosk → start URL = lite kiosk `index.html` above → kiosk mode ON → staff PIN → launch on boot.

## Features

- Find Game (search 410 games)
- Leaderboards + manual score entry
- Supabase scores when tables exist; localStorage fallback
- No camera/OCR (use full kiosk on a newer device later)

## Refresh game list

After updating `apps/arcade/frontend/src/data/sampleGames.js`:

```bash
node scripts/export-arcade-games-json.cjs
```

Then copy `public/arcade-kiosk-lite/` to `dist/arcade-kiosk-lite/` before deploy (or run `npm run build`).

## Tablet tips (KitKat)

1. **Lockdown:** see [TABLET-LOCKDOWN.md](./TABLET-LOCKDOWN.md) (Fully Kiosk Browser).
2. Use **Chrome** only if Fully’s built-in WebView fails (install an old APK if needed).
3. Settings → Developer options → stay awake while charging.
