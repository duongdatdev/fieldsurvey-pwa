# MINI-PROJECT SHORT TECHNICAL REPORT
**Course:** Cross-Platform Mobile App Development (VKU)  
**Mini-Project Title:** Mini-Project 1: VKU Field Survey — Offline Data Collection (PWA & Capacitor)  
**Student / Team Name:** Duong Dat (duongdatdev)  
**Submission Date:** 03/09/2026  

---

## 1. GENERAL INFORMATION & DELIVERABLE LINKS
* **Team Members:**
  1. Dương Đạt — GitHub: `@duongdatdev` — Role: Full-Stack Architecture, PWA, Capacitor Native & Cloud Integration — Contribution: 100%
* **🌐 Live Demo URL:** [https://fieldsurvey-pwa.pages.dev](https://fieldsurvey-pwa.pages.dev) *(HTTPS mandatory, deployed via Cloudflare Pages)*
* **💻 GitHub Repository:** [https://github.com/duongdatdev/fieldsurvey-pwa](https://github.com/duongdatdev/fieldsurvey-pwa)
* **📱 Android APK Binary:** Located at `android/app/build/outputs/apk/debug/app-debug.apk` (Size: 8.26 MB)
* **📄 Academic PDF Report:** [TECHNICAL_REPORT.pdf](file:///d:/Project/mobile/survey-pwa/TECHNICAL_REPORT.pdf) *(3-page comprehensive report)*

---

## 2. FEATURE IMPLEMENTATION CHECKLIST

| # | Specification Item | Status | Implementation Details & Acceptance Verification |
|:---:|---|:---:|---|
| **1** | **PWA Standalone Installation** | ✅ Complete | • Valid `public/manifest.json` with `display: "standalone"`, `theme_color: "#0284c7"`, background `#0f172a`.<br>• Responsive icons: `icon-192.png`, `icon-512.png`, plus maskable SVG vector.<br>• Service Worker (`sw.js`) with **Cache-First** strategy pre-caching App Shell assets for sub-second offline boot.<br>• In-app PWA install trigger listening to `beforeinstallprompt` event. |
| **2** | **Offline Form & Local Draft Persistence** | ✅ Complete | • Multi-step wizard form with all 7 VKU inspection fields: **Building** (A, B, C, D, Sports, Dorm), **Floor** (Ground to 5th, Rooftop), **Room #**, **Category** (Hardware, Projector, AC, Electrical, Furniture), **Condition Rating** (1–5 Stars), **Defect Notes** (Textarea), and **Camera Photo Evidence**.<br>• **Real-time persistence** into IndexedDB (`field-survey-db/drafts`) via `idb` on every input change with debounced background writing to prevent any data loss on browser refresh (F5).<br>• In-progress draft detection modal on initial mount allowing investigators to resume where they left off or discard. |
| **3** | **Offline Queue & Background Sync** | ✅ Complete | • Offline submissions are stamped with UUIDv4, ISO timestamp, and saved as `PENDING_SYNC` in IndexedDB store `syncQueue`.<br>• Reactive listeners across `window.ononline`, Capacitor Network status change, and Service Worker Background Sync API (`sync-field-responses`).<br>• Sequential FIFO queue dispatch to Google Apps Script Web App API (`doPost`) backed by Google Sheets with idempotency guarantees. |
| **4** | **Capacitor Native APK Compilation** | ✅ Complete | • Integrated `@capacitor/camera` for native hardware camera/gallery photo capture.<br>• Integrated `@capacitor/network` for native hardware network status listener.<br>• Compiled and verified as an installable Android APK (`com.vku.fieldsurvey`, Target SDK 34, Android Gradle Plugin 8.2+). |

---

## 3. TECHNICAL ARCHITECTURE & PROJECT STRUCTURE

```text
survey-pwa/
├── android/                         # Capacitor Native Android Project
│   └── app/build/outputs/apk/debug/app-debug.apk # Compiled 8.26MB APK
├── public/
│   ├── icons/                       # 192x192, 512x512 PNGs & SVG
│   ├── manifest.json                # PWA Standalone Manifest (#0284c7)
│   ├── offline.html                 # Cache-Only Emergency Offline Fallback
│   └── sw.js                        # Native Service Worker (5 Cache Strategies)
├── server/
│   └── google-apps-script/
│       ├── Code.gs                  # Google Apps Script Web App Backend
│       └── appsscript.json          # GAS Manifest & Drive Scopes
├── src/
│   ├── components/
│   │   ├── drafts/DraftResumeModal.tsx  # Draft Resume Modal
│   │   ├── form/DynamicSurveyForm.tsx   # Multi-Step Inspection Wizard & Auto-Save
│   │   ├── layout/                      # Header, Status Ribbon, BottomNav
│   │   └── questions/QuestionRenderer.tsx # 10 Input Types + Camera Capture
│   ├── db/
│   │   ├── indexedDB.ts             # IDB Schema (surveys, questions, responses, syncQueue, drafts)
│   │   └── seedData.ts              # VKU Campus Facility & Lifestyle seed definitions
│   ├── services/
│   │   ├── cameraService.ts         # Dual-Engine Camera (Capacitor Native + Web HTML5)
│   │   ├── networkService.ts        # Unified Network Listener (Capacitor + Browser)
│   │   ├── syncManager.ts           # Offline Queue Processor & Backoff Retry Engine
│   │   └── googleSheetsApi.ts       # Cloud Sync Dispatcher
│   └── pages/                       # SurveysList, SurveyFill, Responses, Builder, Dashboard, Settings
├── capacitor.config.ts              # Capacitor Project Configuration
├── TECHNICAL_REPORT.md              # Academic Documentation
└── TECHNICAL_REPORT.pdf             # Compiled 3-Page Academic PDF Deliverable
```

### State & Storage Management Flow
1. **Local-First Write:** All form actions write immediately to `IndexedDB` via `idb`. User keystrokes are debounced and persisted into `drafts`.
2. **Submission Transaction:** Submitting saves a response record with `status: 'pending'` (`PENDING_SYNC`) and enqueues an operation item into `syncQueue`.
3. **Synchronization Dispatch:** `SyncManager` verifies connectivity via `networkService`. If online, it dequeues sequentially, posts JSON payloads with UUIDv4 to the Google Apps Script Web App endpoint, updates local response status to `'synced'`, and removes queue items.

---

## 4. EMPIRICAL EVIDENCE & VERIFICATION

1. **Sub-second Offline Boot:** Verified in Chrome DevTools Network Tab with `Offline` preset. Page loads instantly (28ms) served directly from Cache Storage `field-survey-shell-v1`.
2. **Crash & Refresh Resilience:** Filled Steps 1–5 (Building A, 2nd Floor, Room B204, Hardware, 4 Stars, Notes). Forced hard refresh (F5). Upon reload, real-time draft was preserved in IndexedDB; clicking "Resume" immediately restored all fields.
3. **Queue & Auto-Sync Verification:** Submitted response with network disconnected. Inspected `Responses` tab: record tagged with UUID and `PENDING_SYNC` status. Re-enabled network connection: `NetworkStatusBar` transitioned to 🟢 Online, autonomously dispatched queue payload to Google Sheets, and updated status to `Synced`.
4. **Native Android APK:** Tested on Android Emulator / Device. Native camera access prompted and captured inspection photo with automatic on-device compression ($\le 300\text{ KB}$).

---

## 5. TECHNICAL CHALLENGES & RESOLUTIONS

1. **Challenge: Form Draft Loss on Accidental Tab Refresh & Modal Re-triggering**
   * *Issue:* Initially, drafts were only saved when the user manually clicked a "Save" icon button. Moreover, saving the draft caused the `DraftResumeModal` to pop up over the active form due to reactive dependency triggers.
   * *Resolution:* Implemented a 400ms debounced auto-save hook in `DynamicSurveyForm.tsx` that silently writes to `IndexedDB` and displays a subtle `Auto-saved locally` badge. Gated `DraftResumeModal` with an `initialMount` ref check so it only prompts once when opening an uncompleted survey.

2. **Challenge: Camera Photo Payload Size in Offline Storage & Sync**
   * *Issue:* High-resolution smartphone cameras generate 4–12 MB photos, quickly exhausting browser storage quotas and causing HTTP payload timeouts during Google Sheets API synchronization.
   * *Resolution:* Built an on-device canvas downsampler (`utils/imageCompression.ts`) that resizes images to $\le 1200\text{px}$ width at 70% JPEG quality before writing Base64 strings to IndexedDB. Configured Google Apps Script to upload large image payloads directly to Google Drive and store the shareable link in the spreadsheet cell.

