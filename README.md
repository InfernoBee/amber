# Amber's Pocket Hero 🌟

A mobile-first HTML5 RPG built with pure vanilla JS/CSS/HTML — made with love for someone special.

## Features

- 🎮 **Timed Combat** — hit the sweet spot on the timing bar for critical hits
- ⚔️ **3 Skills** — Slash Arc, Shield Guard, and Heal, each with cooldowns and VFX
- 🗡️ **2 Classes** — Warrior (starter) and Mage (unlock via quest)
- 🎒 **Gear System** — Weapon, Armor, Ring with Common/Rare/Epic/Legendary rarities
- 🧠 **Pity System** — Legendary drop rate increases if you haven't gotten one in a while
- 📖 **10 Story Chapters** — progressive objectives with unlockable rewards
- 📅 **Daily Quests** — 3 rotating quests that reset each day
- 👗 **Wardrobe** — palette skins and accessories unlocked through play
- 📸 **Share Card** — beautiful PNG hero card with "Made by Bryan ❤️"
- 💾 **Auto Save** — versioned localStorage with safe migration
- 🔊 **Procedural Audio** — WebAudio-based SFX and background music
- 📱 **PWA** — installable, works offline
- ♿ **Accessibility** — high contrast mode, readable font sizes

## Project Structure

```
ambers-pocket-hero/
├── index.html          # App shell + all screens
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── css/
│   └── main.css        # All styles (CSS variables, responsive)
├── js/
│   ├── audio.js        # WebAudio mixing + procedural SFX/music
│   ├── state.js        # Save/load, XP, gear, progression
│   ├── loot.js         # Deterministic RNG loot + pity system
│   ├── quests.js       # Story chapters + daily quests
│   ├── combat.js       # Canvas game loop, timing, skills, particles
│   ├── ui.js           # All screen rendering, hub, result, settings
│   ├── share.js        # Share card canvas renderer
│   └── main.js         # App entry point, event wiring
└── assets/
    ├── icon-192.png
    └── icon-512.png
```

## Running Locally

Just open `index.html` in a browser. No build step required.

For PWA/Service Worker to work (offline), you need a local server:

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# VS Code: use "Live Server" extension
```

Then visit `http://localhost:8080`

## Deploying to GitHub Pages

1. Create a new GitHub repository
2. Push all files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial release 💖"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ambers-pocket-hero.git
   git push -u origin main
   ```
3. Go to **Settings → Pages → Source**: select `main` branch, root `/`
4. Click **Save** — your game will be live at:
   `https://YOUR_USERNAME.github.io/ambers-pocket-hero/`

## Customization

- **Change game name**: Search & replace `Amber's Pocket Hero` in `index.html` and `manifest.json`
- **Change "Made by Bryan"**: Find this text in `js/share.js` → `renderShareCard()`
- **Add enemies**: Edit the `ENEMIES` array in `js/combat.js`
- **Add chapters**: Edit `STORY_CHAPTERS` in `js/quests.js`
- **Change music**: Edit `MUSIC_NOTES` in `js/audio.js`

## Tech Stack

- Vanilla HTML5 / CSS3 / JavaScript (ES6+)
- Canvas API (combat rendering + share card)
- Web Audio API (procedural music + SFX)
- localStorage (save system)
- Service Worker (offline PWA)
- navigator.vibrate (haptics)
- navigator.share (native share)

---

Made with ❤️ by Bryan
