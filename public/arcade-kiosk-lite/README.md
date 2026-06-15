# Arcade Lite Kiosk (Android 4.4+)

Plain HTML/JS version of the Legends arcade kiosk for **old tablets** that cannot run the main React app (Android 4.4 KitKat, old WebView).

## URL

**Production:** `https://YOUR-DOMAIN/arcade-kiosk-lite/`

**Local dev:** `http://localhost:5173/arcade-kiosk-lite/`

Bookmark this on the tablet. Do **not** use `#/arcade/kiosk` on KitKat — that route requires a modern browser.

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

1. Use **Chrome** if the stock browser fails (install an old APK if needed).
2. Add to home screen for fullscreen-ish kiosk.
3. Settings → Developer options → stay awake while charging.
