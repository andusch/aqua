# Aqua  
*A lightweight, minimalistic markdown editor built with Tauri + SolidJS*

---

## 🧊 What is Aqua?

Aqua is a native desktop markdown editor that pairs the speed of SolidJS with the safety of Rust.  
It gives you a split-pane writing experience: markdown on the left, live preview on the right, zero distractions.

---

## ✨ Highlights

| Feature | Description |
|---------|-------------|
| ⚡ **Fast** | SolidJS reactivity + Rust performance |
| 🎯 **Minimal** | No toolbars, no clutter—just your text |
| 🖥️ **Native** | macOS, Windows & Linux builds via Tauri |
| 🪶 **Lightweight** | &lt; 5 MB installer, &lt; 90 MB RAM |
| 🔒 **Safe** | All file ops are sandboxed by Tauri |
| 🎨 **Pretty** | GitHub-dark code blocks |
| 🗂️ **Portable** | Single `.md` files, no databases |

---

<!-- ## 🎬 Screenshot

*(Drag-and-drop your own shot here once you ship)* -->

![Aqua Screenshort LightMode](/assets/aqua%20light.png)

![Aqua Screenshort DarkMode](/assets/aqua%20dark.png)

<!-- --- -->


## 📥 Download & Install

Pre-built installers are published on **[GitHub Releases](https://github.com/andusch/aqua/releases/latest)**.  
You do **not** need Rust, Node.js, or pnpm — pick the file for your operating system, install, and run Aqua.

| Platform | Download | Type |
|----------|----------|------|
| **Windows** | `Aqua_*_x64-setup.exe` | NSIS installer |
| **macOS** | `Aqua_*_aarch64.dmg` or `Aqua_*_x64.dmg` | Disk image (contains `Aqua.app`) |
| **Linux (Debian/Ubuntu)** | `aqua_*_amd64.deb` | Debian package |
| **Linux (other distros)** | `aqua_*_amd64.AppImage` | Portable executable |

> **Tip:** On the [latest release](https://github.com/andusch/aqua/releases/latest) page, expand **Assets** to see all files. Names include the version (e.g. `v1.0.5`).

### Windows

1. Download **`Aqua_*_x64-setup.exe`** from [Releases](https://github.com/andusch/aqua/releases/latest).
2. Double-click the installer and follow the setup wizard.
3. Launch **Aqua** from the Start menu (folder **Aqua**) or the desktop shortcut.
4. Optional: right-click any `.md` file → **Open with** → **Aqua**.

If Windows SmartScreen shows a warning, choose **More info** → **Run anyway**. This can appear when the installer is not yet signed with a commercial certificate.

### macOS

1. Download the **`.dmg`** that matches your Mac:
   - **Apple Silicon (M1/M2/M3/M4):** `Aqua_*_aarch64.dmg`
   - **Intel:** `Aqua_*_x64.dmg` (if available on the release)
2. Open the `.dmg` file.
3. Drag **Aqua.app** into **Applications**.
4. First launch: if macOS blocks the app, open **System Settings → Privacy & Security** and click **Open Anyway**, or right-click the app → **Open**.

### Linux

#### Debian / Ubuntu / derivatives (`.deb`)

```bash
# Replace the filename with the .deb from the release Assets
sudo dpkg -i aqua_*_amd64.deb
sudo apt-get install -f   # fix missing dependencies, if any
aqua
```

#### Other distributions (AppImage)

```bash
chmod +x aqua_*_amd64.AppImage
./aqua_*_amd64.AppImage
```

You can move the AppImage anywhere (e.g. `~/Applications`) and optionally add it to your application menu.

---

## 🛠️ Build from Source

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| pnpm | ≥ 8 |
| Rust | ≥ 1.70 |
| Tauri CLI | ≥ 2 |

### 1. Clone
```bash
git clone https://github.com/andusch/aqua.git
cd aqua

### 2. Install dependencies
```bash
pnpm install
```

### 3. Dev
```bash
pnpm tauri dev
```

### 4. Bundle
```bash
pnpm tauri build
```

---

## 🧩 Tech Stack

| Layer | Tech |
|------|---------|
| Frontend | SolidJS + TypeScript |
| Editor | CodeMirror 6 |
| Preview | Marked + Highlight.js |
| Shell | Tauri (Rust) |
| Bundler | Vite |
| Package Manager | pnpm |

---

## 🤝 Contributing

1. Fork
2. Branch (feat/xyz)
3. Commit (conventional: feat: add xyz)
4. Push & open PR

---

## 📄 License

MIT @ Ioan-Alexandru Scheusan

---

## 🙏 Acknowledgements

- Tauri team for the rock-solid runtime
- SolidJS for blister-fast reactivity
- CodeMirror for the editor engine
- You, for reading this far 💙
