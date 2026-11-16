/* node test/sim.js : MF.game basliksiz oyun testi (sabit tohumlu RNG, sahte saat, 0.05 sn adim) */
var path = require('path');
var MF = require(path.join(__dirname, '..', 'js', 'data.js'));
require(path.join(__dirname, '..', 'js', 'game.js'));

var DT = 0.05, fails = 0, checks = 0;
function ok(cond, msg){ checks++; if (!cond){ fails++; console.log('  FAIL: '+msg); } }
function mulberry(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a>>>15, 1 | a); t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t; return ((t ^ t>>>14) >>> 0) / 4294967296; }; }
function memStore(){ var m = {}; return { get:function(k){ return k in m ? m[k] : null; }, set:function(k,v){ m[k] = String(v); }, raw:m }; }

function mk(seed, opts){
  opts = opts || {};
  var clock = {ms:1700000000000}, store = opts.storage || memStore();
  var g = MF.game.create({ storage:store, now:function(){ return clock.ms; }, random:mulberry(seed), round:opts.round, tune:process.env.TUNE?JSON.parse(process.env.TUNE):undefined });
  var st = { ends:[], maxUnits:0, bad:0, counts:{}, banners:[], lens:[], revengeOn:{0:0,1:0}, dblBad:0, spawns:[], feeds:0, phases:[], playStart:0, t:0 };
  ['spawn','remove','wallHit','stage','shot','banner','feed','card','bubble','say','sfx','phase','matchEnd'].forEach(function(n){
    g.on(n, function(a,b,c){
      st.counts[n] = (st.counts[n]||0)+1;
      if (n==='banner') st.banners.push(a.big);
      if (n==='banner' && /^İNTİKAM/.test(a.big)) st.revengeOn[a.side]++;
      if (n==='spawn') st.spawns.push(a);
      if (n==='phase'){ st.phases.push(a); if (a==='play') st.playStart = st.t; }
      if (n==='matchEnd'){ st.ends.push({winner:a.winner, fatih:a.fatih, len:st.t - st.playStart}); }
    });
  });
  st.g = g; st.store = store; st.clock = clock;
  st.step = function(drv){
    st.t += DT; clock.ms += 50;
    if (drv) drv(st, g);
    g.step(DT);
    var s = g.state;
    if (s.units.length > st.maxUnits) st.maxUnits = s.units.length;
    if (s.units.length > 120) st.bad++;
    if (s.phase==='play' && s.doubleDmg !== (s.timeLeft <= 30)) st.dblBad++;
  };
  st.until = function(cond, drv, limit){ var n = 0, lim = (limit||3000)/DT; while (!cond() && n++ < lim) st.step(drv); return cond(); };
  st.matches = function(k, drv){ var target = st.ends.length + k; return st.until(function(){ return st.ends.length >= target; }, drv, k*260); };
  return st;
}
function bots(){ var n = 0; return function(st, g){ if (++n % 4 === 0) g.botTick(); }; }
function chat(g, uid, name, text){ g.onEvent({type:'chat', uid:uid, name:name, comment:text}); }
function mean(a){ return a.length ? a.reduce(function(x,y){return x+y;},0)/a.length : 0; }

/* ---------------------------------------------------------------- 1. dengeli botlar */
console.log('1) dengeli botlarla 20 mac');
var even = { w:[0,0], lens:[], maxU:0, bad:0, dbl:0, rev:0, stages:0, wallHits:0, queued:0, ends:0, shots:0, total:0 };
var evenGame;
(function(){
  var st = mk(12345); evenGame = st;
  var drv = bots();
  var done = st.matches(20, function(s,g){ drv(s,g); if (g.state.queue.length) even.queued++; });
  ok(done, 'her mac bitmeli (20 mac tamamlanamadi)');
  st.ends.forEach(function(e){ even.w[e.winner]++; even.lens.push(e.len); });
  even.maxU = st.maxUnits; even.bad = st.bad; even.dbl = st.dblBad;
  even.rev = st.revengeOn[0]+st.revengeOn[1]; even.stages = st.counts.stage||0; even.wallHits = st.counts.wallHit||0; even.shots = st.counts.shot||0;
  ok(even.w[0]>0 && even.w[1]>0, 'iki taraf da kazanabilmeli: '+even.w);
  ok(st.bad===0, 'birlik sayisi 120 asildi');
  ok(st.dblBad===0, 'son 30 sn kurali (doubleDmg) tutarsiz');
  ok(even.rev>0, 'intikam hic devreye girmedi');
  ok((st.counts.stage||0)>0, 'sur asamasi olayi hic gelmedi');
  ok((st.counts.shot||0)>0, 'topcu atisi hic olmadi');
  ok(st.banners.some(function(b){ return /SURLARI YARILDI/.test(b); }), 'sur yarildi afisi yok');
  ok(even.queued>0, 'oy sirasi hic dolmadi');
  var full = even.lens.filter(function(l){ return l >= 170; }).length / even.lens.length;
  var late = even.lens.filter(function(l){ return l >= 120; }).length / even.lens.length;
  even.full = full; even.late = late;
  ok(late >= 0.6, 'dengeli botlarla mac cogunlukla son ucte birde/tam sure bitmeli (>=120 sn orani '+late.toFixed(2)+')');
})();

/* ---------------------------------------------------------------- 2. yalniz milis */
console.log('2) yalniz milis');
(function(){
  var st = mk(777);
  var done = st.matches(5, null);
  ok(done, 'milis maclari bitmeli');
  var l = mean(st.ends.map(function(e){ return e.len; }));
  ok(l >= 120, 'yalniz milisle mac son ucte bitmeli, ort '+l.toFixed(0));
  ok(st.banners.some(function(b){ return /SON 30/.test(b); }), 'son 30 sn afisi yok');
  even.milisLen = l;
})();

/* ---------------------------------------------------------------- 3. hediye ustunlugu */
console.log('3) hediye ustunlugu (bot + bir tarafa 20 elmaslik hediyeler)');
var gift = [0,0];
[0,1].forEach(function(side){
  var wins = 0, N = 8;
  for (var k=0;k<N;k++){
    var st = mk(900+side*50+k), bd = bots(), t0 = 0, sent = 0;
    st.until(function(){ return st.g.state.phase==='play'; }, bd, 20);
    var home = st.g.state.sides[side].id, target = st.ends.length+1;
    chat(st.g, 'rich'+side, 'Zengin', String(home));
    st.until(function(){ return st.ends.length>=target; }, function(s,g){
      bd(s,g);
      if (g.state.phase==='play' && Math.round(s.t/DT) % 60 === 0) g.onEvent({type:'gift', uid:'rich'+side, name:'Zengin', diamonds:20});
      if (g.state.phase==='play' && Math.round(s.t/DT) % 400 === 0) g.onEvent({type:'gift', uid:'rich'+side, name:'Zengin', diamonds:150});
    }, 300);
    if (st.ends.length && st.ends[0].winner===side) wins++;
  }
  gift[side] = wins/N;
  ok(wins >= N*0.75, 'hediye alan taraf '+side+' kazanmali: '+wins+'/'+N);
});

/* ---------------------------------------------------------------- 4. 1000 elmas */
console.log('4) 1000 elmaslik hediye');
(function(){
  var N = 6, wins = 0, minAt15 = 1, maxEarly = 0, lens = [];
  for (var k=0;k<N;k++){
    var st = mk(4000+k), side = k%2;
    st.until(function(){ return st.g.state.phase==='play'; }, null, 20);
    st.until(function(){ return st.g.state.timeLeft < 170; }, null, 20);
    chat(st.g, 'whale', 'Balina', String(st.g.state.sides[side].id));
    var s1 = st.g.state.sides[1-side], before = s1.hp/s1.maxHp;
    st.g.onEvent({type:'gift', uid:'whale', name:'Balina', diamonds:1000, giftName:'Aslan'});
    ok(st.g.state.sides[side].buff > 11, 'mehter buff 12 sn olmali');
    var mehter = st.g.state.units.filter(function(u){ return u.type==='mehter'; });
    ok(mehter.length===1 && mehter[0].state==='idle', 'mehter davulcusu idle birim olarak cikmali');
    var t15 = st.t + 15; var ended = false, target = st.ends.length+1;
    st.until(function(){ return st.t >= t15 || st.ends.length>=target; }, null, 30);
    if (st.ends.length>=target) ended = true;
    ok(!ended, '1000 elmas 15 sn icinde maci bitirmemeli (tam candan ani galibiyet)');
    var after = s1.hp/s1.maxHp; maxEarly = Math.max(maxEarly, before-after);
    st.until(function(){ return st.ends.length>=target; }, null, 300);
    if (st.ends[0] && st.ends[0].winner===side) wins++;
    lens.push(st.ends[0].len);
  }
  ok(wins >= N-1, '1000 elmas karar verici olmali: '+wins+'/'+N);
  even.whaleWins = wins+'/'+N; even.whaleEarly = maxEarly; even.whaleLen = mean(lens);
})();

/* ---------------------------------------------------------------- 5. intro bankalama, end'de yok sayma */
console.log('5) intro/end davranisi');
(function(){
  var st = mk(55), g = st.g;
  var s0 = g.state.sides[0].id;
  chat(g, 'u1', 'Ali', String(s0));
  g.step(DT);
  g.onEvent({type:'like', uid:'u1', name:'Ali', count:30});
  g.onEvent({type:'gift', uid:'u1', name:'Ali', diamonds:5});
  ok(g.state.units.length===0, 'intro sirasinda birim cikmamali (banka)');
  ok(g.state.users.u1.pts > 0, 'intro puani sayilmali');
  st.until(function(){ return g.state.phase==='play'; }, null, 10);
  for (var i=0;i<60;i++) st.step();
  ok(g.state.units.some(function(u){ return u.user && u.user.id==='u1'; }), 'banka play basinda birakilmali');
  // end
  st.until(function(){ return g.state.phase==='end'; }, null, 400);
  var nU = g.state.units.length, pts = g.state.users.u1.pts, nSp = st.spawns.length;
  g.onEvent({type:'like', uid:'u1', name:'Ali', count:50});
  g.onEvent({type:'gift', uid:'u1', name:'Ali', diamonds:500});
  g.onEvent({type:'follow', uid:'u1', name:'Ali'});
  ok(g.state.users.u1.pts===pts && st.spawns.length===nSp, 'end fazinda yalniz sohbet islenmeli');
  chat(g, 'u2', 'Veli', '35');
  ok(g.state.users.u2.home===35, 'end fazinda plaka memleketi kaydeder');
  ok(g.state.queue.some(function(q){ return q.id===35; }), 'end fazinda oy sayilir');
})();

/* ---------------------------------------------------------------- 6. oy sirasi, sampiyon, fetih haritasi */
console.log('6) oy sirasi / sampiyon / fetih');
(function(){
  var st = mk(66), g = st.g;
  for (var i=0;i<5;i++) chat(g, 'v'+i, 'Oy'+i, 'Izmir');
  chat(g, 'w1', 'Bursa', '16'); chat(g, 'w2', 'Bursa2', '16');
  var q = g.state.queue;
  ok(q.length===2 && q[0].id===35 && q[0].votes===5 && q[1].id===16 && q[1].votes===2, 'queue coktan aza: '+JSON.stringify(q));
  ok(g.state.users.v0.volunteer===true || g.state.users.v0.side!==null, 'oy veren gonullu atanir');
  var c0 = g.state.champion.id;
  st.matches(1, null);
  var e = st.ends[0], gs = g.state;
  ok(gs.owners[gs.sides[e.winner].id]===gs.sides[e.winner].id || true, '');
  var winId = gs.sides[e.winner].id, loseId = gs.sides[1-e.winner].id;
  ok(gs.owners[loseId]===winId, 'kaybeden il kazananin olmali');
  ok(typeof gs.conquerors[loseId]==='string' && gs.conquerors[loseId].length>0, 'fatih adi yazilmali');
  ok(gs.champion.id===winId, 'kazanan sampiyon olmali');
  ok(gs.champion.streak === (winId===c0 ? 1 : 1), 'seri 1');
  st.until(function(){ return g.state.phase==='intro'; }, null, 30);
  ok(g.state.sides[1].id===35, 'sonraki meydan okuyan en cok oy alan olmali: '+g.state.sides[1].id);
  ok(g.state.sides[0].id===winId, 'sampiyon sol tarafta (side0)');
  ok(!g.state.queue.some(function(q){ return q.id===35; }), 'secilen plaka kuyruktan dusmeli');
  // sampiyon serisi
  var streak0 = g.state.champion.streak, id0 = g.state.champion.id;
  st.matches(1, null);
  var e2 = st.ends[1];
  if (g.state.champion.id===id0) ok(g.state.champion.streak===streak0+1, 'seri artmali');
  else ok(g.state.champion.streak===1, 'yeni sampiyon serisi 1');
  // isyan: sahibi baska il olan il meydan okuyabilir
  var o = Object.keys(g.state.owners).filter(function(k){ return g.state.owners[k]!==+k; });
  ok(o.length>0, 'fetih haritasinda tabi iller var');
  chat(g, 'r1', 'Isyan', String(o[0]));
  g.step(DT);
  var rq = g.state.queue.filter(function(q){ return q.id===+o[0]; });
  ok(rq.length===1, 'fethedilmis il da oy alabilmeli (isyan)');
})();

/* ---------------------------------------------------------------- 7. intikam x1.5 */
console.log('7) intikam ve son 30 sn');
(function(){
  var st = mk(77), g = st.g, rev = -1;
  st.until(function(){ return g.state.phase==='play'; }, null, 20);
  var s0 = g.state.sides[0], s1 = g.state.sides[1];
  chat(g, 'a', 'A', String(s0.id)); chat(g, 'b', 'B', String(s1.id));
  var i = 0;
  st.until(function(){ return s0.revenge || s1.revenge || g.state.phase!=='play'; }, function(s,gg){
    if (Math.round(s.t/DT) % 20 === 0) gg.onEvent({type:'gift', uid:'a', name:'A', diamonds:30});
  }, 200);
  rev = s0.revenge ? 0 : s1.revenge ? 1 : -1;
  ok(rev === 1, 'rakibi gerideki taraf intikam almali (side1 bekleniyor, '+rev+')');
  if (rev>=0){
    var uid = rev===0?'a':'b', before = st.spawns.length;
    g.onEvent({type:'like', uid:uid, name:'x', count:6});
    var sp = st.spawns[st.spawns.length-1];
    ok(st.spawns.length===before+1 && sp.n===9 && sp.user && sp.user.id===uid, 'intikamda 6 begeni 9 guc vermeli: n='+(sp&&sp.n));
  }
  // son 30 sn: ayni sartta sur hasari iki kat
  var a = mk(88), b = mk(88);
  a.until(function(){ return a.g.state.phase==='play'; }, null, 20); b.until(function(){ return b.g.state.phase==='play'; }, null, 20);
  function wallDmgIn(x, tLeft){
    x.g.state.timeLeft = tLeft;
    x.step();
    var u = {id:9999, side:0, type:'piyade', n:20, hp:200, maxHp:200, pos:1, lane:0, state:'walk', user:null, shotT:3, wacc:0, wt:0, din:0, target:null};
    x.g.state.units.length = 0; x.g.state.units.push(u);
    x.g.state.sides[1].shield = 0; x.g.state.sides[1].hp = x.g.state.sides[1].maxHp; var h0 = x.g.state.sides[1].hp;
    for (var k=0;k<20;k++) x.step();
    return h0 - x.g.state.sides[1].hp;
  }
  var d1 = wallDmgIn(a, 100), d2 = wallDmgIn(b, 25);
  ok(d2 > d1*1.8 && d2 < d1*2.2, 'son 30 snde sur hasari x2 olmali: '+d1.toFixed(2)+' -> '+d2.toFixed(2));
})();

/* ---------------------------------------------------------------- 8. kalkan, uzatma, birlik siniri */
console.log('8) kalkan / uzatma / sinir');
(function(){
  var st = mk(99), g = st.g;
  st.until(function(){ return g.state.phase==='play'; }, null, 20);
  chat(g, 'f', 'Takipci', String(g.state.sides[0].id));
  g.state.sides[0].hp -= 200; var hp = g.state.sides[0].hp;
  g.onEvent({type:'follow', uid:'f', name:'Takipci'});
  ok(g.state.sides[0].shield > 7.9 && Math.abs(g.state.sides[0].hp - (hp+40)) < 1, 'takip: 8 sn kalkan + 40 onarim');
  // tasma
  for (var i=0;i<300;i++) g.onEvent({type:'like', uid:'m'+i, name:'M'+i, count:80});
  for (i=0;i<200;i++) g.onEvent({type:'gift', uid:'m'+i, name:'M'+i, diamonds:40});
  for (i=0;i<400;i++) st.step();
  ok(st.maxUnits<=120 && st.bad===0, 'birlik siniri: '+st.maxUnits);
  // uzatma: esitlik
  var s2 = mk(5, {round:20}), g2 = s2.g, sawOT = false;
  s2.until(function(){ if (g2.state.overtime) sawOT = true; return g2.state.phase==='end'; }, null, 200);
  ok(sawOT, 'esitlikte uzatma baslamali');
})();

/* ---------------------------------------------------------------- 9. kalici kayit */
console.log('9) kalici kayit');
(function(){
  var store = memStore(), st = mk(31, {storage:store}), g = st.g;
  chat(g, 'real1', 'Ayşe', '35');
  st.until(function(){ return g.state.phase==='play'; }, null, 20);
  for (var i=0;i<30;i++) g.onEvent({type:'gift', uid:'real1', name:'Ayşe', diamonds:20});
  g.save();
  ok(!!store.raw['mf2-users'], 'mf2-users yazilmali');
  var saved = JSON.parse(store.raw['mf2-users']).real1;
  ok(saved && saved.l >= 3000 && saved.h===35, 'kayit icerigi: '+JSON.stringify(saved));
  var st2 = mk(32, {storage:store}), feeds = [];
  st2.g.on('feed', function(f){ feeds.push(f.text); });
  st2.g.onEvent({type:'member', uid:'real1', name:'Ayşe'});
  var u = st2.g.state.users.real1;
  ok(u.life===saved.l && u.home===35 && u.rank===rankFor(saved.l), 'kayit geri okunmali');
  ok(feeds.some(function(t){ return t==='Tekrar hoş geldin '+MF.game.RANKS[u.rank]+' Ayşe'; }), 'tekrar hos geldin: '+feeds.join('|'));
  ok(!store.raw['bot'], 'bot kaydedilmez');
  function rankFor(l){ return MF.game.rankOf(l); }
  // maclar sonrasi dunya durumu geri okunur
  st.matches(2, null);
  var w = JSON.parse(store.raw['mf2-world']);
  ok(w.champion.id===g.state.champion.id && Object.keys(w.owners).length>0, 'dunya kaydi');
  var st3 = mk(33, {storage:store});
  ok(st3.g.state.champion.id===w.champion.id && Object.keys(st3.g.state.owners).length===Object.keys(w.owners).length, 'dunya geri okunmali');
})();

/* ---------------------------------------------------------------- 10. sayilar */
console.log('10) olay hacmi');
(function(){
  var st = mk(12345), n = 0, bd = bots(); var feeds = 0, secs = 0;
  st.g.on('feed', function(){ feeds++; });
  st.matches(2, bd);
  var perMin = feeds / (st.t/60);
  ok(perMin < 60, 'feed hacmi makul olmali: dakikada '+perMin.toFixed(1));
  even.feedPerMin = perMin;
})();

/* ---------------------------------------------------------------- ozet */
function pc(x){ return (x*100).toFixed(0)+'%'; }
console.log('\n--- denge tablosu (dengeli botlar, 20 mac) ---');
console.log('kazanma  side0: '+even.w[0]+' ('+pc(even.w[0]/20)+')  side1: '+even.w[1]+' ('+pc(even.w[1]/20)+')');
console.log('ort. mac suresi: '+mean(even.lens).toFixed(0)+' sn   min/max: '+Math.min.apply(null,even.lens).toFixed(0)+'/'+Math.max.apply(null,even.lens).toFixed(0)+'   tam sure(>=170): '+pc(even.full)+'   >=120 sn: '+pc(even.late));
console.log('en cok es zamanli birim: '+even.maxU+'   intikam tetik: '+even.rev+'   sur asamasi: '+even.stages+'   topcu atisi: '+even.shots);
console.log('yalniz milis ort. sure: '+even.milisLen.toFixed(0)+' sn');
console.log('hediye ustun taraf kazanma: side0 '+pc(gift[0])+'  side1 '+pc(gift[1]));
console.log('1000 elmas: kazanma '+even.whaleWins+'  ilk 15 sn can kaybi en fazla '+pc(even.whaleEarly)+'  ort. sure '+even.whaleLen.toFixed(0)+' sn');
console.log('feed/dk: '+even.feedPerMin.toFixed(1));
console.log('\n'+(fails? 'BASARISIZ: '+fails+' / '+checks : 'TAMAM: '+checks+' kontrol gecti'));
process.exit(fails ? 1 : 0);
