# MINI-PROJECT SHORT TECHNICAL REPORT
**Course:** Cross-Platform Mobile App Development (VKU)
**Mini-Project Title:** Mini-Project 1: VKU Field Survey — Offline Data Collection (PWA & Capacitor)
**Team / Student Name:** Dương Bảo Đạt
**Submission Date:** 03/09/2026

---

## 1. GENERAL INFORMATION & DELIVERABLE LINKS
* **Team Members:**
  1. Dương Bảo Đạt — Student ID: [22ITxxx] — Role: Full-Stack Architecture, PWA, Capacitor Native & Cloud Integration — Contribution: [100%]
  2. [Student Full Name] — Student ID: [22ITyyy] — Role: [Member / Logic & State Management] — Contribution: [0%]
* **🔗 Live Demo URL:** https://fieldsurvey-pwa.pages.dev
* **💻 GitHub Repository:** https://github.com/duongdatdev/fieldsurvey-pwa
* **🎥 Video Demo (Optional):** [https://youtu.be/xxx]

---

## 2. FEATURE IMPLEMENTATION CHECKLIST
| # | Required Feature | Status | Implementation Details & Acceptance Level |
|:---:|---|:---:|---|
| 1 | PWA Standalone Installation | ✅ Complete | Valid `manifest.json` configured with `display: standalone`, theme color `#0284c7`, background `#0f172a`, responsive icons (192x192, 512x512). Service Worker (`sw.js`) caches App Shell assets using a Cache-First strategy for sub-second offline boot. |
| 2 | Offline Form & Local Draft Persistence | ✅ Complete | Multi-step inspection form with 7 VKU fields (Building, Floor, Room #, Category, 1-5 Star Rating, Defect Notes, Camera Photo Evidence). Real-time persistence into IndexedDB (`drafts`) via `idb` on every input change (debounced 400ms) to prevent data loss on browser refresh. |
| 3 | Offline Queue & Background Sync | ✅ Complete | Offline submissions are stamped with UUIDv4, ISO timestamp, and saved as `PENDING_SYNC` in IndexedDB store `syncQueue`. Listens to `window.ononline`, Capacitor Network status, and Background Sync API to automatically dispatch queued surveys sequentially upon network restoration to Google Sheets. |
| 4 | Capacitor Native APK Compilation | ✅ Complete | Integrated `@capacitor/camera` for native photo capture and `@capacitor/network` for real-time status monitoring. Packaged and verified as an installable Android APK (`com.vku.fieldsurvey`, binary at `android/app/build/outputs/apk/debug/app-debug.apk`). |

---

## 3. TECHNICAL ARCHITECTURE & PROJECT STRUCTURE
* *Briefly describe directory structure, state management flows, and exception handling strategies.*

```text
survey-pwa/
├── android/                         # Capacitor Native Android Project (app-debug.apk)
├── public/
│   ├── icons/                       # 192x192, 512x512 PNGs & SVG
│   ├── manifest.json                # PWA Standalone Manifest (#0284c7)
│   ├── offline.html                 # Cache-Only Emergency Offline Fallback
│   └── sw.js                        # Native Service Worker (Cache-First App Shell)
├── server/
│   └── google-apps-script/
│       ├── Code.gs                  # Google Apps Script Web App Backend (Google Sheets sync)
│       └── appsscript.json          # GAS Manifest & Drive Scopes
├── src/
│   ├── components/
│   │   ├── drafts/DraftResumeModal.tsx  # Draft Resume Modal
│   │   ├── form/DynamicSurveyForm.tsx   # Multi-Step Inspection Wizard & Debounced Auto-Save
│   │   └── layout/                      # Header (PWA Install), Status Ribbon, BottomNav
│   ├── db/
│   │   ├── indexedDB.ts             # IDB Schema (surveys, questions, responses, syncQueue, drafts)
│   │   └── seedData.ts              # VKU Campus Facility & Lifestyle seed definitions
│   ├── services/
│   │   ├── cameraService.ts         # Dual-Engine Camera (Capacitor Native + Web HTML5)
│   │   ├── networkService.ts        # Unified Network Listener (Capacitor + Browser)
│   │   ├── syncManager.ts           # Offline Queue Processor & Backoff Retry Engine
│   │   └── googleSheetsApi.ts       # Cloud Sync Dispatcher
│   └── pages/                       # SurveysList, SurveyFill, Responses, Builder, Config
└── capacitor.config.ts              # Capacitor Project Configuration
```

* **State & Storage Management Flow:**
  1. **Local-First Write:** All user inputs are debounced (400ms) and saved into IndexedDB store `drafts` via `idb`, preventing data loss on browser refresh (F5).
  2. **Submission Transaction:** Submissions while offline are tagged with UUIDv4, timestamp, marked as `PENDING_SYNC`, and enqueued in IndexedDB store `syncQueue`.
  3. **Automatic Synchronization:** `syncManager` monitors connectivity via `networkService` and `window.ononline`. Once reconnected, queued payloads are sent sequentially (FIFO) to the Google Apps Script endpoint, marked as `synced`, and removed from the queue.

---

## 4. EMPIRICAL EVIDENCE & SCREENSHOTS
* *Insert 3–4 annotated screenshots of the application running on an emulator or physical device.*

1. **Sub-second Offline Boot:** Verified in browser with network set to Offline. Service Worker serves App Shell instantly from Cache Storage.
2. **Local Draft Persistence:** Form fields remain intact after accidental page refresh; user can seamlessly resume in-progress audit.
3. **Offline Queue & Background Sync:** Responses submitted without internet connection receive `PENDING_SYNC` status and automatically sync to Google Sheets once connection is restored.
4. **Capacitor Native Android App:** Verified on Android device/emulator with native camera permissions and hardware network detection.

---

## 5. TECHNICAL CHALLENGES & RESOLUTIONS
* *Describe 1–2 technical bottlenecks encountered and how they were resolved.*

1. **Challenge 1: Data Loss on Page Refresh & Modal Re-triggering**
   * *Issue:* Form state was initially lost on browser refresh unless manually saved, and manual saving mistakenly triggered the `DraftResumeModal` during active editing.
   * *Resolution:* Implemented a 400ms debounced auto-save hook writing directly to IndexedDB (`drafts` store) and guarded `DraftResumeModal` with an `initialMount` ref check so it only prompts once upon initial survey open.

2. **Challenge 2: High-Resolution Camera Photo Storage & Transmission**
   * *Issue:* Uncompressed camera photos (4–12 MB) rapidly exceed IndexedDB quotas and cause HTTP payload timeouts when syncing over slow networks.
   * *Resolution:* Created an on-device canvas compression utility that scales photos to $\le 1200\text{px}$ at 70% JPEG quality before saving to IndexedDB, and configured the Google Apps Script backend to handle photo uploads efficiently.
