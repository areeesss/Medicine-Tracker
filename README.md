# Medication Tracker PWA & Desktop Widget

A modern, responsive, and installable Progressive Web App (PWA) and native desktop widget designed to help you track daily medications and build consistent habits. Built with **React**, **Vite**, **Tailwind CSS**, and **Tauri v2**, it features a sleek dark glassmorphism design, multi-dose segmented capsule tracking, dynamic streaks, and seamless desktop/mobile integrations.

---

## Key Features

- **Desktop Widget Mode**: Run as a lightweight, borderless, semi-transparent native desktop widget. Features custom window controls (minimize and close), interactive titlebar dragging, and auto-dimensions ($380\text{px} \times 580\text{px}$).
- **Multi-Dose segmented Tracking**: Log medications taken once or multiple times daily (1 to 4 doses) using an intuitive row of interactive visual capsule segments.
- **Dynamic Streaks**: Streaks increment automatically when all medications for the day are taken. The streak is preserved across days if yesterday's medications were completed, resetting at midnight if they were missed.
- **Automatic Midnight Reset**: Clean daily state resets happen automatically at midnight using periodic background timers, visibility state listeners, and tab focus hooks.
- **Interactive Reordering**: Drag and drop cards to organize medications in any custom priority sequence (utilizes pointer event listeners).
- **Celestial Sound Effects**: Built-in sound effects (using the Web Audio API) provide delightful double-chimes for dose completion and a celestial chord progression when the entire day is completed. Can be muted via the header control.
- **Native Haptics**: Subtle vibrations (vibration API) provide tactile feedback when reordering cards or toggling doses on mobile interfaces.
- **PWA Installation**: Install as a standalone fullscreen app on both PC and Android devices with offline persistence.
- **Responsive Layout**: Designed with touch-safe, WCAG-compliant invisible $44\text{px} \times 44\text{px}$ touch targets to prevent accidental clicks while keeping the visual layout clean and compact.

---

## How to Use on PC

### 1. Local Development Setup
1. Ensure you have **Node.js** (version 18 or above) installed on your system.
2. Clone or open the repository directory in your terminal.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The application will run locally at `http://localhost:5173`.

### 2. Desktop Installation (PWA)
1. Open Google Chrome, Microsoft Edge, or any chromium-based browser and navigate to `http://localhost:5173`.
2. Look at the right side of the URL browser address bar. Click the **Install Icon** (a monitor icon with a down arrow).
3. Alternatively, click the browser's menu (three dots) and select **Install Medication Tracker**.
4. The app will launch in a standalone window, added to your desktop and start menu.

---

## How to Use on Android

To run and install the application on your Android phone during local development:

### 1. Development Network Access
1. Ensure your PC and your Android phone are connected to the **same Wi-Fi network**.
2. Run the Vite development server exposed to your local network:
   ```bash
   npm run dev -- --host
   ```
3. Vite will display local network URLs in your terminal, for example:
   ```text
   Network: http://192.168.1.45:5173/
   ```
4. Open the Google Chrome app on your Android phone and navigate to that Network address (e.g., `http://192.168.1.45:5173`).

### 2. Android Installation (PWA)
1. Once the web app opens in Chrome on your phone, tap the **three dots menu** in the top-right corner of Chrome.
2. Select **Add to Home screen** or **Install app**.
3. Confirm by clicking **Install**.
4. The Medication Tracker icon will appear on your Android launcher/home screen as a standalone application.
5. Opening this launcher shortcut opens the app fullscreen with a native splash screen, hiding standard browser address bars, and caching files for offline use.

---

## How to Use as a Desktop Widget (Tauri)

### 1. Prerequisites
- **Rust and Cargo**: Ensure you have Rust and its system dependencies installed (required by Tauri). See the [Tauri v2 Prerequisites Guide](https://v2.tauri.app/start/prerequisites/) for your operating system.

### 2. Run in Development Mode
To launch the native desktop application in development mode:
```bash
npx tauri dev
```
This will automatically launch the Vite dev server, load the application in a borderless window, and listen for changes.

### 3. Build the Native Desktop App
To bundle the production installer and executable for your operating system:
```bash
npx tauri build
```

---

## Visual Themes

You can customize each medication card with 8 harmonious colors:
- **Indigo**
- **Emerald**
- **Rose**
- **Amber**
- **Violet**
- **Sky**
- **Teal**
- **Fuchsia**

---

## Developer Scripts

- `npm run dev`: Launch local development server.
- `npm run dev -- --host`: Launch development server exposed to your local network (for mobile access).
- `npm run build`: Compile and compress files into a production bundle (builds into `dist/` directory, including service worker scripts).
- `npm run lint`: Run ESLint to analyze codebase for syntax issues.
- `npx tauri dev`: Run the Tauri desktop widget in development mode with hot-reloading.
- `npx tauri build`: Compile and package the application as a native desktop widget installer/executable.
