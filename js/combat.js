// ===== COMBAT MODULE (v2 - Skill-Based) =====
const Combat = (() => {
  let canvas, ctx;
  let running = false;
  let paused = false;
  let raf = null;
  let onComplete = null;

  // Timing bar
  let markerPos = 0;
  let markerDir = 1;
  // Full cycle (0→1→0 = 2 units) in ~0.95s → base speed ≈ 2/0.95 ≈ 2.1 (dt-based, framerate-independent)
  let markerSpeed = 2.1;
  let sweetSpotLeft = 0.35;
  // Sweet spot ≈ 10% of bar; perfect sub-window ≈ 6% centred inside it
  let sweetSpotWidth = 0.10;
  let perfectSpotOffset = 0.02; // left offset into sweet spot where perfect zone starts
  let perfectSpotWidth = 0.06;
  let tapCooldown = 0;

  // Combat state
  let heroHp, heroMaxHp, enemyHp, enemyMaxHp;
  let heroAtk, heroDef, heroSpd;
  let currentEncounter = 0;
  let totalEncounters = 8;
  let score = 0;
  let kills = 0;
  let crits = 0;
  let skillsUsed = 0;
  let heals = 0;
  let xpGained = 0;
  let lootDropped = [];
  let lastTime = 0;
  let phase = 'intro';
  let phaseTimer = 0;

  // NEW: Skill-based systems
  let energy = 0;
  const MAX_ENERGY = 100;
  let focusStacks = 0;
  const MAX_FOCUS = 5;
  let comboCount = 0;
  let comboTimer = 0;
  const COMBO_DECAY = 4.0;
  let overheat = 0;
  const MAX_OVERHEAT = 100;
  let overheatCooldown = 0;
  let heroStatusEffects = [];
  let enemyStatusEffects = [];

  // Parry / guard
  let parryWindow = 0;
  let parryActive = false;

  // Enemy telegraph
  let enemyWindup = 0;
  let enemyWindupMax = 0;
  let enemyAttackPattern = 'jab';
  let enemyAttackInterval = 3.0;
  let enrageActive = false;

  // VFX timers
  let critPoseTimer = 0;
  let hitStopTimer = 0;

  // Skill cooldowns
  const SKILL_COOLDOWNS = [6, 3, 15];
  const SKILL_ENERGY_COSTS = [20, 0, 30];
  let skillCds = [0, 0, 0];

  let currentEnemy = null;
  let heroClass = 'warrior';
  let heroPalette = 0;
  let assistMode = false;

  let particles = [];
  let floatingTexts = [];
  let slashArcs = [];
  const MAX_PARTICLES = 80;

  const ENEMIES = [
    { name:'Goblin',    icon:'👺', hpScale:0.4,  atkScale:0.6, color:'#4ade80', bg:'#14532d', patterns:['jab','jab'],           speed:'fast' },
    { name:'Orc',       icon:'👹', hpScale:0.7,  atkScale:0.8, color:'#fb923c', bg:'#431407', patterns:['swing','jab'],          speed:'medium' },
    { name:'Skeleton',  icon:'💀', hpScale:0.5,  atkScale:0.9, color:'#e2e8f0', bg:'#1e293b', patterns:['jab','swing'],          speed:'medium' },
    { name:'Dark Mage', icon:'🧙', hpScale:0.6,  atkScale:1.0, color:'#818cf8', bg:'#1e1b4b', patterns:['swing','jab'],          speed:'slow' },
    { name:'Dragon Pup',icon:'🐉', hpScale:1.0,  atkScale:1.2, color:'#f87171', bg:'#450a0a', patterns:['swing','jab'],          speed:'medium' },
    { name:'Golem',     icon:'🪨', hpScale:1.5,  atkScale:0.7, color:'#a8a29e', bg:'#1c1917', patterns:['swing','swing'],        speed:'slow' },
    { name:'Phantom',   icon:'👻', hpScale:0.4,  atkScale:1.3, color:'#e879f9', bg:'#4a044e', patterns:['jab','jab'],            speed:'fast' },
    { name:'Boss Wolf', icon:'🐺', hpScale:1.8,  atkScale:1.1, color:'#94a3b8', bg:'#0f172a', patterns:['jab','swing','special'],speed:'medium', isBoss:true },
  ];

  // ── HERO SPRITE ──
  function drawHeroSprite(c, x, y, size, palette, cls, frame) {
    const palettes = [
      ['#a78bfa','#7c3aed','#f3e8ff'],
      ['#f472b6','#db2777','#fce7f3'],
      ['#34d399','#059669','#ecfdf5'],
      ['#60a5fa','#2563eb','#eff6ff'],
      ['#fbbf24','#d97706','#fffbeb'],
    ];
    const pal = palettes[palette] || palettes[0];
    const bob = hitStopTimer > 0 ? 0 : Math.sin(frame * 0.05) * 2.5;
    const lean = critPoseTimer > 0 ? Math.min(1, critPoseTimer * 4) * 8 : 0;
    const sway = Math.sin(frame * 0.03) * 3;

    c.save();
    c.translate(x + lean, y + bob);

    // Aura / focus glow
    if (focusStacks > 0) {
      const aura = c.createRadialGradient(0, 0, size*0.2, 0, 0, size*0.9);
      aura.addColorStop(0, 'transparent');
      aura.addColorStop(0.6, 'transparent');
      aura.addColorStop(1, `rgba(251,191,36,${focusStacks * 0.13})`);
      c.fillStyle = aura;
      c.beginPath(); c.ellipse(0, 4, size, size*1.1, 0, 0, Math.PI*2); c.fill();
    }

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.beginPath(); c.ellipse(0, size*0.65, size*0.35, size*0.1, 0, 0, Math.PI*2); c.fill();

    // Body
    const bg = c.createLinearGradient(-size*0.4, -size*0.1, size*0.4, size*0.5);
    bg.addColorStop(0, pal[2]); bg.addColorStop(0.5, pal[0]); bg.addColorStop(1, pal[1]);
    c.fillStyle = bg;
    c.beginPath(); c.ellipse(0, 4, size*0.38, size*0.46, 0, 0, Math.PI*2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1.5; c.stroke();

    // Head
    const hg = c.createRadialGradient(-size*0.1, -size*0.35, 2, 0, -size*0.3, size*0.3);
    hg.addColorStop(0, '#fef3c7'); hg.addColorStop(1, '#fde68a');
    c.fillStyle = hg;
    c.beginPath(); c.arc(0, -size*0.3, size*0.28, 0, Math.PI*2); c.fill();

    // Hair
    c.fillStyle = pal[1];
    c.beginPath(); c.arc(0, -size*0.36, size*0.2, Math.PI, 0); c.fill();
    c.beginPath(); c.arc(-size*0.18, -size*0.3, size*0.1, 0, Math.PI*2); c.fill();

    // Eyes
    c.fillStyle = '#1e293b';
    c.beginPath(); c.arc(-size*0.1, -size*0.3, 3, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(size*0.1, -size*0.3, 3, 0, Math.PI*2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath(); c.arc(-size*0.08, -size*0.32, 1.2, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(size*0.12, -size*0.32, 1.2, 0, Math.PI*2); c.fill();

    // Cheeks
    c.fillStyle = 'rgba(244,114,182,0.3)';
    c.beginPath(); c.ellipse(-size*0.2, -size*0.26, 5, 3.5, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(size*0.2, -size*0.26, 5, 3.5, 0, 0, Math.PI*2); c.fill();

    if (cls === 'warrior') {
      c.save(); c.rotate(sway * 0.02 + lean * 0.01);
      const sw = c.createLinearGradient(size*0.35, -size*0.25, size*0.6, size*0.2);
      sw.addColorStop(0, '#e2e8f0'); sw.addColorStop(0.5, '#fff'); sw.addColorStop(1, '#94a3b8');
      c.strokeStyle = sw; c.lineWidth = 3.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(size*0.4, -size*0.25); c.lineTo(size*0.58, size*0.18); c.stroke();
      c.strokeStyle = pal[2]; c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(size*0.32, 0); c.lineTo(size*0.64, 0); c.stroke();
      c.restore();
      const shg = c.createLinearGradient(-size*0.62, -size*0.12, -size*0.38, size*0.24);
      shg.addColorStop(0, pal[2]); shg.addColorStop(1, pal[1]);
      c.fillStyle = shg;
      c.beginPath(); c.roundRect(-size*0.62, -size*0.12, size*0.24, size*0.36, 5); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; c.stroke();
    } else {
      c.save(); c.rotate(sway * 0.02);
      c.strokeStyle = '#8b5cf6'; c.lineWidth = 3.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(size*0.4, -size*0.45); c.lineTo(size*0.56, size*0.32); c.stroke();
      const og = c.createRadialGradient(size*0.36, -size*0.5, 1, size*0.38, -size*0.48, 10);
      og.addColorStop(0, '#fff'); og.addColorStop(0.4, '#e879f9'); og.addColorStop(1, 'rgba(232,121,249,0)');
      c.fillStyle = og;
      c.beginPath(); c.arc(size*0.38, -size*0.48, 10, 0, Math.PI*2); c.fill();
      c.restore();
    }

    // Guard aura
    if (parryActive) {
      c.strokeStyle = `rgba(96,165,250,${0.4 + Math.sin(frameCount * 0.2) * 0.2})`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, size*0.75, 0, Math.PI*2); c.stroke();
    }

    c.restore();
  }

  function drawEnemySprite(c, x, y, size, enemy, frame) {
    const windupRatio = enemyWindupMax > 0 ? (1 - Math.max(0, enemyWindup) / enemyWindupMax) : 0;
    const bobSpeed = enrageActive ? 0.09 : 0.04;
    const bob = hitStopTimer > 0 ? 0 : Math.sin(frame * bobSpeed + 1) * 2.5;
    const windupLean = windupRatio > 0.5 ? -(windupRatio - 0.5) * 2 * 12 : 0;

    c.save();
    c.translate(x + windupLean, y + bob);

    if (enrageActive) {
      const ea = 0.18 + Math.sin(frame * 0.15) * 0.1;
      c.fillStyle = `rgba(248,113,113,${ea})`;
      c.beginPath(); c.arc(0, 0, size*0.75, 0, Math.PI*2); c.fill();
    }

    c.font = `${size}px serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(enemy.icon, 0, 0);

    if (windupRatio > 0.55) {
      const fa = (windupRatio - 0.55) / 0.45 * 0.45;
      c.fillStyle = enemyAttackPattern === 'swing' ? `rgba(239,68,68,${fa})` :
                    enemyAttackPattern === 'special' ? `rgba(168,85,247,${fa})` :
                    `rgba(251,191,36,${fa})`;
      c.beginPath(); c.arc(0, 0, size*0.65, 0, Math.PI*2); c.fill();
    }
    c.restore();
  }

  // ── PARTICLES ──
  function spawnParticle(x, y, color, count, opts) {
    if (particles.length >= MAX_PARTICLES) return;
    const n = Math.min(count, MAX_PARTICLES - particles.length);
    for (let i = 0; i < n; i++) {
      const angle = opts && opts.direction !== undefined
        ? opts.direction + (Math.random()-0.5) * (opts.spread || 1.5)
        : Math.random() * Math.PI * 2;
      const spd = (opts && opts.speed || 80) + Math.random() * 60;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 20,
        radius: (opts && opts.size || 3) + Math.random() * 3,
        color, life: 1,
        maxLife: 0.5 + Math.random() * 0.4,
        elapsed: 0,
        shape: opts && opts.shape || 'circle',
      });
    }
  }

  function spawnSlashArc(x, y, color, size) {
    slashArcs.push({
      x, y, color,
      size: size || 60,
      elapsed: 0, maxLife: 0.35,
      angle: -Math.PI * 0.4 + (Math.random() - 0.5) * 0.4,
    });
  }

  function spawnFloatingText(x, y, text, color, size) {
    if (floatingTexts.length > 15) floatingTexts.shift();
    floatingTexts.push({ x, y, text, color, size: size || 24, vy: -80, life: 1.2, elapsed: 0 });
  }

  // ── HELPERS ──
  function getHeroX() { return canvas ? canvas.width * 0.22 : 70; }
  function getHeroY() { return canvas ? canvas.height * 0.5 : 200; }
  function getEnemyX() { return canvas ? canvas.width * 0.75 : 230; }
  function getEnemyY() { return canvas ? canvas.height * 0.5 : 200; }

  // ── INIT ──
  function init(cv, heroData) {
    canvas = cv;
    ctx = cv.getContext('2d');
    heroClass = heroData.class;
    heroPalette = heroData.palette;
    assistMode = (State.get().settings && State.get().settings.assistMode) || false;
    resize();
  }

  function resize() {
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function startRun(cb) {
    onComplete = cb;
    running = true;
    phase = 'intro'; phaseTimer = 1.2;
    currentEncounter = 0;
    score = kills = crits = skillsUsed = heals = 0;
    xpGained = 0; lootDropped = [];
    skillCds = [0, 0, 0];
    particles = []; floatingTexts = []; slashArcs = [];
    energy = 30; focusStacks = 0;
    comboCount = 0; comboTimer = 0;
    overheat = 0; overheatCooldown = 0;
    heroStatusEffects = []; enemyStatusEffects = [];
    parryActive = false; parryWindow = 0;
    critPoseTimer = 0; hitStopTimer = 0;
    enrageActive = false;
    assistMode = (State.get().settings && State.get().settings.assistMode) || false;

    const stats = State.getEffectiveStats();
    heroHp = stats.maxHp; heroMaxHp = stats.maxHp;
    heroAtk = stats.atk; heroDef = stats.def; heroSpd = stats.spd;
    markerPos = 0; markerDir = 1;
    // Speed scales only slightly with hero spd so it stays near the 1.2s cycle target
    markerSpeed = 1.667 + heroSpd * 0.008;

    setupEncounter();
    updateUI(); updateEnergyBar(); updateComboMeter(); updateStatusDisplay();
    lastTime = performance.now();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function setupEncounter() {
    totalEncounters = 6 + Math.floor(Math.random() * 3);
    const lvl = State.get().hero.level;
    const idx = (currentEncounter + Math.floor(Math.random() * 2)) % ENEMIES.length;
    const template = ENEMIES[idx];
    const scaling = 1 + currentEncounter * 0.3 + lvl * 0.08;
    enemyMaxHp = Math.round(30 * template.hpScale * scaling);
    enemyHp = enemyMaxHp;
    currentEnemy = { ...template, atk: Math.round(6 * template.atkScale * scaling) };
    enrageActive = false;
    enemyStatusEffects = []; heroStatusEffects = [];

    sweetSpotLeft = 0.2 + Math.random() * 0.55;  // keep it reachable anywhere on bar
    // Crit window ≈ 10%, shrinks very slightly with encounter/level; assist widens it
    const bw = Math.max(0.05, 0.075 - currentEncounter * 0.004 - lvl * 0.001);
    sweetSpotWidth = assistMode ? bw * 1.6 : bw;
    // Perfect sub-window (tight) centred inside the sweet spot
    perfectSpotWidth = assistMode ? 0.06 : 0.035;
    perfectSpotOffset = (sweetSpotWidth - perfectSpotWidth) / 2;
    // Clamp so sweet spot + width stays within [0,1]
    sweetSpotLeft = Math.min(sweetSpotLeft, 1 - sweetSpotWidth - 0.02);

    const baseInterval = Math.max(1.8, 3.8 - currentEncounter * 0.25);
    scheduleNextAttack(assistMode ? baseInterval * 1.3 : baseInterval);
  }

  function scheduleNextAttack(delay) {
    enemyWindup = delay;
    enemyWindupMax = currentEnemy.speed === 'fast' ? 0.7 :
                     currentEnemy.speed === 'slow' ? 1.4 : 1.0;
    if (enrageActive) enemyWindupMax *= 0.6;
    enemyAttackInterval = delay;
  }

  // ── LOOP ──
  let frameCount = 0;

  function loop(now) {
    if (!running) return;
    if (paused) {
      // Keep rendering a static frame while paused, but do not advance simulation
      render(0);
      raf = requestAnimationFrame(loop);
      return;
    }
    const rawDt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (hitStopTimer > 0) {
      hitStopTimer -= rawDt;
      render(0);
      raf = requestAnimationFrame(loop);
      return;
    }
    update(rawDt);
    render(rawDt);
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    frameCount++;
    phaseTimer -= dt;

    if (phase === 'intro') { if (phaseTimer <= 0) phase = 'combat'; return; }
    if (phase === 'transition') {
      if (phaseTimer <= 0) {
        if (currentEncounter >= totalEncounters) endRun(true);
        else { setupEncounter(); updateUI(); updateEnergyBar(); updateComboMeter(); phase = 'combat'; }
      }
      return;
    }
    if (phase !== 'combat') return;

    // Marker
    if (tapCooldown > 0) tapCooldown -= dt;
    else {
      markerPos += markerDir * markerSpeed * dt;
      if (markerPos >= 1) { markerPos = 1; markerDir = -1; }
      if (markerPos <= 0) { markerPos = 0; markerDir = 1; }
    }
    updateTimingBar();

    // Skill CDs
    for (let i = 0; i < 3; i++) {
      if (skillCds[i] > 0) { skillCds[i] = Math.max(0, skillCds[i] - dt); updateSkillButton(i); }
    }

    // Overheat
    if (overheatCooldown > 0) overheatCooldown -= dt;
    else if (overheat > 0) { overheat = Math.max(0, overheat - 22 * dt); updateOverheatBar(); }

    // Combo decay
    if (comboCount > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) { comboCount = 0; comboTimer = 0; updateComboMeter(); }
    }

    // Enemy windup
    enemyWindup -= dt;
    if (enemyWindup <= 0) {
      doEnemyAttack();
    } else {
      updateWindupIndicator();
      const pf = assistMode ? 0.28 : 0.16;
      parryWindow = (enemyWindup <= enemyWindupMax * pf) ? 1 : 0;
    }

    // Status ticks
    tickStatusEffects(dt);

    // Timers
    if (critPoseTimer > 0) critPoseTimer -= dt;
    if (energy < MAX_ENERGY) { energy = Math.min(MAX_ENERGY, energy + 2 * dt); updateEnergyBar(); }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.elapsed += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt;
      p.life = 1 - p.elapsed / p.maxLife;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const t = floatingTexts[i];
      t.elapsed += dt; t.y += t.vy * dt; t.vy += 50 * dt;
      t.life = 1 - t.elapsed / 1.2;
      if (t.life <= 0) floatingTexts.splice(i, 1);
    }
    for (let i = slashArcs.length - 1; i >= 0; i--) {
      slashArcs[i].elapsed += dt;
      if (slashArcs[i].elapsed >= slashArcs[i].maxLife) slashArcs.splice(i, 1);
    }
  }

  function tickStatusEffects(dt) {
    let hChanged = false, eChanged = false;
    for (let i = heroStatusEffects.length - 1; i >= 0; i--) {
      const eff = heroStatusEffects[i];
      eff.elapsed += dt;
      if (eff.type === 'bleed') {
        eff.tickTimer = (eff.tickTimer || 0) + dt;
        if (eff.tickTimer >= 1) {
          eff.tickTimer -= 1;
          const d = Math.max(1, Math.round(eff.value));
          heroHp = Math.max(0, heroHp - d);
          spawnFloatingText(getHeroX(), getHeroY() - 20, `-${d}`, '#f87171', 15);
          hChanged = true;
          if (heroHp <= 0) { endRun(false); return; }
        }
      }
      if (eff.elapsed >= eff.duration) heroStatusEffects.splice(i, 1);
    }
    for (let i = enemyStatusEffects.length - 1; i >= 0; i--) {
      const eff = enemyStatusEffects[i];
      eff.elapsed += dt;
      if (eff.type === 'bleed') {
        eff.tickTimer = (eff.tickTimer || 0) + dt;
        if (eff.tickTimer >= 1) {
          eff.tickTimer -= 1;
          const d = Math.max(1, Math.round(eff.value));
          enemyHp = Math.max(0, enemyHp - d);
          spawnFloatingText(getEnemyX(), getEnemyY() - 20, `🩸-${d}`, '#f87171', 15);
          eChanged = true;
          if (enemyHp <= 0) { onEnemyDeath(); return; }
        }
      }
      if (eff.elapsed >= eff.duration) enemyStatusEffects.splice(i, 1);
    }
    if (hChanged) { updateHeroHPBar(); updateStatusDisplay(); }
    if (eChanged) { updateEnemyHPBar(); updateStatusDisplay(); }
  }

  function addStatus(target, type, duration, value) {
    const list = target === 'hero' ? heroStatusEffects : enemyStatusEffects;
    const ex = list.find(e => e.type === type);
    if (ex) { ex.elapsed = 0; ex.duration = Math.max(ex.duration - ex.elapsed, duration); return; }
    list.push({ type, duration, elapsed: 0, value: value || 0, tickTimer: 0 });
    updateStatusDisplay();
  }

  // ── RENDER ──
  function render(dt) {
    if (!ctx || !canvas) return;
    const W = canvas.width, H = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, currentEnemy ? currentEnemy.bg : '#0f0620');
    grad.addColorStop(1, '#0f0620');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(W * (0.2 + i*0.3), H * 0.38, 70 + i*25, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, H * 0.62, W, H * 0.38);

    // Slash arcs
    for (const arc of slashArcs) {
      const t = arc.elapsed / arc.maxLife;
      ctx.save();
      ctx.translate(arc.x, arc.y);
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = (1 - t) * 6 + 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, arc.size * t, arc.angle, arc.angle + Math.PI * 0.7);
      ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.35;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    drawHeroSprite(ctx, getHeroX(), getHeroY(), 40, heroPalette, heroClass, frameCount);
    if (currentEnemy && phase !== 'intro') {
      drawEnemySprite(ctx, getEnemyX(), getEnemyY(), 56, currentEnemy, frameCount);
    }

    if (phase === 'intro') {
      ctx.fillStyle = `rgba(15,6,32,${Math.max(0, phaseTimer)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = `bold 28px Fredoka One, cursive`;
      ctx.textAlign = 'center';
      ctx.fillText('⚔️ Battle Start!', W/2, H/2);
    }

    // Windup telegraph label
    if (phase === 'combat' && enemyWindup > 0 && enemyWindupMax > 0) {
      const ratio = 1 - enemyWindup / enemyWindupMax;
      if (ratio > 0.42) {
        const label = enemyAttackPattern === 'swing' ? '💢 HEAVY!' :
                      enemyAttackPattern === 'special' ? '💜 MAGIC!' : '⚡ JAB!';
        const alpha = (ratio - 0.42) / 0.58;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold 15px Fredoka One, cursive`;
        ctx.textAlign = 'center';
        ctx.fillStyle = enemyAttackPattern === 'swing' ? '#f87171' :
                        enemyAttackPattern === 'special' ? '#c084fc' : '#fbbf24';
        ctx.fillText(label, getEnemyX(), getEnemyY() - 65);
        ctx.restore();
      }
    }

    // Parry window indicator
    if (parryWindow > 0) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 13px Fredoka One, cursive';
      ctx.textAlign = 'center';
      ctx.fillText('PARRY!', getHeroX(), getHeroY() - 65);
      ctx.restore();
    }

    // Particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      if (p.shape === 'star') drawStar(ctx, p.x, p.y, p.radius * p.life);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    }

    // Floating texts
    for (const t of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = t.life;
      ctx.font = `bold ${t.size}px Fredoka One, cursive`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  function drawStar(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 2 * Math.PI / 5) - Math.PI/2;
      const a2 = a1 + Math.PI / 5;
      c.lineTo(x + Math.cos(a1)*r, y + Math.sin(a1)*r);
      c.lineTo(x + Math.cos(a2)*r*0.4, y + Math.sin(a2)*r*0.4);
    }
    c.closePath(); c.fill();
  }

  // ── COMBAT ACTIONS ──
  function doHeroAttack(isCrit, isPerfect) {
    if (!currentEnemy || phase !== 'combat') return;
    if (overheatCooldown > 0) {
      spawnFloatingText(getHeroX(), getHeroY() - 30, '🔥 Overheated!', '#f97316', 17);
      return;
    }
    overheat = Math.min(MAX_OVERHEAT, overheat + 18);
    if (overheat >= MAX_OVERHEAT) {
      overheatCooldown = 2.0;
      spawnFloatingText(getHeroX(), getHeroY() - 40, '🔥 OVERHEAT!', '#f97316', 22);
      Audio.playHit(false);
      updateOverheatBar();
      return;
    }
    updateOverheatBar();

    // isPerfect → guaranteed crit + focus stack + extra energy
    // isCrit (sweet spot but not perfect) → crit
    // miss → small focus-stack chance to still crit
    const focusBonus = focusStacks * 0.06;
    const actualCrit = isPerfect || isCrit || Math.random() < (0.04 + focusBonus);

    let dmg = heroAtk + (actualCrit ? heroAtk * 0.8 : 0);
    dmg = Math.round(dmg * (0.85 + Math.random() * 0.3));
    if (actualCrit) {
      // Perfect crits deal a further 25% bonus on top
      const perfectMult = isPerfect ? 1.25 : 1.0;
      dmg = Math.round(dmg * (1.5 + comboCount * 0.02) * perfectMult);
      crits++;
      critPoseTimer = 0.5;
      hitStopTimer = isPerfect ? 0.09 : 0.06;
      shake(true);
      Audio.playHit(true);
      spawnSlashArc(getEnemyX(), getEnemyY(), isPerfect ? '#fff' : '#fbbf24', isPerfect ? 65 : 55);
      spawnParticle(getEnemyX(), getEnemyY(), isPerfect ? '#fff' : '#fbbf24', isPerfect ? 16 : 12, { shape:'star' });
      spawnParticle(getEnemyX(), getEnemyY(), '#fff', 5);
    } else {
      Audio.playHit(false);
      spawnSlashArc(getEnemyX(), getEnemyY(), '#e2e8f0', 38);
      spawnParticle(getEnemyX(), getEnemyY(), '#fff', 4);
    }

    score += actualCrit ? (isPerfect ? 20 : 15) : 8;
    enemyHp = Math.max(0, enemyHp - dmg);

    const hitLabel = isPerfect ? `✨ ${dmg}!!` : actualCrit ? `💥 ${dmg}!` : `${dmg}`;
    const hitColor = isPerfect ? '#fff' : actualCrit ? '#fbbf24' : '#fff';
    const hitSize  = isPerfect ? 34 : actualCrit ? 30 : 22;
    spawnFloatingText(getEnemyX(), getEnemyY() - 30, hitLabel, hitColor, hitSize);

    comboCount++; comboTimer = COMBO_DECAY; updateComboMeter();

    // Focus stacks on perfect timing only (sweet spot = 1 stack, perfect = 2)
    const stackGain = isPerfect ? 2 : isCrit ? 1 : 0;
    if (stackGain > 0 && focusStacks < MAX_FOCUS) {
      focusStacks = Math.min(MAX_FOCUS, focusStacks + stackGain);
      energy = Math.min(MAX_ENERGY, energy + (isPerfect ? 18 : 10));
      spawnFloatingText(getHeroX(), getHeroY() - 50, `✨ Focus x${focusStacks}`, '#fbbf24', 15);
    }
    updateEnergyBar();

    if (actualCrit && Math.random() < 0.25) {
      addStatus('enemy', 'bleed', 4, Math.round(heroAtk * 0.3));
      spawnFloatingText(getEnemyX(), getEnemyY() - 50, '🩸 Bleed!', '#f87171', 15);
    }

    updateEnemyHPBar(); updateStatusDisplay();
    if (enemyHp <= 0) { onEnemyDeath(); return; }
    tapCooldown = 0.7;
  }

  function onEnemyDeath() {
    kills++; score += 50 + comboCount * 2;
    currentEncounter++;
    phase = 'transition'; phaseTimer = 1.0;
    spawnParticle(getEnemyX(), getEnemyY(), '#fbbf24', 20, { shape:'star' });
    spawnParticle(getEnemyX(), getEnemyY(), currentEnemy.color, 8);
    comboCount = 0; comboTimer = 0; updateComboMeter();
  }

  function doEnemyAttack() {
    if (!currentEnemy || phase !== 'combat') return;

    const patterns = currentEnemy.patterns || ['jab'];
    enemyAttackPattern = patterns[Math.floor(Math.random() * patterns.length)];
    if (enrageActive && currentEnemy.isBoss && Math.random() < 0.4) enemyAttackPattern = 'special';

    let dmg = currentEnemy.atk;
    if (enemyAttackPattern === 'swing') dmg = Math.round(dmg * 1.5);
    else if (enemyAttackPattern === 'special') dmg = Math.round(dmg * 2);
    else dmg = Math.round(dmg * 0.8);
    dmg = Math.max(1, Math.round((dmg - heroDef) * (0.85 + Math.random() * 0.3)));

    const wasParried = parryActive && parryWindow > 0;

    if (wasParried) {
      energy = Math.min(MAX_ENERGY, energy + 25);
      comboCount = Math.min(comboCount + 2, 20); comboTimer = COMBO_DECAY;
      spawnFloatingText(getHeroX(), getHeroY() - 40, '⚔️ PARRY!', '#60a5fa', 28);
      spawnParticle(getHeroX(), getHeroY(), '#60a5fa', 12);
      shake(false);
      Audio.playShield();
      if (navigator.vibrate && State.get().settings.haptics) navigator.vibrate([15,10,15]);
      addStatus('enemy', 'stun', 1.5, 0);
      updateEnergyBar(); updateComboMeter();
    } else if (parryActive) {
      dmg = Math.ceil(dmg * 0.4);
      Audio.playShield();
      spawnFloatingText(getHeroX(), getHeroY() - 30, `🛡️ ${dmg}`, '#94a3b8', 20);
      heroHp = Math.max(0, heroHp - dmg);
      updateHeroHPBar();
    } else {
      heroHp = Math.max(0, heroHp - dmg);
      spawnFloatingText(getHeroX(), getHeroY() - 30, `-${dmg}`, '#f87171', enemyAttackPattern === 'swing' ? 26 : 20);
      spawnParticle(getHeroX(), getHeroY(), '#f87171', enemyAttackPattern === 'swing' ? 8 : 4);
      Audio.playHit(false);
      if (enemyAttackPattern !== 'jab') shake(false);
      updateHeroHPBar();
      if (enemyAttackPattern === 'swing' && Math.random() < 0.3) addStatus('hero', 'bleed', 3, 2);
      if (enemyAttackPattern === 'special') addStatus('hero', 'stun', 1.0, 0);
      if (heroHp <= 0) { endRun(false); return; }
    }

    parryWindow = 0;

    // Enrage check
    if (currentEnemy.isBoss && !enrageActive && enemyHp < enemyMaxHp * 0.3) {
      enrageActive = true;
      spawnFloatingText(getEnemyX(), getEnemyY() - 75, '😡 ENRAGE!', '#f87171', 26);
      spawnParticle(getEnemyX(), getEnemyY(), '#f87171', 18);
    }

    let nextInterval = enemyAttackInterval;
    if (enrageActive) nextInterval *= 0.55;
    if (currentEnemy.speed === 'fast') nextInterval *= 0.75;
    if (currentEnemy.speed === 'slow') nextInterval *= 1.3;
    scheduleNextAttack(Math.max(1.2, nextInterval));
    updateStatusDisplay();
  }

  function useSkill(skillIdx) {
    if (phase !== 'combat') return;
    if (skillCds[skillIdx] > 0) return;
    if (energy < SKILL_ENERGY_COSTS[skillIdx]) {
      spawnFloatingText(getHeroX(), getHeroY() - 40, '⚡ No Energy!', '#94a3b8', 17);
      return;
    }
    energy = Math.max(0, energy - SKILL_ENERGY_COSTS[skillIdx]);
    skillCds[skillIdx] = SKILL_COOLDOWNS[skillIdx];
    skillsUsed++;
    updateSkillButton(skillIdx); updateEnergyBar();

    if (skillIdx === 0) {
      // Slash skill
      Audio.playSlash();
      const isCrit = Math.random() < (0.35 + focusStacks * 0.08);
      let dmg = Math.round(heroAtk * (isCrit ? 2.8 : 2.0) * (0.9 + Math.random() * 0.2));
      if (isCrit) { crits++; shake(true); hitStopTimer = 0.08; critPoseTimer = 0.6; }
      enemyHp = Math.max(0, enemyHp - dmg);
      score += isCrit ? 30 : 20;
      spawnSlashArc(getEnemyX(), getEnemyY(), isCrit ? '#f472b6' : '#a78bfa', 70);
      spawnParticle(getEnemyX(), getEnemyY(), '#f472b6', 14, { shape: isCrit ? 'star' : 'circle' });
      spawnFloatingText(getEnemyX(), getEnemyY() - 30, isCrit ? `⚡ ${dmg}!` : `🗡️ ${dmg}`, '#f472b6', isCrit ? 30 : 24);
      if (Math.random() < 0.5) {
        addStatus('enemy', 'bleed', 5, Math.round(heroAtk * 0.4));
        spawnFloatingText(getEnemyX(), getEnemyY() - 50, '🩸 Bleed!', '#f87171', 15);
      }
      comboCount += 3; comboTimer = COMBO_DECAY; updateComboMeter();
      updateEnemyHPBar();
      if (enemyHp <= 0) { onEnemyDeath(); return; }
    } else if (skillIdx === 1) {
      // Guard toggle
      parryActive = !parryActive;
      Audio.playShield();
      spawnParticle(getHeroX(), getHeroY(), '#60a5fa', parryActive ? 10 : 4);
      spawnFloatingText(getHeroX(), getHeroY() - 35, parryActive ? '🛡️ Guard UP' : '🛡️ Guard OFF', '#60a5fa', 20);
      score += 5;
    } else if (skillIdx === 2) {
      // Heal
      const healAmt = Math.round(heroMaxHp * 0.25 + comboCount * 2);
      heroHp = Math.min(heroMaxHp, heroHp + healAmt);
      heals++;
      Audio.playHeal();
      spawnParticle(getHeroX(), getHeroY(), '#34d399', 14);
      spawnFloatingText(getHeroX(), getHeroY() - 35, `💚 +${healAmt}`, '#34d399', 24);
      addStatus('hero', 'shield', 3, Math.round(heroMaxHp * 0.1));
      score += 5;
      updateHeroHPBar();
    }
  }

  function onTap() {
    if (phase !== 'combat') return;
    if (tapCooldown > 0) return;
    const inSweet = markerPos >= sweetSpotLeft && markerPos <= sweetSpotLeft + sweetSpotWidth;
    const inPerfect = inSweet &&
      markerPos >= sweetSpotLeft + perfectSpotOffset &&
      markerPos <= sweetSpotLeft + perfectSpotOffset + perfectSpotWidth;
    doHeroAttack(inSweet, inPerfect);
    Audio.resume();
    if (inPerfect && navigator.vibrate && State.get().settings.haptics) navigator.vibrate([10, 5, 20]);
    else if (inSweet && navigator.vibrate && State.get().settings.haptics) navigator.vibrate(20);
  }

  function onGuardPress() { if (phase === 'combat') parryActive = true; }
  function onGuardRelease() { parryActive = false; }

  function shake(isCrit) {
    if (navigator.vibrate && State.get().settings.haptics) navigator.vibrate(isCrit ? 40 : 20);
    const el = document.getElementById('screen-combat');
    if (el) {
      el.classList.remove('screen-shake','screen-shake-heavy');
      void el.offsetWidth;
      el.classList.add(isCrit ? 'screen-shake-heavy' : 'screen-shake');
    }
  }

  // ── UI ──
  function updateTimingBar() {
    const track = document.getElementById('combat-timer-track');
    if (!track) return;
    const W = track.offsetWidth;
    const marker = document.getElementById('combat-marker');
    const sweet = document.getElementById('combat-sweet-spot');
    const perfect = document.getElementById('combat-perfect-spot');
    if (marker) marker.style.left = `${markerPos * (W - 6)}px`;
    if (sweet) { sweet.style.left = `${sweetSpotLeft * W}px`; sweet.style.width = `${sweetSpotWidth * W}px`; }
    if (perfect) {
      perfect.style.left = `${(sweetSpotLeft + perfectSpotOffset) * W}px`;
      perfect.style.width = `${perfectSpotWidth * W}px`;
    }
  }

  function updateWindupIndicator() {
    const bar = document.getElementById('enemy-windup-bar');
    if (!bar || !enemyWindupMax) return;
    const ratio = 1 - Math.max(0, enemyWindup) / enemyWindupMax;
    bar.style.width = `${ratio * 100}%`;
    bar.style.background = enemyAttackPattern === 'swing' ? '#f87171' :
                           enemyAttackPattern === 'special' ? '#c084fc' : '#fbbf24';
  }

  function updateHeroHPBar() {
    const bar = document.getElementById('hero-hp-bar');
    const num = document.getElementById('hero-hp-num');
    if (bar) bar.style.width = `${Math.max(0, heroHp/heroMaxHp*100)}%`;
    if (num) num.textContent = `${Math.max(0,heroHp)}/${heroMaxHp}`;
  }

  function updateEnemyHPBar() {
    const bar = document.getElementById('enemy-hp-bar');
    const num = document.getElementById('enemy-hp-num');
    if (bar) bar.style.width = `${Math.max(0, enemyHp/enemyMaxHp*100)}%`;
    if (num) num.textContent = `${Math.max(0,enemyHp)}/${enemyMaxHp}`;
  }

  function updateEnergyBar() {
    const fill = document.getElementById('energy-bar-fill');
    const label = document.getElementById('energy-label');
    if (fill) fill.style.width = `${energy/MAX_ENERGY*100}%`;
    if (label) label.textContent = `⚡${Math.round(energy)}`;
    const oh = document.getElementById('overheat-fill');
    if (oh) oh.style.width = `${overheat/MAX_OVERHEAT*100}%`;
  }

  function updateOverheatBar() {
    const oh = document.getElementById('overheat-fill');
    if (oh) oh.style.width = `${overheat/MAX_OVERHEAT*100}%`;
    const el = document.getElementById('overheat-bar');
    if (el) el.classList.toggle('overheat-active', overheat >= MAX_OVERHEAT || overheatCooldown > 0);
  }

  function updateComboMeter() {
    const el = document.getElementById('combo-count');
    if (el) {
      el.textContent = comboCount > 0 ? `${comboCount}x` : '';
      el.className = comboCount >= 10 ? 'combo-count combo-high' : comboCount >= 5 ? 'combo-count combo-mid' : 'combo-count';
    }
    const ring = document.getElementById('combo-ring');
    if (ring) ring.style.display = comboCount > 0 ? 'block' : 'none';
  }

  function updateStatusDisplay() {
    const hs = document.getElementById('hero-status');
    const es = document.getElementById('enemy-status');
    if (hs) hs.innerHTML = heroStatusEffects.map(e => statusIcon(e)).join('');
    if (es) es.innerHTML = enemyStatusEffects.map(e => statusIcon(e)).join('');
  }

  function statusIcon(eff) {
    const icons = { bleed:'🩸', stun:'⭐', shield:'🔵' };
    const r = Math.max(0, Math.ceil(eff.duration - eff.elapsed));
    return `<span class="status-icon">${icons[eff.type]||'?'}<sub>${r}s</sub></span>`;
  }

  function updateSkillButton(i) {
    const btn = document.getElementById(`skill-${i}`);
    const cdEl = document.getElementById(`skill-cd-${i}`);
    if (!btn || !cdEl) return;
    if (skillCds[i] > 0) { btn.classList.add('on-cooldown'); cdEl.textContent = Math.ceil(skillCds[i]); }
    else { btn.classList.remove('on-cooldown'); cdEl.textContent = ''; }
  }

  function updateUI() {
    const el = document.getElementById('combat-encounter-label');
    if (el) el.textContent = `Encounter ${currentEncounter+1}/${totalEncounters}`;
    const sc = document.getElementById('combat-score-label');
    if (sc) sc.textContent = `Score: ${score}`;
    const hn = document.getElementById('hero-hp-name');
    if (hn) hn.textContent = State.get().hero.name || 'Hero';
    const en = document.getElementById('enemy-hp-name');
    if (en && currentEnemy) en.textContent = currentEnemy.name;
    updateHeroHPBar(); updateEnemyHPBar();
  }

  function endRun(won) {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (won) { Audio.playVictory(); phase = 'victory'; }
    else { Audio.playDefeat(); phase = 'defeat'; }

    const st = State.get();
    const runNum = st.progression.totalRuns || 0;
    lootDropped = Loot.generateRunLoot(runNum, st.hero.class);
    for (const item of lootDropped) State.addToInventory(item);

    xpGained = (won ? 60 : 20) + kills*8 + crits*3 + score + Math.round(comboCount*1.5);
    const runResult = {
      won, score, kills, crits, skillsUsed, heals,
      legendaryDropped: lootDropped.some(i => i.rarity === 'legendary'),
      rareDropped: lootDropped.some(i => i.rarity === 'rare' || i.rarity === 'epic'),
    };

    State.updateBestScore(score);
    const leveled = State.addXP(xpGained);
    const claimedChapters = Quests.updateRunStats(runResult);

    setTimeout(() => {
      if (onComplete) onComplete({ won, score, kills, crits, xpGained, loot: lootDropped, leveled, claimedChapters });
    }, 400);
  }

  function pause() {
    if (!running) return;
    paused = true;
  }

  function resume() {
    if (!running) return;
    if (!paused) return;
    paused = false;
    lastTime = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    paused = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  return { init, startRun, onTap, useSkill, pause, resume, stop, resize, onGuardPress, onGuardRelease };
})();
