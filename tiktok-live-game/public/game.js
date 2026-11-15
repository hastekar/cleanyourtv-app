(() => {
  'use strict';
  const CFG = window.GAME_CONFIG;
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  const W = 1080, H = 1920;
  const CX = 540, CY = 965, TILT = 0.68;       // meydan merkezi ve perspektif
  const R_IN = 165, R_OUT = 480;               // yürüyüş halkaları
  const START_A = Math.PI * 0.25;              // şavt başlangıç çizgisi (Hacerülesved hizası)
  const TAU = Math.PI * 2;
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Noto Sans", sans-serif';

  const now = () => performance.now() / 1000;
  const rand = (a, b) => a + Math.random() * (b - a);
  const tiers = [...CFG.giftTiers].sort((a, b) => a.min - b.min);

  /** @type {Map<string, any>} */
  const players = new Map();
  const crowd = [];
  const toasts = [];
  const sparks = [];
  let banner = null;        // büyük duyuru
  let nurUntil = 0;
  let status = { connected: false, text: DEMO ? 'Demo modu' : 'Sunucuya bağlanıyor…' };
  let totalTawaf = 0;

  // ---------- varlıklar ----------
  const RING_COLORS = ['#3fb6a8', '#e0a03a', '#d86a8c', '#6f9ae0', '#9a7fe0', '#62b56b', '#e07b4f'];
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  function makeWalker(extra) {
    return Object.assign({
      a: rand(0, TAU), r: rand(R_IN + 40, R_OUT), lane: 0,
      travel: 0, phase: rand(0, TAU), pace: rand(0.85, 1.15),
      dark: Math.random() < 0.3, npc: true,
    }, extra);
  }
  for (let i = 0; i < CFG.backgroundCrowd; i++) { const w = makeWalker({}); w.lane = w.r; crowd.push(w); }

  function getPlayer(user, t) {
    let p = players.get(user.id);
    if (p) { p.lastActive = t; if (user.name) p.name = user.name; return p; }
    if (players.size >= CFG.maxPlayers) {
      // en uzun süredir sessiz olanı çıkar
      let oldest = null;
      for (const q of players.values()) if (!oldest || q.lastActive < oldest.lastActive) oldest = q;
      if (oldest) players.delete(oldest.id);
    }
    const h = hashStr(user.id);
    p = makeWalker({
      id: user.id, name: user.name || user.id, npc: false,
      a: START_A + rand(0.05, 0.5), lane: rand(R_IN + 90, R_OUT - 10), r: R_OUT + 60,
      color: RING_COLORS[h % RING_COLORS.length], dark: h % 10 < 3,
      laps: 0, tawafs: 0, joinedAt: t, lastActive: t,
      goldUntil: 0, speedUntil: 0, innerUntil: 0, groupUntil: 0, group: [], img: null,
    });
    if (user.avatar) {
      const im = new Image();
      im.onload = () => { p.img = im; };
      im.src = user.avatar;
    }
    players.set(p.id, p);
    toast(`${p.name} tavafa katıldı`, '#bfe8d2');
    return p;
  }

  function toast(text, color) {
    toasts.push({ text, color: color || '#fff', t: now() });
    if (toasts.length > 4) toasts.shift();
  }
  function burst(x, y, n, color) {
    for (let i = 0; i < n; i++) sparks.push({ x, y, vx: rand(-90, 90), vy: rand(-190, -40), t: now(), life: rand(0.7, 1.5), color });
  }

  // ---------- olaylar ----------
  function onEvent(ev) {
    const t = now();
    if (ev.type === 'status') { status = ev; return; }
    if (!ev.user || !ev.user.id) return;
    if (ev.type === 'chat') {
      const kw = (CFG.joinKeyword || '').toLocaleLowerCase('tr');
      if (kw && !players.has(ev.user.id) && !(ev.comment || '').toLocaleLowerCase('tr').includes(kw)) return;
      getPlayer(ev.user, t);
    } else if (ev.type === 'like') {
      const p = getPlayer(ev.user, t);
      p.speedUntil = Math.max(p.speedUntil, t) + Math.min(10, 2 + (ev.likes || 1) * 0.3);
    } else if (ev.type === 'follow' || ev.type === 'share') {
      const p = getPlayer(ev.user, t);
      p.goldUntil = Math.max(p.goldUntil, t) + 45;
      toast(`${p.name} ${ev.type === 'follow' ? 'takip etti' : 'yayını paylaştı'} · altın isim`, '#ffd97a');
    } else if (ev.type === 'gift') {
      const p = getPlayer(ev.user, t);
      const coins = ev.coins || 1;
      let tier = tiers[0];
      for (const g of tiers) if (coins >= g.min) tier = g;
      applyTier(p, tier, t);
      toast(`${tier.icon} ${p.name} → ${tier.label}`, '#ffd97a');
    }
  }

  function applyTier(p, tier, t) {
    const add = (k) => { p[k] = Math.max(p[k], t) + tier.seconds; };
    const pos = project(p);
    burst(pos.x, pos.y - 60, 14, '#ffd97a');
    add('goldUntil');                                  // her hediye altın isim verir
    if (tier.effect === 'speed') add('speedUntil');
    if (tier.effect === 'inner' || tier.effect === 'group' || tier.effect === 'nur') add('innerUntil');
    if (tier.effect === 'group' || tier.effect === 'nur') {
      add('groupUntil');
      if (p.group.length < 8) {
        for (let i = p.group.length; i < 8; i++) {
          p.group.push(makeWalker({ dA: (Math.floor(i / 2) + 1) * 0.085 * (i % 2 ? 1 : -1) + rand(-0.02, 0.02), dR: rand(-26, 26), dark: i % 3 === 0, r: p.r, a: p.a }));
        }
      }
    }
    if (tier.effect === 'nur') {
      nurUntil = Math.max(nurUntil, t) + tier.seconds;
      add('speedUntil');
      banner = { title: p.name, sub: 'meydana nur yağdırdı ✨', t, life: 7 };
    }
  }

  // ---------- simülasyon ----------
  function project(o) { return { x: CX + Math.cos(o.a) * o.r, y: CY + Math.sin(o.a) * o.r * TILT }; }

  function stepWalker(w, dt, speedMul) {
    const lin = (TAU * 340 / CFG.lapSeconds) * w.pace * speedMul;   // px/sn (340 = orta halka)
    const dA = (lin / Math.max(w.r, 120)) * dt;
    w.a -= dA;                                                     // saat yönünün tersine
    w.travel += dA;
    w.phase += dt * 7 * speedMul;
    w.r += (w.lane - w.r) * Math.min(1, dt * 0.9);
  }

  function update(dt, t) {
    const nur = t < nurUntil;
    for (const w of crowd) stepWalker(w, dt, nur ? 1.35 : 1);
    for (const p of players.values()) {
      if (t - p.lastActive > CFG.idleMinutes * 60) { players.delete(p.id); continue; }
      const inner = t < p.innerUntil;
      if (inner && !p.innerLane) p.innerLane = rand(R_IN + 8, R_IN + 70);
      if (!inner) p.innerLane = 0;
      const lane = p.lane; p.lane = inner ? p.innerLane : lane;
      const before = Math.floor(p.travel / TAU);
      stepWalker(p, dt, (t < p.speedUntil ? 2.1 : 1) * (nur ? 1.35 : 1));
      p.lane = lane;
      const after = Math.floor(p.travel / TAU);
      if (after > before) {
        p.laps++;
        if (p.laps % CFG.lapsPerTawaf === 0) {
          p.tawafs++; totalTawaf++;
          const pos = project(p);
          burst(pos.x, pos.y - 60, 40, '#8fe3b4');
          toast(`🕋 ${p.name} tavafını tamamladı`, '#8fe3b4');
          if (!banner || t - banner.t > banner.life) banner = { title: p.name, sub: `${p.tawafs}. tavafını tamamladı · Allah kabul etsin`, t, life: 5 };
        }
      }
      if (t > p.groupUntil) p.group.length = 0;
      for (const g of p.group) {
        g.a = p.a + g.dA * (340 / Math.max(p.r, 150));
        g.r = Math.max(R_IN + 4, p.r + g.dR);
        g.phase += dt * 7;
      }
    }
  }

  // ---------- çizim ----------
  function ellipse(r, fill, stroke, lw) {
    ctx.beginPath(); ctx.ellipse(CX, CY, r, r * TILT, 0, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  function drawGround(t) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0f16'); bg.addColorStop(0.45, '#101a22'); bg.addColorStop(1, '#07090d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    ellipse(R_OUT + 95, '#1b2a30');                       // revak gölgesi
    ellipse(R_OUT + 70, '#c9bfa8');
    const g = ctx.createRadialGradient(CX, CY, 60, CX, CY, R_OUT + 60);
    g.addColorStop(0, '#fbf7ee'); g.addColorStop(1, '#e4dccb');
    ctx.save(); ctx.translate(0, CY * (1 - TILT)); ctx.scale(1, TILT);
    ctx.beginPath(); ctx.arc(CX, CY, R_OUT + 45, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    for (let r = R_IN + 35; r < R_OUT + 40; r += 58) ellipse(r, null, 'rgba(150,135,105,0.28)', 2);
    for (let i = 0; i < 24; i++) {                        // mermer derzleri
      const a = (i / 24) * TAU;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * (R_IN - 20), CY + Math.sin(a) * (R_IN - 20) * TILT);
      ctx.lineTo(CX + Math.cos(a) * (R_OUT + 45), CY + Math.sin(a) * (R_OUT + 45) * TILT);
      ctx.strokeStyle = 'rgba(150,135,105,0.13)'; ctx.lineWidth = 2; ctx.stroke();
    }
    // başlangıç çizgisi
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(START_A) * 120, CY + Math.sin(START_A) * 120 * TILT);
    ctx.lineTo(CX + Math.cos(START_A) * (R_OUT + 45), CY + Math.sin(START_A) * (R_OUT + 45) * TILT);
    ctx.strokeStyle = `rgba(40,170,110,${0.55 + 0.2 * Math.sin(t * 2)})`; ctx.lineWidth = 7; ctx.stroke();
  }

  function drawKaaba(t) {
    const w = 104, d = w * TILT, h = 190, y0 = CY;
    const L = [CX - w, y0], R = [CX + w, y0], F = [CX, y0 + d], B = [CX, y0 - d];
    const up = (p, k) => [p[0], p[1] - h * k];
    const poly = (pts, fill) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    ctx.beginPath(); ctx.ellipse(CX + 20, y0 + 14, w * 1.25, d * 1.1, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
    poly([L, F, up(F, 1), up(L, 1)], '#15161a');
    poly([F, R, up(R, 1), up(F, 1)], '#0c0d10');
    poly([up(L, 1), up(F, 1), up(R, 1), up(B, 1)], '#22242a');
    // altın kuşak
    const band = (A, Bp) => poly([up(A, 0.74), up(Bp, 0.74), up(Bp, 0.62), up(A, 0.62)], '#c9a441');
    band(L, F); band(F, R);
    ctx.strokeStyle = 'rgba(60,45,10,0.55)'; ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      for (const [A, Bp] of [[L, F], [F, R]]) {
        const x = A[0] + (Bp[0] - A[0]) * i / 6, y = A[1] + (Bp[1] - A[1]) * i / 6;
        ctx.beginPath(); ctx.moveTo(x, y - h * 0.72); ctx.lineTo(x, y - h * 0.64); ctx.stroke();
      }
    }
    // kapı (sağ yüz)
    const k = (s, v) => [F[0] + (R[0] - F[0]) * s, F[1] + (R[1] - F[1]) * s - h * v];
    poly([k(0.2, 0.08), k(0.52, 0.08), k(0.52, 0.5), k(0.2, 0.5)], '#d8b24a');
    poly([k(0.25, 0.11), k(0.47, 0.11), k(0.47, 0.46), k(0.25, 0.46)], '#b88f2e');
    // taban şeridi
    poly([L, F, up(F, 0.05), up(L, 0.05)], '#8d8676'); poly([F, R, up(R, 0.05), up(F, 0.05)], '#7c7566');
    if (t < nurUntil) {
      const gl = ctx.createRadialGradient(CX, y0 - h, 10, CX, y0 - h, 420);
      gl.addColorStop(0, 'rgba(255,236,170,0.55)'); gl.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = gl; ctx.fillRect(CX - 430, y0 - h - 430, 860, 860);
    }
  }

  function drawWalker(w, t, x, y) {
    const s = 0.78 + 0.34 * ((y - (CY - R_OUT * TILT)) / (2 * R_OUT * TILT));
    const bob = Math.abs(Math.sin(w.phase)) * 3 * s;
    const sway = Math.sin(w.phase) * 2.2 * s;
    const gold = !w.npc && t < w.goldUntil;
    ctx.beginPath(); ctx.ellipse(x, y, 15 * s, 6 * s, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
    // gövde
    const bw = 13 * s, bh = 40 * s, by = y - bob;
    ctx.beginPath();
    ctx.moveTo(x - bw + sway, by); ctx.lineTo(x + bw + sway, by);
    ctx.quadraticCurveTo(x + bw * 0.9, by - bh * 0.7, x + bw * 0.55, by - bh);
    ctx.lineTo(x - bw * 0.55, by - bh);
    ctx.quadraticCurveTo(x - bw * 0.9, by - bh * 0.7, x - bw + sway, by);
    ctx.fillStyle = w.dark ? '#23252b' : '#f6f4ee'; ctx.fill();
    ctx.strokeStyle = w.dark ? '#0e0f12' : '#bdb6a6'; ctx.lineWidth = 1.5; ctx.stroke();
    const hy = by - bh - (w.npc ? 7 : 13) * s;
    if (w.npc) {
      ctx.beginPath(); ctx.arc(x, hy, 8.5 * s, 0, TAU); ctx.fillStyle = w.dark ? '#23252b' : '#efe9dc'; ctx.fill();
      ctx.beginPath(); ctx.arc(x - 1.5 * s, hy + 1.5 * s, 5 * s, 0, TAU); ctx.fillStyle = '#c99b78'; ctx.fill();
      return;
    }
    // oyuncu: avatar başlık
    const hr = 17 * s;
    if (gold) {
      ctx.beginPath(); ctx.arc(x, hy, hr + 9 + Math.sin(t * 5) * 2, 0, TAU); ctx.fillStyle = 'rgba(255,205,80,0.35)'; ctx.fill();
    }
    ctx.save(); ctx.beginPath(); ctx.arc(x, hy, hr, 0, TAU); ctx.clip();
    if (w.img) ctx.drawImage(w.img, x - hr, hy - hr, hr * 2, hr * 2);
    else {
      ctx.fillStyle = w.color; ctx.fillRect(x - hr, hy - hr, hr * 2, hr * 2);
      ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(hr * 1.15)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((w.name[0] || '?').toLocaleUpperCase('tr'), x, hy + 1);
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, hy, hr, 0, TAU); ctx.strokeStyle = gold ? '#ffcf4d' : '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    w._lx = x; w._ly = hy - hr - 8;
  }

  function drawLabel(p, t) {
    const gold = t < p.goldUntil;
    const lap = p.laps % CFG.lapsPerTawaf;
    const name = p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name;
    const txt = `${name} · ${lap}/${CFG.lapsPerTawaf}`;
    ctx.font = `700 ${gold ? 24 : 20}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(8,12,16,0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(txt, p._lx, p._ly);
    ctx.fillStyle = gold ? '#ffd766' : '#ffffff'; ctx.fillText(txt, p._lx, p._ly);
  }

  function panel(x, y, w, h) {
    rrect(x, y, w, h, 18); ctx.fillStyle = 'rgba(10,18,24,0.82)'; ctx.fill();
    ctx.strokeStyle = 'rgba(201,164,65,0.45)'; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawHud(t) {
    ctx.textBaseline = 'middle';
    // başlık
    ctx.textAlign = 'center'; ctx.font = `800 46px ${FONT}`; ctx.fillStyle = '#e9c96a';
    ctx.fillText(`🕋 ${CFG.title}`, CX, 215);
    ctx.font = `600 26px ${FONT}`; ctx.fillStyle = '#cfd8dc';
    ctx.fillText(`${players.size} kişi tavafta · ${totalTawaf} tavaf tamamlandı`, CX, 262);

    // sıralama
    const top = [...players.values()].sort((a, b) => b.laps - a.laps).slice(0, 5);
    panel(24, 300, 500, 262);
    ctx.textAlign = 'left'; ctx.font = `800 24px ${FONT}`; ctx.fillStyle = '#e9c96a';
    ctx.fillText('EN ÇOK ŞAVT', 46, 330);
    ctx.font = `600 25px ${FONT}`;
    top.forEach((p, i) => {
      const y = 372 + i * 40;
      ctx.fillStyle = i === 0 ? '#ffd766' : '#eef2f3'; ctx.textAlign = 'left';
      const nm = p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name;
      ctx.fillText(`${i + 1}.  ${nm}`, 46, y);
      ctx.textAlign = 'right'; ctx.fillText(String(p.laps), 500, y);
    });
    if (!top.length) { ctx.fillStyle = '#8a979d'; ctx.fillText('İlk katılan sen ol!', 46, 372); }

    // hediye etkileri
    panel(556, 300, 500, 262);
    ctx.textAlign = 'left'; ctx.font = `800 24px ${FONT}`; ctx.fillStyle = '#e9c96a';
    ctx.fillText('HEDİYE ETKİLERİ', 578, 330);
    ctx.font = `600 25px ${FONT}`;
    tiers.slice(0, 5).forEach((g, i) => {
      const y = 372 + i * 40;
      ctx.textAlign = 'left'; ctx.fillStyle = '#eef2f3'; ctx.fillText(`${g.icon}  ${g.label}`, 578, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffd766'; ctx.fillText(`${g.min}+ jeton`, 1034, y);
    });

    // katılım çağrısı
    const hw = 560, hy = 1410;
    rrect(CX - hw / 2, hy - 34, hw, 68, 34); ctx.fillStyle = 'rgba(10,18,24,0.88)'; ctx.fill();
    ctx.strokeStyle = '#2aa870'; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = `700 32px ${FONT}`; ctx.fillStyle = '#ffffff';
    ctx.fillText(`💬 ${CFG.joinHint}`, CX, hy + 2);
    ctx.font = `600 22px ${FONT}`; ctx.fillStyle = '#9fb0b6';
    ctx.fillText('❤️ Beğen: kısa hızlanma  ·  ➕ Takip et / paylaş: altın isim', CX, hy + 66);

    // bildirimler
    let ty = 610;
    for (const m of toasts) {
      const age = t - m.t; if (age > 6) continue;
      const al = Math.min(1, age * 4) * Math.min(1, (6 - age) * 2);
      ctx.globalAlpha = al; ctx.font = `700 26px ${FONT}`;
      const tw = ctx.measureText(m.text).width + 44;
      rrect(CX - tw / 2, ty - 22, tw, 44, 22); ctx.fillStyle = 'rgba(10,18,24,0.85)'; ctx.fill();
      ctx.fillStyle = m.color; ctx.fillText(m.text, CX, ty + 1);
      ctx.globalAlpha = 1; ty += 52;
    }

    // büyük duyuru
    if (banner && t - banner.t < banner.life) {
      const age = t - banner.t, al = Math.min(1, age * 3) * Math.min(1, (banner.life - age) * 2);
      ctx.globalAlpha = al;
      rrect(90, 1200, 900, 120, 26); ctx.fillStyle = 'rgba(14,60,44,0.94)'; ctx.fill();
      ctx.strokeStyle = '#e9c96a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = `800 42px ${FONT}`; ctx.fillStyle = '#ffd766'; ctx.fillText(banner.title.slice(0, 24), CX, 1240);
      ctx.font = `600 27px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.fillText(banner.sub, CX, 1286);
      ctx.globalAlpha = 1;
    }

    // bağlantı durumu (yalnızca bağlı değilken)
    if (!status.connected && !DEMO) {
      ctx.font = `600 22px ${FONT}`; ctx.fillStyle = '#ff9a8a'; ctx.textAlign = 'center';
      ctx.fillText(`● ${status.text}`, CX, 1530);
    }
  }

  function drawNur(t) {
    if (t >= nurUntil) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const sx = (i * 197.3) % W, sp = 150 + (i * 37) % 130;
      const y = 560 + ((t * sp + i * 91) % 720);
      ctx.beginPath(); ctx.arc(sx + Math.sin(t + i) * 18, y, 3 + (i % 3), 0, TAU);
      ctx.fillStyle = 'rgba(255,225,140,0.75)'; ctx.fill();
    }
    ctx.restore();
  }

  function draw(t) {
    drawGround(t);
    const list = [];
    const push = (w) => { const p = project(w); list.push({ w, x: p.x, y: p.y }); };
    crowd.forEach(push);
    for (const p of players.values()) { push(p); p.group.forEach(push); }
    list.push({ kaaba: true, y: CY + 104 * TILT });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.kaaba ? drawKaaba(t) : drawWalker(e.w, t, e.x, e.y);

    // etiketler: altın isimliler + en son etkileşenler (kalabalıkta okunaklı kalsın)
    const labelled = [...players.values()].filter(p => p._lx !== undefined)
      .sort((a, b) => (t < b.goldUntil) - (t < a.goldUntil) || b.lastActive - a.lastActive).slice(0, 36)
      .sort((a, b) => a._ly - b._ly);
    for (const p of labelled) drawLabel(p, t);

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i], age = t - s.t;
      if (age > s.life) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - age / s.life;
      ctx.beginPath(); ctx.arc(s.x + s.vx * age, s.y + s.vy * age + 160 * age * age, 5, 0, TAU); ctx.fillStyle = s.color; ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawNur(t);
    drawHud(t);
  }

  let last = now();
  function frame() {
    const t = now(), dt = Math.min(0.1, t - last); last = t;
    update(dt, t); draw(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- bağlantı ----------
  function connect() {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
    ws.onmessage = (m) => { try { onEvent(JSON.parse(m.data)); } catch (e) { console.error(e); } };
    ws.onclose = () => { status = { connected: false, text: 'Sunucu bağlantısı yok, yeniden deneniyor…' }; setTimeout(connect, 3000); };
  }

  // ---------- demo / test ----------
  const NAMES = ['Emir', 'Hilal', 'Zeynep', 'Ahmet', 'Ayşe', 'Mehmet Ali', 'Fatma', 'Yusuf', 'Elif', 'Ömer', 'Meryem', 'Halit', 'Esma', 'Ceren', 'Mustafa', 'Hatice', 'İbrahim', 'Sümeyye', 'Bilal', 'Rabia', 'Hamza', 'Büşra', 'Enes', 'Kübra', 'Yağmur'];
  function fakeUser() {
    const n = NAMES[Math.floor(Math.random() * NAMES.length)] + (Math.random() < 0.5 ? '' : Math.floor(rand(1, 99)));
    return { id: n, name: n, avatar: '' };
  }
  function randomExisting() { const a = [...players.values()]; return a.length ? { id: a[Math.floor(Math.random() * a.length)].id } : fakeUser(); }
  function fakeGift(coins) { onEvent({ type: 'gift', user: Math.random() < 0.6 ? randomExisting() : fakeUser(), coins }); }

  if (DEMO) {
    for (let i = 0; i < 25; i++) { const p = getPlayer(fakeUser(), now()); p.travel = rand(0, TAU * 6); p.laps = Math.floor(p.travel / TAU); p.a = START_A - p.travel; p.r = p.lane; }
    toasts.length = 0;
    setInterval(() => {
      const x = Math.random();
      if (x < 0.45) onEvent({ type: 'chat', user: fakeUser(), comment: 'Tavafa katıl' });
      else if (x < 0.7) onEvent({ type: 'like', user: randomExisting(), likes: 5 });
      else if (x < 0.86) fakeGift(1);
      else if (x < 0.93) fakeGift(5);
      else if (x < 0.97) fakeGift(20);
      else if (x < 0.993) fakeGift(99);
      else fakeGift(500);
    }, 1500);
  } else {
    connect();
  }

  // Yayın öncesi test tuşları: J = katılım, 1-5 = hediye kademeleri
  addEventListener('keydown', (e) => {
    if (e.key === 'j' || e.key === 'J') onEvent({ type: 'chat', user: fakeUser(), comment: 'katıl' });
    const i = '12345'.indexOf(e.key);
    if (i >= 0 && tiers[i]) fakeGift(tiers[i].min);
  });
  window.__game = { onEvent, players };
})();
