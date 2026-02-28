// ===== COMBAT MODULE =====
const Combat = (() => {
  let canvas, ctx;
  let running = false;
  let raf = null;
  let state = {};
  let onComplete = null;

  // Timing bar
  let markerPos = 0; // 0-1
  let markerDir = 1;
  let markerSpeed = 0.5; // units per second
  let sweetSpotLeft = 0.35;
  let sweetSpotWidth = 0.22;
  let waitingForTap = false;
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
  let enemyAttackTimer = 0;
  let enemyAttackInterval = 3.0;
  let shieldActive = false;
  let lastTime = 0;
  let phase = 'intro'; // intro, combat, victory, defeat, transition
  let phaseTimer = 0;
  let xpGained = 0;
  let lootDropped = [];

  // Skill cooldowns [slash, shield, heal]
  const SKILL_COOLDOWNS = [6, 10, 15];
  let skillCds = [0, 0, 0];

  // Enemies
  const ENEMIES = [
    { name:'Goblin', icon:'👺', hpScale:0.4, atkScale:0.6, color:'#4ade80', bg:'#14532d' },
    { name:'Orc', icon:'👹', hpScale:0.7, atkScale:0.8, color:'#fb923c', bg:'#431407' },
    { name:'Skeleton', icon:'💀', hpScale:0.5, atkScale:0.9, color:'#e2e8f0', bg:'#1e293b' },
    { name:'Dark Mage', icon:'🧙', hpScale:0.6, atkScale:1.0, color:'#818cf8', bg:'#1e1b4b' },
    { name:'Dragon Pup', icon:'🐉', hpScale:1.0, atkScale:1.2, color:'#f87171', bg:'#450a0a' },
    { name:'Golem', icon:'🪨', hpScale:1.5, atkScale:0.7, color:'#a8a29e', bg:'#1c1917' },
    { name:'Phantom', icon:'👻', hpScale:0.4, atkScale:1.3, color:'#e879f9', bg:'#4a044e' },
    { name:'Boss Wolf', icon:'🐺', hpScale:1.8, atkScale:1.1, color:'#94a3b8', bg:'#0f172a' },
  ];

  let currentEnemy = null;
  let heroClass = 'warrior';
  let heroPalette = 0;

  // Particles
  let particles = [];
  let floatingTexts = [];
  let vfxList = [];

  // Hero sprite drawing
  function drawHeroSprite(c, x, y, size, palette, cls, frame) {
    const palettes = [
      ['#a78bfa','#7c3aed','#f3e8ff'],
      ['#f472b6','#db2777','#fce7f3'],
      ['#34d399','#059669','#ecfdf5'],
      ['#60a5fa','#2563eb','#eff6ff'],
      ['#fbbf24','#d97706','#fffbeb'],
    ];
    const pal = palettes[palette] || palettes[0];
    const bob = Math.sin(frame * 0.05) * 2;
    c.save();
    c.translate(x, y + bob);

    // Body
    c.fillStyle = pal[0];
    c.beginPath();
    c.ellipse(0, 4, size*0.38, size*0.46, 0, 0, Math.PI*2);
    c.fill();

    // Head
    c.fillStyle = '#fde68a';
    c.beginPath();
    c.arc(0, -size*0.3, size*0.28, 0, Math.PI*2);
    c.fill();

    // Hair
    c.fillStyle = pal[1];
    c.beginPath();
    c.arc(0, -size*0.36, size*0.2, Math.PI, 0);
    c.fill();
    c.beginPath();
    c.arc(-size*0.18, -size*0.3, size*0.1, 0, Math.PI*2);
    c.fill();

    // Eyes
    c.fillStyle = '#1e293b';
    c.beginPath(); c.arc(-size*0.1, -size*0.3, 3, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(size*0.1, -size*0.3, 3, 0, Math.PI*2); c.fill();

    if (cls === 'warrior') {
      // Sword
      c.strokeStyle = '#cbd5e1'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(size*0.4, -size*0.2);
      c.lineTo(size*0.55, size*0.15);
      c.stroke();
      // Guard
      c.strokeStyle = pal[2]; c.lineWidth = 4;
      c.beginPath();
      c.moveTo(size*0.33, 0); c.lineTo(size*0.62, 0);
      c.stroke();
      // Shield
      c.fillStyle = pal[1];
      c.beginPath();
      c.roundRect(-size*0.6, -size*0.1, size*0.22, size*0.34, 4);
      c.fill();
    } else {
      // Staff
      c.strokeStyle = '#8b5cf6'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(size*0.4, -size*0.4);
      c.lineTo(size*0.55, size*0.3);
      c.stroke();
      // Orb
      c.fillStyle = '#e879f9';
      c.beginPath(); c.arc(size*0.38, -size*0.46, 8, 0, Math.PI*2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.arc(size*0.34, -size*0.5, 3, 0, Math.PI*2); c.fill();
    }
    c.restore();
  }

  function drawEnemySprite(c, x, y, size, enemy, frame) {
    const bob = Math.sin(frame * 0.04 + 1) * 2;
    c.save();
    c.translate(x, y + bob);
    c.font = `${size}px serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(enemy.icon, 0, 0);
    c.restore();
  }

  function spawnParticle(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 80;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        radius: 3 + Math.random() * 4,
        color,
        life: 1, maxLife: 0.7 + Math.random() * 0.4,
        elapsed: 0,
      });
    }
  }

  function spawnFloatingText(x, y, text, color, size) {
    floatingTexts.push({ x, y, text, color, size: size || 24, vy: -60, life: 1.2, elapsed: 0 });
  }

  function init(cv, heroData) {
    canvas = cv;
    ctx = cv.getContext('2d');
    heroClass = heroData.class;
    heroPalette = heroData.palette;
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
    phase = 'intro';
    phaseTimer = 1.2;
    currentEncounter = 0;
    score = 0; kills = 0; crits = 0; skillsUsed = 0; heals = 0;
    xpGained = 0; lootDropped = [];
    skillCds = [0, 0, 0];
    particles = []; floatingTexts = []; vfxList = [];

    const stats = State.getEffectiveStats();
    heroHp = stats.maxHp; heroMaxHp = stats.maxHp;
    heroAtk = stats.atk; heroDef = stats.def; heroSpd = stats.spd;

    markerPos = 0; markerDir = 1;
    markerSpeed = 0.38 + heroSpd * 0.012;
    waitingForTap = true;

    setupEncounter();
    updateUI();
    lastTime = performance.now();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function setupEncounter() {
    totalEncounters = 6 + Math.floor(Math.random() * 3);
    const lvl = State.get().hero.level;
    const enemyIdx = Math.min(currentEncounter, ENEMIES.length - 1);
    const template = ENEMIES[(enemyIdx + Math.floor(Math.random() * 2)) % ENEMIES.length];
    const scaling = 1 + currentEncounter * 0.3 + lvl * 0.08;
    enemyMaxHp = Math.round(30 * template.hpScale * scaling);
    enemyHp = enemyMaxHp;
    const enemyAtk = Math.round(6 * template.atkScale * scaling);
    enemyAttackInterval = Math.max(1.5, 3.5 - currentEncounter * 0.2);
    enemyAttackTimer = enemyAttackInterval;
    shieldActive = false;

    currentEnemy = {
      ...template,
      hp: enemyHp, maxHp: enemyMaxHp, atk: enemyAtk,
    };

    // Randomize sweet spot
    sweetSpotLeft = 0.2 + Math.random() * 0.35;
    sweetSpotWidth = Math.max(0.12, 0.28 - currentEncounter * 0.015 - lvl * 0.005);
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    update(dt);
    render(dt);

    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    phaseTimer -= dt;

    if (phase === 'intro') {
      if (phaseTimer <= 0) phase = 'combat';
      return;
    }
    if (phase === 'transition') {
      if (phaseTimer <= 0) {
        if (currentEncounter >= totalEncounters) {
          endRun(true);
        } else {
          setupEncounter();
          updateUI();
          phase = 'combat';
        }
      }
      return;
    }
    if (phase === 'victory' || phase === 'defeat') return;

    // Update marker
    if (tapCooldown > 0) {
      tapCooldown -= dt;
    } else {
      markerPos += markerDir * markerSpeed * dt;
      if (markerPos >= 1) { markerPos = 1; markerDir = -1; }
      if (markerPos <= 0) { markerPos = 0; markerDir = 1; }
    }
    updateTimingBar();

    // Update skill cooldowns
    for (let i = 0; i < 3; i++) {
      if (skillCds[i] > 0) {
        skillCds[i] = Math.max(0, skillCds[i] - dt);
        updateSkillButton(i);
      }
    }

    // Enemy attack
    enemyAttackTimer -= dt;
    if (enemyAttackTimer <= 0) {
      enemyAttackTimer = enemyAttackInterval;
      doEnemyAttack();
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.elapsed += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 150 * dt; // gravity
      p.life = 1 - p.elapsed / p.maxLife;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const t = floatingTexts[i];
      t.elapsed += dt;
      t.y += t.vy * dt;
      t.vy += 40 * dt;
      t.life = 1 - t.elapsed / 1.2;
      if (t.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  let frameCount = 0;
  function render(dt) {
    frameCount++;
    if (!ctx || !canvas) return;
    const W = canvas.width, H = canvas.height;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, currentEnemy ? currentEnemy.bg : '#0f0620');
    grad.addColorStop(1, '#0f0620');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, H * 0.62, W, H * 0.38);

    const heroX = W * 0.22, heroY = H * 0.5;
    const enemyX = W * 0.75, enemyY = H * 0.5;

    // Draw hero
    drawHeroSprite(ctx, heroX, heroY, 40, heroPalette, heroClass, frameCount);

    // Draw enemy
    if (currentEnemy && phase !== 'intro') {
      drawEnemySprite(ctx, enemyX, enemyY, 56, currentEnemy, frameCount);
    }

    // Intro overlay
    if (phase === 'intro') {
      ctx.fillStyle = `rgba(15,6,32,${Math.max(0, phaseTimer)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = `bold 28px Fredoka One, cursive`;
      ctx.textAlign = 'center';
      ctx.fillText('⚔️ Battle Start!', W/2, H/2);
    }

    // Particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Floating texts
    for (const t of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px Fredoka One, cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Outline
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  function doHeroAttack(isCrit) {
    if (!currentEnemy || phase !== 'combat') return;
    let dmg = heroAtk + (isCrit ? heroAtk * 0.8 : 0);
    dmg = Math.round(dmg * (0.85 + Math.random() * 0.3));
    if (isCrit) {
      dmg = Math.round(dmg * 1.5);
      crits++;
      shake();
      Audio.playHit(true);
    } else {
      Audio.playHit(false);
    }
    score += isCrit ? 15 : 8;
    enemyHp = Math.max(0, enemyHp - dmg);

    // Visual
    const W = canvas ? canvas.width : 300;
    const H = canvas ? canvas.height : 400;
    spawnParticle(W*0.75, H*0.5, isCrit ? '#fbbf24' : '#fff', isCrit ? 12 : 6);
    spawnFloatingText(W*0.75, H*0.38, isCrit ? `💥 ${dmg}!` : `${dmg}`, isCrit ? '#fbbf24' : '#fff', isCrit ? 32 : 22);

    updateEnemyHPBar();

    if (enemyHp <= 0) {
      kills++;
      score += 50;
      currentEncounter++;
      phase = 'transition';
      phaseTimer = 1.0;
      spawnParticle(W*0.75, H*0.5, '#fbbf24', 20);
    }

    tapCooldown = 0.8;
  }

  function doEnemyAttack() {
    if (!currentEnemy || phase !== 'combat') return;
    let dmg = Math.max(1, currentEnemy.atk - heroDef);
    if (shieldActive) {
      dmg = Math.ceil(dmg * 0.5);
      shieldActive = false;
      Audio.playShield();
    }
    dmg = Math.round(dmg * (0.85 + Math.random() * 0.3));
    heroHp = Math.max(0, heroHp - dmg);

    const W = canvas ? canvas.width : 300;
    const H = canvas ? canvas.height : 400;
    spawnFloatingText(W*0.22, H*0.38, `-${dmg}`, '#f87171', 20);
    spawnParticle(W*0.22, H*0.5, '#f87171', 5);
    Audio.playHit(false);
    updateHeroHPBar();

    if (heroHp <= 0) {
      endRun(false);
    }
  }

  function useSkill(skillIdx) {
    if (phase !== 'combat') return;
    if (skillCds[skillIdx] > 0) return;
    skillCds[skillIdx] = SKILL_COOLDOWNS[skillIdx];
    skillsUsed++;
    updateSkillButton(skillIdx);

    const W = canvas ? canvas.width : 300;
    const H = canvas ? canvas.height : 400;

    if (skillIdx === 0) {
      // Slash Arc
      Audio.playSlash();
      const isCrit = Math.random() < 0.35;
      let dmg = Math.round(heroAtk * (isCrit ? 2.5 : 1.8) * (0.9 + Math.random() * 0.2));
      if (isCrit) { crits++; shake(); }
      enemyHp = Math.max(0, enemyHp - dmg);
      score += isCrit ? 25 : 18;
      spawnParticle(W*0.75, H*0.5, '#f472b6', 15);
      spawnFloatingText(W*0.75, H*0.35, isCrit ? `⚡ ${dmg}!` : `🗡️ ${dmg}`, '#f472b6', isCrit ? 30 : 22);
      updateEnemyHPBar();
      if (enemyHp <= 0) {
        kills++; score += 50; currentEncounter++;
        phase = 'transition'; phaseTimer = 1.0;
        spawnParticle(W*0.75, H*0.5, '#fbbf24', 20);
      }
    } else if (skillIdx === 1) {
      // Shield Guard
      shieldActive = true;
      Audio.playShield();
      spawnParticle(W*0.22, H*0.5, '#60a5fa', 10);
      spawnFloatingText(W*0.22, H*0.35, '🛡️ Guard!', '#60a5fa', 22);
      score += 10;
    } else if (skillIdx === 2) {
      // Heal
      const healAmt = Math.round(heroMaxHp * 0.22);
      heroHp = Math.min(heroMaxHp, heroHp + healAmt);
      heals++;
      Audio.playHeal();
      spawnParticle(W*0.22, H*0.5, '#34d399', 12);
      spawnFloatingText(W*0.22, H*0.35, `💚 +${healAmt}`, '#34d399', 22);
      score += 5;
      updateHeroHPBar();
    }
  }

  function onTap() {
    if (phase !== 'combat') return;
    if (tapCooldown > 0) return;
    const inSweet = markerPos >= sweetSpotLeft && markerPos <= sweetSpotLeft + sweetSpotWidth;
    doHeroAttack(inSweet);
    Audio.resume();
  }

  function shake() {
    if (navigator.vibrate && State.get().settings.haptics) navigator.vibrate(30);
    const el = document.getElementById('screen-combat');
    if (el) { el.classList.remove('screen-shake'); void el.offsetWidth; el.classList.add('screen-shake'); }
  }

  function updateTimingBar() {
    const track = document.getElementById('combat-timer-track');
    if (!track) return;
    const W = track.offsetWidth;
    const marker = document.getElementById('combat-marker');
    const sweet = document.getElementById('combat-sweet-spot');
    if (marker) marker.style.left = `${markerPos * (W - 6)}px`;
    if (sweet) {
      sweet.style.left = `${sweetSpotLeft * W}px`;
      sweet.style.width = `${sweetSpotWidth * W}px`;
    }
  }

  function updateHeroHPBar() {
    const bar = document.getElementById('hero-hp-bar');
    const num = document.getElementById('hero-hp-num');
    if (bar) bar.style.width = `${Math.max(0, heroHp / heroMaxHp * 100)}%`;
    if (num) num.textContent = `${Math.max(0,heroHp)}/${heroMaxHp}`;
  }

  function updateEnemyHPBar() {
    const bar = document.getElementById('enemy-hp-bar');
    const num = document.getElementById('enemy-hp-num');
    if (bar) bar.style.width = `${Math.max(0, enemyHp / enemyMaxHp * 100)}%`;
    if (num) num.textContent = `${Math.max(0,enemyHp)}/${enemyMaxHp}`;
  }

  function updateSkillButton(i) {
    const btn = document.getElementById(`skill-${i}`);
    const cdEl = document.getElementById(`skill-cd-${i}`);
    if (!btn || !cdEl) return;
    if (skillCds[i] > 0) {
      btn.classList.add('on-cooldown');
      cdEl.textContent = Math.ceil(skillCds[i]);
    } else {
      btn.classList.remove('on-cooldown');
      cdEl.textContent = '';
    }
  }

  function updateUI() {
    const el = document.getElementById('combat-encounter-label');
    if (el) el.textContent = `Encounter ${currentEncounter + 1}/${totalEncounters}`;
    const sc = document.getElementById('combat-score-label');
    if (sc) sc.textContent = `Score: ${score}`;
    const hn = document.getElementById('hero-hp-name');
    if (hn) hn.textContent = State.get().hero.name || 'Hero';
    const en = document.getElementById('enemy-hp-name');
    if (en && currentEnemy) en.textContent = currentEnemy.name;
    updateHeroHPBar();
    updateEnemyHPBar();
  }

  function endRun(won) {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }

    if (won) {
      Audio.playVictory();
      phase = 'victory';
    } else {
      Audio.playDefeat();
      phase = 'defeat';
    }

    // Generate loot
    const st = State.get();
    const runNum = st.progression.totalRuns || 0;
    lootDropped = Loot.generateRunLoot(runNum, st.hero.class);
    for (const item of lootDropped) State.addToInventory(item);

    // XP
    const xpBase = won ? 60 : 20;
    xpGained = xpBase + kills * 8 + crits * 3 + score;

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

  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  return { init, startRun, onTap, useSkill, stop, resize };
})();
