// ===== AUDIO MODULE =====
const Audio = (() => {
  let ctx = null;
  let masterGain, musicGain, sfxGain;
  let musicOsc = null, musicNodes = [];
  let settings = { musicVol: 0.4, sfxVol: 0.7, muted: false };
  let musicPlaying = false;

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain(); masterGain.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.connect(masterGain);
      sfxGain = ctx.createGain(); sfxGain.connect(masterGain);
      applySettings();
    } catch(e) { console.warn('WebAudio not available', e); }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function applySettings() {
    if (!ctx) return;
    masterGain.gain.value = settings.muted ? 0 : 1;
    musicGain.gain.value = settings.musicVol;
    sfxGain.gain.value = settings.sfxVol;
  }

  function setMusicVol(v) { settings.musicVol = v; if (musicGain) musicGain.gain.value = v; }
  function setSfxVol(v) { settings.sfxVol = v; if (sfxGain) sfxGain.gain.value = v; }
  function setMuted(v) { settings.muted = v; if (masterGain) masterGain.gain.value = v ? 0 : 1; }

  // Procedural music: simple looping arpeggio
  const MUSIC_NOTES = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 261.63]; // C major arp
  let musicScheduler = null;

  function startMusic() {
    if (!ctx || musicPlaying) return;
    musicPlaying = true;
    let noteIdx = 0;
    let t = ctx.currentTime;

    function scheduleNote() {
      if (!musicPlaying) return;
      const freq = MUSIC_NOTES[noteIdx % MUSIC_NOTES.length];
      noteIdx++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain); gain.connect(musicGain);
      osc.start(t); osc.stop(t + 0.4);

      // Pad/drone
      if (noteIdx % 8 === 1) {
        const padOsc = ctx.createOscillator();
        const padGain = ctx.createGain();
        padOsc.type = 'triangle';
        padOsc.frequency.value = 130.81; // C2
        padGain.gain.setValueAtTime(0, t);
        padGain.gain.linearRampToValueAtTime(0.08, t + 0.3);
        padGain.gain.linearRampToValueAtTime(0, t + 2.5);
        padOsc.connect(padGain); padGain.connect(musicGain);
        padOsc.start(t); padOsc.stop(t + 2.6);
      }

      t += 0.42;
      musicScheduler = setTimeout(scheduleNote, 380);
    }
    scheduleNote();
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicScheduler) clearTimeout(musicScheduler);
  }

  // SFX generators
  function playHit(isCrit) {
    if (!ctx) return; resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCrit ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isCrit ? 420 : 260, t);
    osc.frequency.exponentialRampToValueAtTime(isCrit ? 180 : 120, t + 0.15);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.25);

    if (isCrit) {
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(800, t + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
      g2.gain.setValueAtTime(0.3, t + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc2.connect(g2); g2.connect(sfxGain);
      osc2.start(t + 0.05); osc2.stop(t + 0.35);
    }
  }

  function playHeal() {
    if (!ctx) return; resume();
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i*0.12);
      gain.gain.linearRampToValueAtTime(0.25, t + i*0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i*0.12 + 0.3);
      osc.connect(gain); gain.connect(sfxGain);
      osc.start(t + i*0.12); osc.stop(t + i*0.12 + 0.35);
    });
  }

  function playShield() {
    if (!ctx) return; resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.3);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.55);
  }

  function playSlash() {
    if (!ctx) return; resume();
    const t = ctx.currentTime;
    // Noise-like slash
    const bufSize = ctx.sampleRate * 0.25;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i/bufSize);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 2000; filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(filter); filter.connect(gain); gain.connect(sfxGain);
    src.start(t); src.stop(t + 0.3);
  }

  function playVictory() {
    if (!ctx) return; resume();
    const t = ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, t + i*0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i*0.15 + 0.4);
      osc.connect(gain); gain.connect(sfxGain);
      osc.start(t + i*0.15); osc.stop(t + i*0.15 + 0.5);
    });
  }

  function playDefeat() {
    if (!ctx) return; resume();
    const t = ctx.currentTime;
    const notes = [440, 349.23, 293.66, 220];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, t + i*0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i*0.2 + 0.4);
      osc.connect(gain); gain.connect(sfxGain);
      osc.start(t + i*0.2); osc.stop(t + i*0.2 + 0.5);
    });
  }

  function playLevelUp() {
    if (!ctx) return; resume();
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i < 4 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.35, t + i*0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i*0.1 + 0.5);
      osc.connect(gain); gain.connect(sfxGain);
      osc.start(t + i*0.1); osc.stop(t + i*0.1 + 0.6);
    });
  }

  function playMenuClick() {
    if (!ctx) return; resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.06);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.12);
  }

  function playLoot(rarity) {
    if (!ctx) return; resume();
    const t = ctx.currentTime;
    const freq = { common: 440, rare: 587, epic: 783, legendary: 1046 }[rarity] || 440;
    const count = { common: 1, rare: 2, epic: 3, legendary: 5 }[rarity] || 1;
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * (1 + i*0.05);
      gain.gain.setValueAtTime(0.3, t + i*0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i*0.08 + 0.35);
      osc.connect(gain); gain.connect(sfxGain);
      osc.start(t + i*0.08); osc.stop(t + i*0.08 + 0.4);
    }
  }

  return {
    init, resume, startMusic, stopMusic,
    setMusicVol, setSfxVol, setMuted, applySettings,
    playHit, playHeal, playShield, playSlash,
    playVictory, playDefeat, playLevelUp, playMenuClick, playLoot,
    getSettings: () => settings
  };
})();
