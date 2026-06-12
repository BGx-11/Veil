# Veil Browser

![Electron](https://img.shields.io/badge/Built_with-Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.0-blueviolet?style=for-the-badge)

**Distribution Site**: [veil.iambgx.in](https://veil.iambgx.in) *(coming soon)*

Veil is a privacy-hardened desktop browser built entirely with **Electron + Next.js + React**. It combines **network-level ad/tracker blocking** via the Ghostery engine, **one-click Tor Network integration**, and a **WebGPU-accelerated on-device AI** that summarizes web pages locally — your data never leaves your machine. Wrapped in a stunning glassmorphism UI with both dark and light themes.

---

> [!CAUTION]
> ### Privacy Notice
> Veil Browser is designed for **personal privacy and security research**. The Tor integration routes traffic through the Tor network for anonymity. Always comply with your local laws and regulations when using privacy tools. The developer assumes no liability for misuse.

---

## 📋 Changelog — v1.0

### 🆕 Features
| Feature | Description |
|---------|-------------|
| **Ghostery Ad Blocker** | Network-level ad & tracker blocking — stops tracking scripts before they load |
| **Tor Network Toggle** | One-click SOCKS5 proxy through the decentralized Tor network for true anonymity |
| **Veil AI (On-Device SLM)** | WebGPU-accelerated local LLM (`Xenova/Qwen1.5-0.5B-Chat`) for page summarization — zero cloud dependency |
| **Reader Mode** | Distraction-free article reading with clean typography |
| **Split View** | Side-by-side tab multitasking |
| **Find in Page** | Fast in-page text search with match highlighting and case sensitivity |
| **Translate** | One-click page translation via Google Translate (12 languages) |
| **Downloads Manager** | Built-in download tracking and file management |
| **Tab Pinning & Drag-and-Drop** | Pin important tabs and reorder via drag-and-drop |
| **Full Keyboard Shortcuts** | Complete set (Ctrl+T, Ctrl+W, Ctrl+F, Ctrl+Shift+T, etc.) |
| **Light & Dark Glassmorphism** | Premium glass UI with smooth theme transitions |
| **Privacy Hardening** | WebRTC leak protection, fingerprint resistance, referer stripping, HTTPS upgrades |
| **Futuristic Landing Page** | Apple-like distribution page with animations for web hosting |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ App Lifecycle │  │ IPC Handlers │  │   Session Manager     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                 │                      │              │
│         │                 │          ┌───────────┼───────────┐  │
│         │                 │          │  SECURITY LAYER       │  │
│         │                 │          │                       │  │
│         │                 │          │  ┌─────────────────┐  │  │
│         │                 │          │  │ Ghostery Engine  │  │  │
│         │                 │          │  │ (Ad/Tracker Block)│  │  │
│         │                 │          │  └─────────────────┘  │  │
│         │                 │          │  ┌─────────────────┐  │  │
│         │                 │          │  │ Tor SOCKS5 Proxy │  │  │
│         │                 │          │  └─────────────────┘  │  │
│         │                 │          │  ┌─────────────────┐  │  │
│         │                 │          │  │ Header Stripping │  │  │
│         │                 │          │  │ WebRTC Block     │  │  │
│         │                 │          │  │ Canvas Noise     │  │  │
│         │                 │          │  └─────────────────┘  │  │
│         │                 │          └───────────────────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │           IPC Bridge                   │
          │                 │                      │
┌─────────┼─────────────────┼──────────────────────┼──────────────┐
│         ▼                 ▼                      ▼              │
│                   NEXT.JS RENDERER (React 19)                   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Tab Manager  │  │   Sidebar    │  │  WebView Container    │  │
│  │  (Drag/Pin)   │  │  (Resizable) │  │  (Isolated Context)   │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AI ENGINE                              │   │
│  │  Transformers.js → WebGPU Backend → Local Summarization   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 🔒 Privacy Pipeline

```
User Request
     │
     ▼
┌──────────────┐     ┌──────────────────┐
│ Tor Enabled? │─YES─▶ SOCKS5 → Tor Net │─┐
└──────┬───────┘     └──────────────────┘ │
       │ NO                               │
       ▼                                  ▼
┌──────────────┐     ┌──────────────────────┐
│    Direct    │────▶│   Ghostery Filter    │
│  Connection  │     │  (Tracker Detected?) │
└──────────────┘     └──────────┬───────────┘
                          │          │
                         YES        NO
                          │          │
                     ┌────▼───┐ ┌────▼────────────┐
                     │🚫BLOCK │ │ Strip Referers   │
                     └────────┘ │ Canvas Noise     │
                                │ WebRTC Guard     │
                                │ ✅ Render Page   │
                                └─────────────────┘
```

---

## 🚀 Setup & Deployment Guide

### Prerequisites
- **Node.js** v18+ (v20+ recommended)
- **npm** v9+
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/BGx-11/Veil.git
cd Veil

# Install dependencies (also downloads Tor binaries via postinstall)
npm install

# Start the development server
npm run dev
```

### Building for Production

```powershell
# Create unpacked build (no code signing required)
npm run pack

# Create distributable installer (.exe / .dmg / .AppImage)
npm run dist
```

> [!NOTE]
> On Windows, `npm run dist` may fail if you don't have symlink privileges. Use `npm run pack` instead, or run your terminal as Administrator.

---

## 📁 Project Structure

```
Veil/
├── main/                  # Electron main process
│   ├── main.js            # App lifecycle, IPC, session management, search
│   └── preload.js         # Secure bridge between main & renderer
├── src/
│   ├── app/
│   │   ├── browser/       # Browser shell (Electron loads this route)
│   │   │   └── page.tsx   # Core browser component (1100+ lines)
│   │   ├── page.tsx       # Futuristic landing page for distribution
│   │   ├── globals.css    # Design system & theme tokens
│   │   ├── landing.css    # Landing page styles
│   │   ├── NewTab.tsx     # New tab page with search
│   │   ├── SearchResults  # DuckDuckGo search results renderer
│   │   ├── Settings.tsx   # Settings panel
│   │   ├── SLMPanel.tsx   # AI summary panel
│   │   ├── FindBar.tsx    # Find in page
│   │   ├── Downloads.tsx  # Downloads manager
│   │   ├── History.tsx    # History viewer
│   │   └── ReaderMode.tsx # Reader mode
│   └── lib/
│       └── slm.ts         # AI model pipeline (Transformers.js + WebGPU)
├── scripts/
│   └── download-tor.js    # Tor binary downloader (postinstall)
├── public/
│   ├── logo.png           # BGx brand logo
│   └── wasm/              # WebAssembly files for AI
└── package.json
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New Tab |
| `Ctrl+W` | Close Tab |
| `Ctrl+R` / `F5` | Reload |
| `Ctrl+F` | Find in Page |
| `Ctrl+L` / `F6` | Focus URL Bar |
| `Ctrl+D` | Toggle Bookmark |
| `Ctrl+H` | History |
| `Ctrl+Shift+T` | Reopen Closed Tab |
| `Ctrl+Shift+B` | Toggle Sidebar |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / Previous Tab |
| `Ctrl+1–9` | Switch to Tab by Index |
| `Alt+←` / `Alt+→` | Back / Forward |
| `F11` | Toggle Fullscreen |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/BGx-11/Veil/issues).

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Devansh Agarwal (BGx)**  
*Cyber Sec Student & Student Developer*  
[Portfolio](https://iambgx.in)

</div>
