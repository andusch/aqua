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
| 🪶 **Lightweight** | &lt; 5 MB installer, &lt; 50 MB RAM |
| 🔒 **Safe** | All file ops are sandboxed by Tauri |
| 🎨 **Pretty** | GitHub-dark code blocks |
| 🗂️ **Portable** | Single `.md` files, no databases |

---

<!-- ## 🎬 Screenshot

*(Drag-and-drop your own shot here once you ship)* -->

![Aqua Screenshort LightMode](/assets/aqua%20light.png)

![Aqua Screenshort DarkMode](/assets/aqua%20dark.png)

<!-- --- -->

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
