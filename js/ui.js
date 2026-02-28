// ===== UI MODULE =====
const UI = (() => {
  let currentScreen = 'title';
  let currentHubTab = 'adventure';

  // ─── SCREEN NAVIGATION ───
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.add('active');
    currentScreen = id;
  }

  function showOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  // ─── HERO AVATAR DRAWING ───
  const PALETTES = [
    ['#a78bfa','#7c3aed','#f3e8ff'],
    ['#f472b6','#db2777','#fce7f3'],
    ['#34d399','#059669','#ecfdf5'],
    ['#60a5fa','#2563eb','#eff6ff'],
    ['#fbbf24','#d97706','#fffbeb'],
  ];

  function drawAvatar(canvas, palette, cls, size, accessory) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W/2, cy = H/2;
    const pal = PALETTES[palette] || PALETTES[0];
    const s = size || Math.min(W,H) * 0.35;

    // Body
    ctx.fillStyle = pal[0];
    ctx.beginPath();
    ctx.ellipse(cx, cy + s*0.2, s*0.5, s*0.6, 0, 0, Math.PI*2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(cx, cy - s*0.35, s*0.36, 0, Math.PI*2);
    ctx.fill();

    // Hair
    ctx.fillStyle = pal[1];
    ctx.beginPath();
    ctx.arc(cx, cy - s*0.42, s*0.26, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - s*0.24, cy - s*0.36, s*0.12, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + s*0.24, cy - s*0.36, s*0.1, 0, Math.PI*2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(cx - s*0.12, cy - s*0.36, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s*0.12, cy - s*0.36, 3.5, 0, Math.PI*2); ctx.fill();

    // Cheeks
    ctx.fillStyle = 'rgba(244,114,182,0.3)';
    ctx.beginPath(); ctx.ellipse(cx - s*0.22, cy - s*0.26, 6, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + s*0.22, cy - s*0.26, 6, 4, 0, 0, Math.PI*2); ctx.fill();

    if (cls === 'mage') {
      // Robe
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.arc(cx, cy + s*0.1, s*0.22, 0, Math.PI*2);
      ctx.fill();
    }

    // Accessory
    drawAccessory(ctx, cx, cy, s, accessory);
  }

  function drawAccessory(ctx, cx, cy, s, acc) {
    if (!acc || acc === 'none') return;
    switch(acc) {
      case 'flower':
        ctx.font = `${s*0.4}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🌸', cx + s*0.4, cy - s*0.7);
        break;
      case 'star_clip':
        ctx.font = `${s*0.38}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⭐', cx - s*0.36, cy - s*0.72);
        break;
      case 'crown':
        ctx.font = `${s*0.42}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('👑', cx, cy - s*0.82);
        break;
      case 'halo':
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy - s*0.78, s*0.28, s*0.1, 0, 0, Math.PI*2);
        ctx.stroke();
        break;
    }
  }

  // ─── HUB RENDERING ───
  function renderHub() {
    const st = State.get();
    const h = st.hero;
    // Topbar
    setText('hub-hero-name', h.name || 'Hero');
    setText('hub-hero-class', h.class.charAt(0).toUpperCase() + h.class.slice(1));
    setText('hub-level', h.level);
    setText('hub-score', st.progression.bestScore || 0);

    // XP bar
    const pct = (h.xp / h.xpNext * 100).toFixed(1);
    const bar = document.getElementById('hub-xp-bar');
    if (bar) bar.style.width = pct + '%';
    setText('hub-xp-label', `${h.xp}/${h.xpNext} XP`);

    // Avatar
    const av = document.getElementById('hub-hero-avatar');
    if (av) drawAvatar(av, h.palette, h.class, 14, h.activeAccessory);

    renderHubTab(currentHubTab);
  }

  function renderHubTab(tab) {
    currentHubTab = tab;
    document.querySelectorAll('.hub-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    const content = document.getElementById('hub-content');
    if (!content) return;
    switch(tab) {
      case 'adventure': content.innerHTML = renderAdventureTab(); break;
      case 'gear': content.innerHTML = renderGearTab(); break;
      case 'quests': content.innerHTML = renderQuestsTab(); break;
      case 'wardrobe': content.innerHTML = renderWardrobeTab(); break;
    }
    if (tab === 'wardrobe') renderWardrobePreviews();
    bindHubTabEvents(tab);
  }

  function renderAdventureTab() {
    const st = State.get();
    const prog = st.progression;
    const chapters = Quests.getStoryChapters();
    const dailies = Quests.getDailies();

    let html = `<div class="quick-battle-wrap">
      <button class="btn btn-primary btn-glow" id="btn-quick-battle">⚔️ Start Run</button>
      <div class="run-info">Runs: ${prog.totalRuns || 0} · Best Score: ${prog.bestScore || 0}</div>
    </div>

    <div class="section-title">📅 Daily Quests</div>`;

    for (const q of dailies) {
      const done = st.daily.completed.includes(q.id);
      html += `<div class="daily-quest-card">
        <div class="dq-check">${done ? '✅' : '⬜'}</div>
        <div class="dq-info">
          <div class="dq-name">${q.name}</div>
          <div class="dq-prog">${q.desc} (${Math.min(q.progress||0, q.target)}/${q.target})</div>
        </div>
        <div class="dq-reward">+${q.reward.xp} XP</div>
      </div>`;
    }

    html += `<div class="section-title" style="margin-top:12px">📖 Story Chapters</div>`;

    for (const ch of chapters) {
      const done = Quests.isChapterComplete(ch);
      const avail = Quests.isChapterAvailable(ch);
      const prog2 = Quests.getChapterProgress(ch);
      const classes = `chapter-card ${done ? 'completed-chapter' : avail ? 'active-chapter' : 'locked-chapter'}`;
      const pct = Math.min(100, (prog2.current / prog2.target * 100)).toFixed(0);
      html += `<div class="${classes}" data-chapter="${ch.id}">
        <div class="chapter-num">${ch.id + 1}</div>
        <div class="chapter-info">
          <div class="chapter-name">${ch.name}</div>
          <div class="chapter-obj">${ch.objective} (${prog2.current}/${prog2.target})</div>
          ${avail && !done ? `<div style="margin-top:6px;height:4px;background:var(--bg3);border-radius:2px"><div style="width:${pct}%;height:100%;background:var(--accent);border-radius:2px;transition:width 0.5s"></div></div>` : ''}
        </div>
        <div class="chapter-status">${done ? '✅' : avail ? '▶️' : '🔒'}</div>
      </div>`;
    }

    html += `<div style="height:80px"></div>`;
    return html;
  }

  function renderGearTab() {
    const st = State.get();
    const h = st.hero;
    const slots = { weapon: '⚔️', armor: '🛡️', ring: '💍' };

    let html = `<div class="gear-grid">`;
    for (const [slot, icon] of Object.entries(slots)) {
      const item = h.gear[slot];
      html += `<div class="gear-slot ${item ? 'equipped' : ''}" data-slot="${slot}">
        <div class="gear-slot-icon">${item ? item.icon : icon}</div>
        <div class="gear-slot-label">${slot.charAt(0).toUpperCase()+slot.slice(1)}</div>
        ${item ? `<div class="gear-slot-name ${rarityClass(item.rarity)}">${item.name}</div>` : '<div class="gear-slot-label">Empty</div>'}
      </div>`;
    }
    html += `</div>`;

    // Stats panel
    const eff = State.getEffectiveStats();
    html += `<div class="card-stats" style="background:var(--card);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px">
      <div style="font-weight:700;color:var(--text2);margin-bottom:8px">📊 Stats</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.85rem;color:var(--text2)">
        <span>❤️ HP: ${eff.maxHp}</span>
        <span>⚔️ ATK: ${eff.atk}</span>
        <span>🛡️ DEF: ${eff.def}</span>
        <span>💨 SPD: ${eff.spd}</span>
      </div>
    </div>`;

    html += `<div class="inventory-title">📦 Inventory (${h.inventory.length})</div>`;
    if (h.inventory.length === 0) {
      html += `<div class="empty-state">No items yet. Complete runs to find gear!</div>`;
    } else {
      html += `<div class="inventory-list">`;
      for (const item of [...h.inventory].reverse()) {
        html += `<div class="inv-item ${item.rarity}" data-item-id="${item.id}">
          <div class="inv-item-icon">${item.icon}</div>
          <div class="inv-item-info">
            <div class="inv-item-name">${item.name}</div>
            <div class="inv-item-stats">${Loot.formatStats(item.stats)}</div>
          </div>
          <div>
            <div class="inv-item-rarity rarity-${item.rarity}">${item.rarity}</div>
            <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.75rem;width:auto;margin-top:4px" data-equip="${item.id}">Equip</button>
          </div>
        </div>`;
      }
      html += `</div>`;
    }
    html += `<div style="height:60px"></div>`;
    return html;
  }

  function renderQuestsTab() {
    return renderAdventureTab(); // reuse adventure tab which shows quests
  }

  const SKINS = [
    { id: 'default', name: 'Original', palette: 0 },
    { id: 'fire', name: 'Flame', palette: 4 },
    { id: 'shadow', name: 'Shadow', palette: 1 },
    { id: 'galaxy', name: 'Galaxy', palette: 3 },
  ];
  const ACCESSORIES = [
    { id: 'none', name: 'None', icon: '—' },
    { id: 'flower', name: 'Blossom', icon: '🌸' },
    { id: 'star_clip', name: 'Star Clip', icon: '⭐' },
    { id: 'crown', name: 'Crown', icon: '👑' },
    { id: 'halo', name: 'Halo', icon: '😇' },
  ];

  function renderWardrobeTab() {
    const st = State.get();
    const h = st.hero;

    let html = `<div class="wardrobe-section">
      <h3>🎨 Skins</h3>
      <div class="skin-grid">`;

    for (const skin of SKINS) {
      const unlocked = h.unlockedSkins.includes(skin.id);
      const active = h.activeSkin === skin.id;
      html += `<div class="skin-card ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-skin="${skin.id}">
        <canvas width="48" height="48" data-skin-canvas="${skin.id}" data-skin-pal="${skin.palette}"></canvas>
        <div class="skin-card-name">${skin.name}${unlocked ? '' : ' 🔒'}</div>
      </div>`;
    }

    html += `</div></div>
    <div class="wardrobe-section">
      <h3>💎 Accessories</h3>
      <div class="skin-grid">`;

    for (const acc of ACCESSORIES) {
      const unlocked = h.unlockedAccessories.includes(acc.id);
      const active = h.activeAccessory === acc.id;
      html += `<div class="skin-card ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" style="font-size:1.6rem;justify-content:center;padding-top:14px" data-accessory="${acc.id}">
        <div>${acc.icon}</div>
        <div class="skin-card-name">${acc.name}${unlocked ? '' : ' 🔒'}</div>
      </div>`;
    }

    html += `</div></div>
    <div class="screen-body center" style="padding:16px 0;gap:12px">
      <button class="btn btn-secondary" id="btn-share-card" style="width:auto;padding:12px 24px">📸 Share Card</button>
    </div>
    <div style="height:60px"></div>`;

    return html;
  }

  function renderWardrobePreviews() {
    const st = State.get();
    document.querySelectorAll('[data-skin-canvas]').forEach(cv => {
      const pal = parseInt(cv.dataset.skinPal);
      drawAvatar(cv, pal, st.hero.class, 16, null);
    });
  }

  function bindHubTabEvents(tab) {
    // Quick battle
    const qb = document.getElementById('btn-quick-battle');
    if (qb) qb.addEventListener('click', () => {
      Audio.playMenuClick();
      Main.startCombat();
    });

    // Share card
    const sc = document.getElementById('btn-share-card');
    if (sc) sc.addEventListener('click', () => { Audio.playMenuClick(); Share.showShareScreen(); });

    if (tab === 'gear') {
      // Equip buttons
      document.querySelectorAll('[data-equip]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const id = btn.dataset.equip;
          const item = State.get().hero.inventory.find(i => i.id === id);
          if (item) {
            State.equipGear(item);
            Audio.playMenuClick();
            renderHubTab('gear');
            toast(`Equipped ${item.name}!`);
          }
        });
      });
    }

    if (tab === 'wardrobe') {
      document.querySelectorAll('[data-skin]').forEach(el => {
        el.addEventListener('click', () => {
          const skinId = el.dataset.skin;
          const st = State.get();
          if (!st.hero.unlockedSkins.includes(skinId)) { toast('🔒 Complete quests to unlock!'); return; }
          const skin = SKINS.find(s => s.id === skinId);
          if (skin) {
            st.hero.activeSkin = skinId;
            st.hero.palette = skin.palette;
          }
          State.save();
          renderHubTab('wardrobe');
          renderHub();
          Audio.playMenuClick();
        });
      });
      document.querySelectorAll('[data-accessory]').forEach(el => {
        el.addEventListener('click', () => {
          const accId = el.dataset.accessory;
          const st = State.get();
          if (!st.hero.unlockedAccessories.includes(accId)) { toast('🔒 Complete quests to unlock!'); return; }
          st.hero.activeAccessory = accId;
          State.save();
          renderHubTab('wardrobe');
          renderHub();
          Audio.playMenuClick();
        });
      });
    }
  }

  // ─── RESULT SCREEN ───
  function showResult(result) {
    const st = State.get();
    const title = document.getElementById('result-title');
    if (title) title.textContent = result.won ? 'Victory! ⭐' : 'Defeated... 💔';
    if (title) title.style.color = result.won ? 'var(--accent3)' : 'var(--danger)';

    const stats = document.getElementById('result-stats');
    if (stats) stats.innerHTML = `
      <div class="result-stat-row"><span>Score</span><span style="color:var(--accent3);font-weight:900">${result.score}</span></div>
      <div class="result-stat-row"><span>Enemies Defeated</span><span>${result.kills}</span></div>
      <div class="result-stat-row"><span>Critical Hits</span><span>${result.crits}</span></div>
      <div class="result-stat-row"><span>XP Gained</span><span style="color:var(--accent)">+${result.xpGained} XP</span></div>
    `;

    const lootPanel = document.getElementById('loot-panel');
    if (lootPanel && result.loot && result.loot.length) {
      let html = `<div class="loot-title">🎁 Loot</div>`;
      result.loot.forEach((item, i) => {
        html += `<div class="loot-item ${item.rarity}" style="animation-delay:${i*0.15}s">
          <div style="font-size:1.3rem">${item.icon}</div>
          <div>
            <div style="font-weight:700;font-size:0.9rem">${item.name}</div>
            <div style="font-size:0.75rem;color:var(--text3)">${Loot.formatStats(item.stats)}</div>
          </div>
          <div class="inv-item-rarity rarity-${item.rarity}" style="margin-left:auto">${item.rarity}</div>
        </div>`;
        if (item.rarity === 'legendary' || item.rarity === 'epic') {
          Audio.playLoot(item.rarity);
        }
      });
      lootPanel.innerHTML = html;
    } else if (lootPanel) {
      lootPanel.innerHTML = '';
    }

    showScreen('run-result');

    // Level ups
    if (result.leveled && result.leveled.length > 0) {
      setTimeout(() => showLevelUp(result.leveled[0]), 800);
    }

    // Chapter claims
    if (result.claimedChapters && result.claimedChapters.length > 0) {
      setTimeout(() => {
        for (const cc of result.claimedChapters) {
          toast(`📖 Chapter Complete: ${cc.chapter.name}!`);
          if (cc.chapter.unlock === 'mage') toast('🔮 Mage class unlocked!');
        }
      }, 1200);
    }
  }

  function showLevelUp(levelData) {
    setText('levelup-num', levelData.level);
    const g = levelData.gains;
    setText('levelup-stats', `+${g.maxHp} HP · +${g.atk} ATK · +${g.def} DEF`);
    showOverlay('overlay-levelup');
    Audio.playLevelUp();
    spawnCelebrationParticles();
  }

  // ─── CREATION SCREEN ───
  function initCreationScreen() {
    const pc = document.getElementById('hero-preview-canvas');
    if (pc) {
      drawAvatar(pc, 0, 'warrior', 28, null);
    }
  }

  function updatePreview(palette, cls) {
    const pc = document.getElementById('hero-preview-canvas');
    if (pc) drawAvatar(pc, palette, cls, 28, null);
  }

  // ─── PARTICLES ───
  function spawnCelebrationParticles() {
    const container = document.getElementById('particle-container');
    if (!container) return;
    const colors = ['#fbbf24','#f472b6','#a78bfa','#34d399','#60a5fa'];
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const x = 20 + Math.random() * 60;
      const tx = (Math.random() - 0.5) * 200;
      const ty = -(80 + Math.random() * 120);
      const dur = 0.8 + Math.random() * 0.6;
      p.style.cssText = `
        left:${x}vw; top:60vh;
        width:${6+Math.random()*8}px; height:${6+Math.random()*8}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        --tx:${tx}px; --ty:${ty}px; --dur:${dur}s;
        animation-delay:${Math.random()*0.3}s;
      `;
      container.appendChild(p);
      setTimeout(() => p.remove(), (dur + 0.3) * 1000);
    }
  }

  // ─── SETTINGS ───
  function syncSettings() {
    const st = State.get();
    const s = st.settings;
    const mv = document.getElementById('music-vol');
    const sv = document.getElementById('sfx-vol');
    const ma = document.getElementById('mute-all');
    const ha = document.getElementById('haptics-toggle');
    const hc = document.getElementById('hc-toggle');
    if (mv) mv.value = s.musicVol;
    if (sv) sv.value = s.sfxVol;
    if (ma) ma.checked = s.muted;
    if (ha) ha.checked = s.haptics;
    if (hc) hc.checked = s.highContrast;
    applyHighContrast(s.highContrast);
  }

  function applyHighContrast(on) {
    document.body.classList.toggle('high-contrast', !!on);
  }

  // ─── TOAST ───
  function toast(msg, duration) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration || 3000);
  }

  // ─── HELPERS ───
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function rarityClass(r) {
    return `rarity-${r}`;
  }

  return {
    showScreen, showOverlay, hideOverlay,
    renderHub, renderHubTab, drawAvatar,
    showResult, showLevelUp, initCreationScreen, updatePreview,
    syncSettings, applyHighContrast, toast, spawnCelebrationParticles,
  };
})();
