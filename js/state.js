// ===== STATE MODULE =====
const State = (() => {
  const SAVE_VERSION = 3;
  const SAVE_KEY = 'ambers_pocket_hero_save';

  const DEFAULTS = () => ({
    version: SAVE_VERSION,
    hero: {
      name: '',
      class: 'warrior',
      palette: 0,
      accessory: 'none',
      level: 1,
      xp: 0,
      xpNext: 100,
      stats: { hp: 80, maxHp: 80, atk: 12, def: 4, spd: 10 },
      gear: { weapon: null, armor: null, ring: null },
      inventory: [],
      unlockedClasses: ['warrior'],
      unlockedSkins: ['default'],
      activeSkin: 'default',
      activeAccessory: 'none',
      unlockedAccessories: ['none'],
    },
    progression: {
      currentChapter: 0,
      completedChapters: [],
      bestScore: 0,
      totalRuns: 0,
      totalKills: 0,
      runsSinceLegendary: 0,
      pityCounter: 0,
    },
    daily: {
      date: '',
      quests: [],
      completed: [],
    },
    settings: {
      musicVol: 0.4,
      sfxVol: 0.7,
      muted: false,
      haptics: true,
      highContrast: false,
      assistMode: false,
    },
    created: Date.now(),
  });

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { state = DEFAULTS(); return false; }
      const parsed = JSON.parse(raw);
      state = migrate(parsed);
      return true;
    } catch(e) {
      console.warn('Save corrupted, resetting', e);
      state = DEFAULTS();
      return false;
    }
  }

  function migrate(data) {
    if (!data || typeof data !== 'object') return DEFAULTS();
    const d = DEFAULTS();
    // Deep merge with defaults
    function merge(target, src) {
      const out = { ...target };
      for (const k in src) {
        if (src[k] !== null && typeof src[k] === 'object' && !Array.isArray(src[k]) && typeof target[k] === 'object') {
          out[k] = merge(target[k] || {}, src[k]);
        } else if (src[k] !== undefined) {
          out[k] = src[k];
        }
      }
      return out;
    }
    const merged = merge(d, data);
    merged.version = SAVE_VERSION;
    return merged;
  }

  function save() {
    if (!state) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch(e) {
      console.warn('Failed to save', e);
    }
  }

  function reset() {
    localStorage.removeItem(SAVE_KEY);
    state = DEFAULTS();
  }

  function get() { return state; }

  // XP / Level helpers
  function xpForLevel(lvl) { return Math.floor(100 * Math.pow(1.4, lvl - 1)); }

  function addXP(amount) {
    const h = state.hero;
    h.xp += amount;
    const leveled = [];
    while (h.xp >= h.xpNext) {
      h.xp -= h.xpNext;
      h.level++;
      h.xpNext = xpForLevel(h.level);
      // Stat growth
      const isWarrior = h.class === 'warrior';
      const gains = {
        maxHp: isWarrior ? 10 : 6,
        atk: isWarrior ? 2 : 4,
        def: isWarrior ? 2 : 1,
        spd: isWarrior ? 1 : 2,
      };
      h.stats.maxHp += gains.maxHp;
      h.stats.hp = h.stats.maxHp;
      h.stats.atk += gains.atk;
      h.stats.def += gains.def;
      h.stats.spd += gains.spd;
      leveled.push({ level: h.level, gains });
    }
    save();
    return leveled;
  }

  function getEffectiveStats() {
    const h = state.hero;
    const s = { ...h.stats };
    const slots = ['weapon','armor','ring'];
    for (const slot of slots) {
      const item = h.gear[slot];
      if (!item) continue;
      if (item.stats.atk) s.atk += item.stats.atk;
      if (item.stats.def) s.def += item.stats.def;
      if (item.stats.maxHp) { s.maxHp += item.stats.maxHp; s.hp += item.stats.maxHp; }
      if (item.stats.spd) s.spd += item.stats.spd;
    }
    return s;
  }

  function equipGear(item) {
    const h = state.hero;
    const slot = item.slot;
    const old = h.gear[slot];
    h.gear[slot] = item;
    // Remove from inventory
    const idx = h.inventory.indexOf(item);
    if (idx !== -1) h.inventory.splice(idx, 1);
    // Return old item to inventory
    if (old) h.inventory.push(old);
    save();
  }

  function addToInventory(item) {
    state.hero.inventory.push(item);
    if (state.hero.inventory.length > 80) state.hero.inventory.shift(); // cap
    save();
  }

  function updateBestScore(score) {
    if (score > state.progression.bestScore) {
      state.progression.bestScore = score;
      save();
    }
  }

  function completeChapter(idx) {
    if (!state.progression.completedChapters.includes(idx)) {
      state.progression.completedChapters.push(idx);
    }
    if (state.progression.currentChapter <= idx) {
      state.progression.currentChapter = idx + 1;
    }
    save();
  }

  function unlockClass(cls) {
    if (!state.hero.unlockedClasses.includes(cls)) {
      state.hero.unlockedClasses.push(cls);
      save();
    }
  }

  function unlockSkin(skin) {
    if (!state.hero.unlockedSkins.includes(skin)) {
      state.hero.unlockedSkins.push(skin);
      save();
    }
  }

  function unlockAccessory(acc) {
    if (!state.hero.unlockedAccessories.includes(acc)) {
      state.hero.unlockedAccessories.push(acc);
      save();
    }
  }

  return {
    load, save, reset, get,
    addXP, getEffectiveStats, equipGear, addToInventory,
    updateBestScore, completeChapter, unlockClass, unlockSkin, unlockAccessory,
    xpForLevel,
  };
})();
