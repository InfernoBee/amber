// ===== MAIN MODULE =====
const Main = (() => {
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    // Load save
    const hasSave = State.load();
    const st = State.get();

    // Apply settings
    Audio.init();
    Audio.setMusicVol(st.settings.musicVol);
    Audio.setSfxVol(st.settings.sfxVol);
    Audio.setMuted(st.settings.muted);
    UI.applyHighContrast(st.settings.highContrast);
    UI.syncSettings();

    // Determine first screen
    if (hasSave && st.hero.name) {
      showContinueButton();
      UI.showScreen('title');
    } else {
      UI.showScreen('title');
    }

    bindEvents();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function showContinueButton() {
    const btn = document.getElementById('btn-continue');
    if (btn) btn.style.display = 'block';
  }

  function bindEvents() {
    // Title screen
    on('btn-start', 'click', () => {
      Audio.resume(); Audio.playMenuClick();
      // Clear hero if new game
      const st = State.get();
      if (st.hero.name) {
        // Confirm new game
        if (confirm('Start a new hero? This will not delete existing save. Press Cancel to continue your save.')) {
          State.reset();
        } else {
          goToHub();
          return;
        }
      }
      UI.initCreationScreen();
      UI.showScreen('hero-create');
    });

    on('btn-continue', 'click', () => {
      Audio.resume(); Audio.playMenuClick();
      goToHub();
    });

    on('btn-settings-title', 'click', () => {
      Audio.resume(); Audio.playMenuClick();
      UI.showOverlay('overlay-settings');
    });
    on('btn-help-title', 'click', () => {
      Audio.resume(); Audio.playMenuClick();
      UI.showOverlay('overlay-help');
    });
    on('btn-hc-title', 'click', () => {
      const st = State.get();
      st.settings.highContrast = !st.settings.highContrast;
      State.save();
      UI.applyHighContrast(st.settings.highContrast);
      UI.syncSettings();
    });

    // Hero creation
    on('btn-create-hero', 'click', createHero);

    // Name input live update
    const nameInput = document.getElementById('hero-name-input');
    if (nameInput) nameInput.addEventListener('input', () => {
      // no-op live preview
    });

    // Class picker
    document.querySelectorAll('.class-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cls = btn.dataset.class;
        const st = State.get();
        if (!st.hero.unlockedClasses.includes(cls) && cls !== 'warrior') {
          UI.toast('🔒 Complete Chapter 5 to unlock Mage!');
          return;
        }
        document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pal = parseInt(document.querySelector('.palette-btn.active')?.dataset.palette || 0);
        UI.updatePreview(pal, cls);
      });
    });

    // Palette picker
    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pal = parseInt(btn.dataset.palette);
        const cls = document.querySelector('.class-btn.active')?.dataset.class || 'warrior';
        UI.updatePreview(pal, cls);
        Audio.playMenuClick();
      });
    });

    // Hub navigation
    document.querySelectorAll('.hub-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        Audio.playMenuClick();
        UI.renderHubTab(tab.dataset.tab);
      });
    });

    on('btn-settings-hub', 'click', () => {
      Audio.playMenuClick();
      UI.showOverlay('overlay-settings');
    });

    // Settings controls
    on('music-vol', 'input', e => {
      const v = parseFloat(e.target.value);
      Audio.setMusicVol(v);
      State.get().settings.musicVol = v;
      State.save();
    });
    on('sfx-vol', 'input', e => {
      const v = parseFloat(e.target.value);
      Audio.setSfxVol(v);
      State.get().settings.sfxVol = v;
      State.save();
    });
    on('mute-all', 'change', e => {
      Audio.setMuted(e.target.checked);
      State.get().settings.muted = e.target.checked;
      State.save();
    });
    on('haptics-toggle', 'change', e => {
      State.get().settings.haptics = e.target.checked;
      State.save();
    });
    on('hc-toggle', 'change', e => {
      const v = e.target.checked;
      State.get().settings.highContrast = v;
      State.save();
      UI.applyHighContrast(v);
    });
    on('assist-toggle', 'change', e => {
      State.get().settings.assistMode = e.target.checked;
      State.save();
      UI.toast(e.target.checked ? '🛡️ Assist Mode ON – wider windows!' : 'Assist Mode OFF');
    });
    on('btn-reset-save', 'click', () => {
      if (confirm('Are you sure? All progress will be lost!')) {
        State.reset();
        UI.hideOverlay('overlay-settings');
        UI.showScreen('title');
        document.getElementById('btn-continue').style.display = 'none';
        UI.toast('Save reset. Starting fresh!');
      }
    });

    // Modal closes
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        Audio.playMenuClick();
        UI.hideOverlay(btn.dataset.close);
      });
    });
    // Click outside modal
    document.querySelectorAll('.overlay').forEach(ov => {
      ov.addEventListener('click', e => {
        if (e.target === ov) UI.hideOverlay(ov.id);
      });
    });

    on('btn-levelup-ok', 'click', () => {
      Audio.playMenuClick();
      UI.hideOverlay('overlay-levelup');
    });

    // Result screen
    on('btn-result-continue', 'click', () => {
      Audio.playMenuClick();
      goToHub();
    });

    // Combat controls
    on('combat-timer-track', 'click', () => {
      Combat.onTap();
    });
    on('combat-timer-track', 'touchstart', e => {
      e.preventDefault();
      Combat.onTap();
    }, { passive: false });

    document.querySelectorAll('.skill-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        Combat.useSkill(parseInt(btn.dataset.skill));
      });
      btn.addEventListener('touchstart', e => {
        e.stopPropagation();
        e.preventDefault();
        Combat.useSkill(parseInt(btn.dataset.skill));
      }, { passive: false });
    });

    on('btn-combat-settings', 'click', () => {
      Audio.playMenuClick();
      // Allow settings anytime; pause combat while overlay is open
      Combat.pause?.();
      UI.showOverlay('overlay-settings');
    });

    on('btn-combat-quit', 'click', () => {
      if (confirm('Quit this run?')) {
        Combat.stop();
        Audio.startMusic();
        goToHub();
      }
    });

    // Overlay close buttons (works for settings/help/etc.)
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        Audio.playMenuClick();
        const id = btn.getAttribute('data-close');
        if (id) UI.hideOverlay(id);
        // Resume combat if we paused it for settings
        if (document.getElementById('screen-combat')?.classList.contains('active')) {
          Combat.resume?.();
        }
      });
    });

    // Share
    on('btn-back-share', 'click', () => {
      Audio.playMenuClick();
      goToHub();
    });

    // Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW reg failed', e));
    }
  }

  function createHero() {
    const nameInput = document.getElementById('hero-name-input');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) { UI.toast('Please enter a hero name!'); return; }

    const classBtn = document.querySelector('.class-btn.active');
    const cls = classBtn ? classBtn.dataset.class : 'warrior';
    const palBtn = document.querySelector('.palette-btn.active');
    const pal = palBtn ? parseInt(palBtn.dataset.palette) : 0;

    const st = State.get();
    st.hero.name = name;
    st.hero.class = cls;
    st.hero.palette = pal;
    st.hero.activeSkin = 'default';
    st.hero.activeAccessory = 'none';
    State.save();

    Audio.playMenuClick();
    Audio.playLevelUp();
    UI.spawnCelebrationParticles();
    UI.toast(`Welcome, ${name}! ⭐`);

    setTimeout(() => goToHub(), 600);
  }

  function goToHub() {
    Quests.refreshDailies();
    // Check mage unlock
    const st = State.get();
    const mageBtn = document.getElementById('mage-class-btn');
    if (mageBtn && st.hero.unlockedClasses.includes('mage')) {
      mageBtn.classList.remove('locked');
      mageBtn.querySelector('.lock-badge')?.remove();
    }
    UI.renderHub();
    UI.showScreen('hub');
    if (!Audio.getSettings().muted) {
      setTimeout(() => Audio.startMusic(), 300);
    }
  }

  function startCombat() {
    Audio.stopMusic();
    const st = State.get();
    const combatCanvas = document.getElementById('combat-canvas');
    Combat.init(combatCanvas, st.hero);
    UI.showScreen('combat');

    setTimeout(() => {
      Combat.startRun(onRunComplete);
    }, 200);
  }

  function onRunComplete(result) {
    UI.showResult(result);
  }

  function resizeCanvas() {
    const cv = document.getElementById('combat-canvas');
    if (cv) {
      cv.width = cv.offsetWidth;
      cv.height = cv.offsetHeight;
    }
  }

  function on(id, event, handler, opts) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler, opts);
  }

  return { init, startCombat, goToHub };
})();

// Boot
document.addEventListener('DOMContentLoaded', Main.init);
