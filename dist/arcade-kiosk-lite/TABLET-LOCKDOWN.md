# Legends Arcade — Tablet lockdown (SM-T320 / KitKat)

**Kiosk app:** Use **Kiosk Browser Lockdown** (downloadable today) or **Fully Kiosk** (only via email from the developer — see below).

## Can you block Home / Back / Recents until PIN?

**For normal bar patrons: yes, in practice.**  
**For a determined hacker with USB/root: not 100% on Android 4.4.**

Your Tab 4 runs **Android 4.4.2** — it does **not** have modern “Lock Task Mode” (Android 5+). Fully Kiosk is the standard way to get what you want on this hardware:

| Goal | Fully Kiosk on KitKat |
|------|------------------------|
| Open arcade on power-up | Yes — launch on boot + set as Home app |
| Patrons only see the kiosk | Yes — kiosk mode + start URL |
| **Back** does nothing useful | Yes — disable / ignore in kiosk mode |
| **Home** doesn’t escape to Android | Yes — Fully becomes the **launcher**; Home returns to kiosk |
| **Recents** (window button) blocked | Usually yes in kiosk mode — **test on your tablet** |
| Staff exit with PIN | Yes — kiosk PIN (tap corner / gesture → PIN) |

Fully may ask you to set it as the **default Home app** — say **Yes**. That is what makes the Home button safe.

**Not possible without root:** completely kill hardware buttons at the OS level on KitKat. Fully intercepts them instead, which is enough for a bar cabinet.

---
| Purpose | URL |
|--------|-----|
| **Kiosk (patrons)** | `https://frontrangepool.com/arcade-kiosk-lite/index.html` |
| **Staff admin** | `https://frontrangepool.com/arcade-kiosk-lite/admin.html` |
| **Diagnostics** | `https://frontrangepool.com/arcade-tablet-diag.html` |

Do **not** use `#/arcade/kiosk` on this tablet — React requires a modern browser.

---

---

## 1. Install kiosk app (no Play Store)

**Samsung tablet, Android 4.4.2**

### Path A — Kiosk Browser Lockdown (use this if you need it today)

Fully **1.44.1 is not on APKPure** and Aptoide downloads break on KitKat. **Kiosk Browser Lockdown** is a separate app that still supports Android 4.4.

#### Do NOT use XAPK on KitKat (read this first)

**2.9.3 from APKPure is an XAPK** — a zip of **split** APK files, not one installable file.

Inside the extracted folder you typically see:

| File | What it is |
|------|------------|
| `manifest.json` | List of splits — ignore for install |
| `com.procoit.kioskbrowser.apk` (or `base.apk`) | Main app — **not enough alone** |
| `config.armeabi_v7a.apk` | 32-bit native code — note **underscores**, not `armeabi-v7a.apk` |
| `config.arm64_v8a.apk` | 64-bit — **wrong for your Tab 4** |
| `config.en.apk`, `config.xxhdpi.apk`, etc. | Language/screen splits |

**Android 4.4 cannot install split APK bundles** (that needs Android 5+ or a special installer). Tapping one file from the zip will fail or the app will crash on launch.

#### What to download instead — plain **APK**, not XAPK

1. On a **PC browser**, open:  
   [Kiosk Browser Lockdown — old versions](https://apkpure.net/kiosk-browser-lockdown/com.procoit.kioskbrowser/versions)
2. Click **Show More** and pick an older release that shows **APK** (not only XAPK), e.g. **2.6.3** (2018, ~10 MB) or **2.0.26** (2015, ~7 MB). These are usually **one fat APK** that includes 32-bit (`armeabi-v7a`) code.
3. On the download page, if there is a variant list, choose **armeabi-v7a** or **universal** — **not** arm64-v8a.
4. You want **one file** ending in `.apk` (~7–12 MB), not `.xapk`.
5. Copy that **single `.apk`** to the tablet → **Settings → Security → Unknown sources** ON → tap → **Package installer**.

If kiosk features you need are only in 2.9.x, you must either install via **USB + ADB from a PC** (advanced) or email **info@fully-kiosk.com** for Fully 1.44.1.

**Start URL** (in app settings):

```
https://frontrangepool.com/arcade-kiosk-lite/index.html
```

Then enable **Kiosk mode**, set a **staff PIN**, and set the app as **Home / launcher** when prompted. Patrons exit only with the PIN.

---

### Path B — Fully Kiosk Browser 1.44.1 (email only)

The last Fully version for KitKat is **1.44.1**. It is **no longer on APKPure, Aptoide, or fully-kiosk.com** (their download box is the current build only).

**Only reliable source:** email **info@fully-kiosk.com**:

```
Subject: Request APK for Android 4.4 (Samsung Tab 4)

Hello,

I need Fully Kiosk Browser version 1.44.1 (or the last APK that installs on Android 4.4.2) for sideloading on a Samsung SM-T320. I do not have Google Play on the device.

Could you please email me the plain APK file?

Thank you.
```

When the APK arrives, copy it to the tablet and install with **Package installer** (not Aptoide). Continue with **section 2** below for Fully-specific settings.

**Do not** install the latest Fully APK from fully-kiosk.com — it will fail on Android 4.4.

---

### Install checklist (either app)

1. Uninstall **Aptoide** and any broken partial installs.
2. Copy **only a `.apk` file** to the tablet (USB, email, or Drive).
3. **Settings → Security → Unknown sources** → ON.
4. Tap the APK → **Package installer** → Install.
5. Open the kiosk app once and accept permissions.

---

## 2. Start URL

In Fully Kiosk → **Web Content Settings** (or **Start URL**):

```
https://frontrangepool.com/arcade-kiosk-lite/index.html
```

Enable **Load Start URL on Boot**.

---

## 3. Kiosk mode — block buttons until PIN

Turn **Kiosk Mode** ON. Fully will walk you through setup.

### Must enable

| Setting | Value |
|--------|--------|
| Kiosk Mode | **ON** |
| Kiosk PIN | Staff PIN (4–6 digits) — write it down for bar staff only |
| **Set Fully as Home app / Launcher** | **Yes** when prompted |
| Load Start URL on Boot | **ON** |
| Launch Fully on boot | **ON** |

### Hardware buttons (Samsung capacitive Back / Home / Recents)

In **Kiosk Mode** / **Device Management** (menu names vary by Fully version):

| Setting | Value |
|--------|--------|
| Disable / block **Home** button | **ON** |
| Disable / block **Recent apps** button | **ON** |
| **Enable Back button** | **OFF** (do not go back in browser history) |
| Load Start URL on Home button | **ON** (if Home can’t be fully blocked, it reloads kiosk) |
| Lock system bars / status bar | **ON** if available |
| Screen always on (charging) | **ON** |

### Staff escape (only with PIN)

Default: **swipe from the left edge** → Fully menu → enter **Kiosk PIN**.

You can change the gesture in Fully settings. Patrons should not know the PIN.

### Hide browser chrome

**Browser UI** → hide address bar, notifications, action bar.

---

## 4. Reliability

| Setting | Why |
|--------|-----|
| **Reload page on idle** | e.g. every 6–12 hours — clears weird WebView state |
| **Reload after network reconnect** | ON — bar Wi‑Fi drops |
| **Clear cache on reload** | OFF (unless troubleshooting) |
| **Launch on boot** | ON — tablet power cycle returns to kiosk |
| **Autoplay / file access** | Allow camera for **Submit Score** photo (if prompted) |

---

## 5. Set Fully as the “home” experience

After everything works:

1. Fully Kiosk → **Advanced** → set as **Launcher** / **Home app** (wording varies by version).
2. Or: Android **Settings → Home** → choose Fully Kiosk Browser.

Then power-on goes straight to the arcade.

**Staff escape:** long-press or multi-tap corner (Fully default) → enter **Kiosk PIN** → exit or open settings.

---

## 6. Staff shortcuts (bookmark on your phone, not on kiosk)

- **Edit scores / maintenance:** `/arcade-kiosk-lite/admin.html` (PIN `8675` in `admin.js` — change before deploy if needed)
- **Hub admin (phone/laptop):** `https://frontrangepool.com/#/arcade/admin` when logged in as admin

---

## 7. Quick tests after setup

1. Kiosk loads **Find a Game** — search “Pac-Man”.
2. **Submit Score** → photo picker opens (rear camera).
3. **High Scores** → manual entry saves.
4. Tap **Back** — should stay on kiosk (not exit).
5. Tap **Home** — should stay on kiosk (not Android launcher).
6. Tap **Recents** — should not show other apps (or immediately return).
7. Reboot tablet — opens kiosk without touching anything.
8. Staff: swipe from left → PIN → can reach Fully settings.

---

## 8. Troubleshooting

| Problem | Fix |
|--------|-----|
| Shows Front Range homepage | Start URL must be `.../arcade-kiosk-lite/index.html` (include `index.html`) |
| Layout broken after camera | Tap **Find a Game** or reload from Fully menu; lite kiosk auto-recovers on tab change |
| Scores not saving | Run `arcade-admin-migration.sql` in Supabase; check diag page |
| Stale UI after deploy | Fully → reload, or add `?t=1` to start URL once |
| Home still opens Android | Re-run kiosk setup; confirm Fully is **default launcher** in Android Settings → Home |
| One button still works | Note which button; check Fully’s Android 4.4 FAQ; some devices need paid Fully features |
| **“Aptoide has stopped”** | You installed via Aptoide, not a plain APK. Uninstall Aptoide; sideload a plain `.apk` with Package installer |
| Fully 1.44.1 not on APKPure | Expected — use **Kiosk Browser Lockdown 2.9.3** or email **info@fully-kiosk.com** |
| APK says not compatible | File is too new (Fully) or **arm64-only** — use an older **plain APK** (2.6.3), not XAPK splits |
| XAPK unzip — no armeabi file | Look for **`config.armeabi_v7a.apk`** (underscores). Even then, splits **won’t install on KitKat** — download an older **single APK** instead |

---

## If KitKat isn’t tight enough

Only then consider:

- **Newer tablet** (Android 8+) + Fully **Lock Task Mode** — stronger Home/Recents block
- **Fully Plus** license — extra lockdown options on some devices
- Custom APK — still weaker than Fully on KitKat unless you replace the whole launcher

For Legends’ SM-T320, Fully as launcher + kiosk PIN is the right call.
