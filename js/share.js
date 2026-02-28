// ===== SHARE MODULE =====
const Share = (() => {
  function showShareScreen() {
    UI.showScreen('share');
    setTimeout(renderShareCard, 100);
  }

  function renderShareCard() {
    const cv = document.getElementById('share-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const st = State.get();
    const h = st.hero;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f0620');
    bg.addColorStop(0.5, '#2d1054');
    bg.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Star particles decoration
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i++) {
      const x = (Math.sin(i * 137.5) * 0.5 + 0.5) * W;
      const y = (Math.cos(i * 97.3) * 0.5 + 0.5) * H;
      const r = 1 + Math.random() * 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    }

    // Card border glow
    ctx.save();
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    roundRect(ctx, 20, 20, W - 40, H - 40, 20);
    ctx.stroke();
    ctx.restore();

    // Card background
    ctx.fillStyle = 'rgba(30, 13, 56, 0.85)';
    roundRect(ctx, 20, 20, W - 40, H - 40, 20);
    ctx.fill();

    // Title
    ctx.font = `bold 28px 'Fredoka One', cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f3e8ff';
    ctx.fillText("Amber's Pocket Hero", W/2, 70);

    // Hero avatar
    const avatarSize = 100;
    ctx.save();
    ctx.beginPath();
    ctx.arc(W/2, 155, avatarSize/2 + 4, 0, Math.PI*2);
    ctx.fillStyle = '#a78bfa';
    ctx.fill();
    ctx.restore();

    // Draw hero avatar inline on share canvas
    const tmpCv = document.createElement('canvas');
    tmpCv.width = 100; tmpCv.height = 100;
    UI.drawAvatar(tmpCv, h.palette, h.class, 28, h.activeAccessory);
    ctx.save();
    ctx.beginPath();
    ctx.arc(W/2, 155, avatarSize/2, 0, Math.PI*2);
    ctx.clip();
    ctx.drawImage(tmpCv, W/2 - 50, 155 - 50, 100, 100);
    ctx.restore();

    // Hero name
    ctx.font = `bold 32px 'Fredoka One', cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f3e8ff';
    ctx.fillText(h.name || 'Hero', W/2, 228);

    // Class badge
    const clsLabel = h.class.charAt(0).toUpperCase() + h.class.slice(1);
    const clsColor = h.class === 'mage' ? '#818cf8' : '#a78bfa';
    ctx.fillStyle = clsColor;
    ctx.font = `bold 16px Nunito, sans-serif`;
    const clsW = ctx.measureText(`✨ ${clsLabel}`).width + 24;
    roundRect(ctx, W/2 - clsW/2, 238, clsW, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(`✨ ${clsLabel}`, W/2, 257);

    // Stats area
    const stats = State.getEffectiveStats();
    const statsY = 296;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, 50, statsY, W - 100, 80, 12);
    ctx.fill();

    ctx.font = 'bold 14px Nunito, sans-serif';
    ctx.fillStyle = '#c4b5fd';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL', W/2 - 90, statsY + 22);
    ctx.fillText('ATK', W/2, statsY + 22);
    ctx.fillText('DEF', W/2 + 90, statsY + 22);

    ctx.font = 'bold 28px Fredoka One, cursive';
    ctx.fillStyle = '#f3e8ff';
    ctx.fillText(h.level, W/2 - 90, statsY + 56);
    ctx.fillText(stats.atk, W/2, statsY + 56);
    ctx.fillText(stats.def, W/2 + 90, statsY + 56);

    // Best score
    ctx.fillStyle = 'rgba(251,191,36,0.15)';
    roundRect(ctx, 50, 398, W - 100, 50, 12);
    ctx.fill();
    ctx.font = 'bold 14px Nunito, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('⭐ BEST SCORE', W/2, 420);
    ctx.font = 'bold 22px Fredoka One, cursive';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(st.progression.bestScore || 0, W/2, 440);

    // Rarest item
    const allItems = [...h.inventory, ...Object.values(h.gear).filter(Boolean)];
    const rarityOrder = { legendary: 3, epic: 2, rare: 1, common: 0 };
    const rarestItem = allItems.sort((a,b) => rarityOrder[b.rarity] - rarityOrder[a.rarity])[0];
    if (rarestItem) {
      ctx.font = 'bold 12px Nunito, sans-serif';
      ctx.fillStyle = '#9d7fd4';
      ctx.fillText('Rarest Find', W/2, 466);
      ctx.font = 'bold 16px Nunito, sans-serif';
      const rc = { common:'#94a3b8', rare:'#60a5fa', epic:'#a78bfa', legendary:'#fbbf24' };
      ctx.fillStyle = rc[rarestItem.rarity] || '#fff';
      ctx.fillText(`${rarestItem.icon} ${rarestItem.name}`, W/2, 484);
    }

    // Footer
    const grad2 = ctx.createLinearGradient(W/2 - 80, 0, W/2 + 80, 0);
    grad2.addColorStop(0, '#a78bfa');
    grad2.addColorStop(1, '#f472b6');
    ctx.fillStyle = grad2;
    ctx.font = 'bold 18px Nunito, sans-serif';
    ctx.fillText('Made by Bryan ❤️', W/2, 506);

    // Enable share buttons
    const saveBtn = document.getElementById('btn-save-image');
    if (saveBtn) saveBtn.onclick = () => saveCard(cv);

    const shareBtn = document.getElementById('btn-share-native');
    if (navigator.share && navigator.canShare) {
      shareBtn.style.display = 'block';
      shareBtn.onclick = () => shareCard(cv);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function saveCard(cv) {
    try {
      const link = document.createElement('a');
      link.download = 'ambers-pocket-hero.png';
      link.href = cv.toDataURL('image/png');
      link.click();
      UI.toast('Image saved! 💾');
    } catch(e) {
      // Mobile fallback: open in new tab
      const w = window.open();
      if (w) { w.document.write(`<img src="${cv.toDataURL()}" style="max-width:100%">`); }
    }
  }

  async function shareCard(cv) {
    try {
      cv.toBlob(async blob => {
        const file = new File([blob], 'hero-card.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Amber's Pocket Hero", text: 'Check out my hero! Made by Bryan ❤️' });
        } else {
          saveCard(cv);
        }
      });
    } catch(e) {
      saveCard(cv);
    }
  }

  return { showShareScreen, renderShareCard };
})();
