// ===== LOOT MODULE =====
const Loot = (() => {
  // Seeded RNG (mulberry32)
  function seededRng(seed) {
    let s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 0xFFFFFFFF;
    };
  }

  function dailySeed() {
    const d = new Date();
    return (d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate());
  }

  function runSeed(run) {
    return dailySeed() * 1000 + run;
  }

  const RARITIES = ['common','rare','epic','legendary'];
  const RARITY_WEIGHTS = [60, 28, 10, 2]; // base %

  function getRarity(rng, pityCounter) {
    const legendaryBonus = Math.min(pityCounter * 2, 30);
    const epicBonus = Math.min(pityCounter, 15);
    const w = [
      Math.max(RARITY_WEIGHTS[0] - legendaryBonus - epicBonus, 10),
      RARITY_WEIGHTS[1],
      RARITY_WEIGHTS[2] + epicBonus,
      RARITY_WEIGHTS[3] + legendaryBonus,
    ];
    const total = w.reduce((a,b) => a+b, 0);
    let roll = rng() * total;
    for (let i = 0; i < w.length; i++) {
      roll -= w[i];
      if (roll <= 0) return RARITIES[i];
    }
    return 'common';
  }

  const ITEM_POOLS = {
    weapon: {
      warrior: [
        { name: 'Iron Sword', icon: '⚔️', stats: { atk: 3 } },
        { name: 'Steel Blade', icon: '⚔️', stats: { atk: 6 } },
        { name: 'Knight\'s Glaive', icon: '🗡️', stats: { atk: 10 } },
        { name: 'Dragon Fang', icon: '🗡️', stats: { atk: 16, spd: 2 } },
      ],
      mage: [
        { name: 'Maple Wand', icon: '🪄', stats: { atk: 5 } },
        { name: 'Arcane Staff', icon: '🔮', stats: { atk: 9, spd: 1 } },
        { name: 'Sorcerer Rod', icon: '🪄', stats: { atk: 14 } },
        { name: 'Starfire Tome', icon: '📖', stats: { atk: 22, spd: 3 } },
      ],
    },
    armor: [
      { name: 'Cloth Vest', icon: '👕', stats: { def: 2, maxHp: 5 } },
      { name: 'Chain Mail', icon: '🛡️', stats: { def: 5, maxHp: 10 } },
      { name: 'Plate Armor', icon: '🛡️', stats: { def: 9, maxHp: 18 } },
      { name: 'Dragon Scale', icon: '🛡️', stats: { def: 16, maxHp: 30 } },
    ],
    ring: [
      { name: 'Bronze Ring', icon: '💍', stats: { spd: 2 } },
      { name: 'Silver Band', icon: '💍', stats: { spd: 3, atk: 2 } },
      { name: 'Mage Signet', icon: '💍', stats: { atk: 5, spd: 2 } },
      { name: 'Ancient Loop', icon: '💍', stats: { atk: 8, def: 4, spd: 4 } },
    ],
  };

  function generateItem(rng, slot, heroClass, rarity) {
    let pool;
    if (slot === 'weapon') {
      pool = ITEM_POOLS.weapon[heroClass] || ITEM_POOLS.weapon.warrior;
    } else {
      pool = ITEM_POOLS[slot];
    }
    // Rarity maps to pool index roughly
    const rarityIdx = RARITIES.indexOf(rarity);
    const poolIdxBase = Math.floor((rarityIdx / 3) * (pool.length - 1));
    const poolIdx = Math.min(poolIdxBase + Math.floor(rng() * 1.5), pool.length - 1);
    const base = pool[poolIdx];

    // Scale stats by rarity
    const scale = [1, 1.5, 2.2, 3.5][rarityIdx];
    const stats = {};
    for (const k in base.stats) {
      stats[k] = Math.round(base.stats[k] * scale);
    }

    return {
      id: `item_${Date.now()}_${Math.floor(rng()*10000)}`,
      name: rarityPrefix(rarity) + base.name,
      icon: base.icon,
      slot,
      rarity,
      stats,
    };
  }

  function rarityPrefix(rarity) {
    const p = { common:'', rare:'Enchanted ', epic:'Mythic ', legendary:'⭐ ' };
    return p[rarity] || '';
  }

  function generateRunLoot(runNum, heroClass) {
    const st = State.get();
    const pity = st.progression.pityCounter || 0;
    const rng = seededRng(runSeed(runNum));

    const drops = [];
    const numDrops = 2 + Math.floor(rng() * 2); // 2-3 items
    const slots = ['weapon','armor','ring'];

    for (let i = 0; i < numDrops; i++) {
      const slot = slots[Math.floor(rng() * slots.length)];
      const rarity = getRarity(rng, pity);
      const item = generateItem(rng, slot, heroClass, rarity);
      drops.push(item);
    }

    // Update pity
    const hasLegendary = drops.some(d => d.rarity === 'legendary');
    if (hasLegendary) {
      st.progression.pityCounter = 0;
      st.progression.runsSinceLegendary = 0;
    } else {
      st.progression.pityCounter = (st.progression.pityCounter || 0) + 1;
      st.progression.runsSinceLegendary = (st.progression.runsSinceLegendary || 0) + 1;
    }

    return drops;
  }

  function rarityColor(rarity) {
    const c = { common:'#94a3b8', rare:'#60a5fa', epic:'#a78bfa', legendary:'#fbbf24' };
    return c[rarity] || '#fff';
  }

  function formatStats(stats) {
    return Object.entries(stats).map(([k,v]) => `+${v} ${k.toUpperCase()}`).join(' · ');
  }

  return { generateRunLoot, rarityColor, formatStats, rarityPrefix };
})();
