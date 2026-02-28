// ===== QUESTS MODULE =====
const Quests = (() => {
  const STORY_CHAPTERS = [
    {
      id: 0, name: 'The First Step',
      desc: 'Begin your journey and defeat the goblins.',
      objective: 'Complete 1 run',
      type: 'runs', target: 1,
      reward: { xp: 50, item: null },
      unlock: null,
    },
    {
      id: 1, name: 'Sharpening Steel',
      desc: 'Find your first piece of enchanted gear.',
      objective: 'Obtain 1 Rare item',
      type: 'rare_items', target: 1,
      reward: { xp: 100, skin: null },
      unlock: null,
    },
    {
      id: 2, name: 'The Dark Forest',
      desc: 'Push deeper into the woods and survive longer.',
      objective: 'Complete 3 runs',
      type: 'runs', target: 3,
      reward: { xp: 150, accessory: 'flower' },
      unlock: null,
    },
    {
      id: 3, name: 'Dragon\'s Breath',
      desc: 'Land a powerful critical hit in combat.',
      objective: 'Land 20 crits',
      type: 'crits', target: 20,
      reward: { xp: 200, skin: 'fire' },
      unlock: null,
    },
    {
      id: 4, name: 'The Arcane Path',
      desc: 'Prove yourself worthy of the Mage class.',
      objective: 'Reach Level 5',
      type: 'level', target: 5,
      reward: { xp: 300, class: 'mage' },
      unlock: 'mage',
    },
    {
      id: 5, name: 'Treasures Abound',
      desc: 'Collect powerful artifacts on your journeys.',
      objective: 'Collect 15 items',
      type: 'total_items', target: 15,
      reward: { xp: 250, accessory: 'star_clip' },
      unlock: null,
    },
    {
      id: 6, name: 'The Hundred Battles',
      desc: 'Become a true veteran of the realm.',
      objective: 'Defeat 100 enemies',
      type: 'kills', target: 100,
      reward: { xp: 400, skin: 'shadow' },
      unlock: null,
    },
    {
      id: 7, name: 'Peak Performance',
      desc: 'Achieve excellence on a single run.',
      objective: 'Score 1000+ in one run',
      type: 'score', target: 1000,
      reward: { xp: 500, accessory: 'crown' },
      unlock: null,
    },
    {
      id: 8, name: 'The Epic Quest',
      desc: 'Harness the power of legendary gear.',
      objective: 'Obtain 1 Legendary item',
      type: 'legendary_items', target: 1,
      reward: { xp: 600, skin: 'galaxy' },
      unlock: null,
    },
    {
      id: 9, name: 'Champion of the Realm',
      desc: 'Reach the pinnacle of power.',
      objective: 'Reach Level 10',
      type: 'level', target: 10,
      reward: { xp: 1000, accessory: 'halo' },
      unlock: null,
    },
  ];

  const DAILY_POOL = [
    { id: 'dq_runs2', name: 'Two-Run Day', desc: 'Complete 2 runs today.', type: 'runs', target: 2, reward: { xp: 80 } },
    { id: 'dq_crits10', name: 'Critical Streak', desc: 'Land 10 crits today.', type: 'crits', target: 10, reward: { xp: 60 } },
    { id: 'dq_kills20', name: 'Monster Hunter', desc: 'Defeat 20 enemies today.', type: 'kills', target: 20, reward: { xp: 100 } },
    { id: 'dq_score500', name: 'High Scorer', desc: 'Score 500+ in a single run.', type: 'score', target: 500, reward: { xp: 120 } },
    { id: 'dq_skills15', name: 'Skilled Fighter', desc: 'Use skills 15 times today.', type: 'skills', target: 15, reward: { xp: 70 } },
    { id: 'dq_heal5', name: 'Stay Healthy', desc: 'Heal 5 times today.', type: 'heals', target: 5, reward: { xp: 60 } },
    { id: 'dq_runs3', name: 'Triple Threat', desc: 'Complete 3 runs today.', type: 'runs', target: 3, reward: { xp: 150 } },
    { id: 'dq_kills30', name: 'Exterminator', desc: 'Defeat 30 enemies today.', type: 'kills', target: 30, reward: { xp: 170 } },
  ];

  function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function seededPickN(seed, pool, n) {
    let s = seed;
    const arr = [...pool];
    const result = [];
    for (let i = 0; i < n && arr.length; i++) {
      s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
      const idx = Math.abs(s) % arr.length;
      result.push(arr.splice(idx, 1)[0]);
    }
    return result;
  }

  function dateSeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  }

  function refreshDailies() {
    const st = State.get();
    const today = todayString();
    if (st.daily.date !== today) {
      const picks = seededPickN(dateSeed(), DAILY_POOL, 3);
      st.daily.date = today;
      st.daily.quests = picks.map(q => ({ ...q, progress: 0 }));
      st.daily.completed = [];
      State.save();
    }
  }

  function getDailies() {
    refreshDailies();
    return State.get().daily.quests;
  }

  function getStoryChapters() { return STORY_CHAPTERS; }

  function getChapterProgress(chapter) {
    const st = State.get();
    const prog = st.progression;
    switch(chapter.type) {
      case 'runs': return { current: prog.totalRuns, target: chapter.target };
      case 'kills': return { current: prog.totalKills, target: chapter.target };
      case 'level': return { current: st.hero.level, target: chapter.target };
      case 'crits': return { current: prog.totalCrits || 0, target: chapter.target };
      case 'score': return { current: prog.bestScore, target: chapter.target };
      case 'rare_items': return { current: prog.rareItemsFound || 0, target: chapter.target };
      case 'total_items': return { current: st.hero.inventory.length + Object.values(st.hero.gear).filter(Boolean).length, target: chapter.target };
      case 'legendary_items': return { current: prog.legendaryItemsFound || 0, target: chapter.target };
      default: return { current: 0, target: chapter.target };
    }
  }

  function isChapterComplete(chapter) {
    return State.get().progression.completedChapters.includes(chapter.id);
  }

  function isChapterAvailable(chapter) {
    const prog = State.get().progression;
    return chapter.id <= prog.currentChapter;
  }

  function checkAndClaimChapter(chapter) {
    if (isChapterComplete(chapter)) return null;
    if (!isChapterAvailable(chapter)) return null;
    const prog = getChapterProgress(chapter);
    if (prog.current < prog.target) return null;

    // Claim!
    State.completeChapter(chapter.id);
    const leveled = State.addXP(chapter.reward.xp);
    if (chapter.unlock === 'mage') State.unlockClass('mage');
    if (chapter.reward.skin) State.unlockSkin(chapter.reward.skin);
    if (chapter.reward.accessory) State.unlockAccessory(chapter.reward.accessory);
    return { chapter, leveled };
  }

  function updateDailyProgress(type, amount) {
    const st = State.get();
    let changed = false;
    for (const q of st.daily.quests) {
      if (q.type === type && !st.daily.completed.includes(q.id)) {
        q.progress = Math.min((q.progress || 0) + amount, q.target);
        if (q.progress >= q.target) {
          st.daily.completed.push(q.id);
          State.addXP(q.reward.xp);
          changed = true;
        }
      }
    }
    if (changed) State.save();
    return changed;
  }

  function updateRunStats(runResult) {
    const st = State.get();
    const prog = st.progression;
    prog.totalRuns = (prog.totalRuns || 0) + 1;
    prog.totalKills = (prog.totalKills || 0) + (runResult.kills || 0);
    prog.totalCrits = (prog.totalCrits || 0) + (runResult.crits || 0);
    if (runResult.score > (prog.bestScore || 0)) prog.bestScore = runResult.score;
    if (runResult.legendaryDropped) prog.legendaryItemsFound = (prog.legendaryItemsFound || 0) + 1;
    if (runResult.rareDropped) prog.rareItemsFound = (prog.rareItemsFound || 0) + 1;
    State.save();

    // Update daily progress
    updateDailyProgress('runs', 1);
    updateDailyProgress('kills', runResult.kills || 0);
    updateDailyProgress('crits', runResult.crits || 0);
    updateDailyProgress('skills', runResult.skillsUsed || 0);
    updateDailyProgress('heals', runResult.heals || 0);
    if (runResult.score >= 500) updateDailyProgress('score', 500);

    // Check story chapters
    const claimedChapters = [];
    for (const ch of STORY_CHAPTERS) {
      const result = checkAndClaimChapter(ch);
      if (result) claimedChapters.push(result);
    }
    return claimedChapters;
  }

  return {
    getStoryChapters, getDailies, getChapterProgress,
    isChapterComplete, isChapterAvailable, checkAndClaimChapter,
    updateRunStats, updateDailyProgress, refreshDailies,
  };
})();
