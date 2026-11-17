/* Memleket Fethi v2 - oyun mantigi (kusatma duellosu).
   DOM / THREE / localStorage / performance / Date kullanmaz: depolama, saat ve rastgelelik create(cfg) ile enjekte edilir.
   Tarayicida <script>, node'da require ile calisir. Gerekir: data.js */
var MF = (typeof window!=='undefined' ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
(function(){
'use strict';
if (!MF.data && typeof require !== 'undefined') { try { require('./data.js'); } catch (_) {} }

/* ------------------------------------------------------------------ ayarlar (denge) */
var TUNE = {
  round: 180,            // mac suresi (sn)
  intro: 6, end: 10,     // faz sureleri
  overtime: 30,          // esitlikte uzatma
  hpBase: 1500, hpPerViewer: 10, hpMax: 6000,
  last: 30,              // son N sn: hasar x2
  speed: 0.045,          // pos/sn (kapidan sura ~22 sn)
  contact: 0.04,         // temas mesafesi
  dps: 2.5, dpsExp: 0.8, // birlik hasari: dps * n^dpsExp
  wallDps: 0.06,         // sura hasari: wallDps * n^dpsExp (plan 1.2; bot yogunlugunda macin tam sure surmesi icin dusuruldu)
  hpPerN: 10, cavHp: 1.5, cavDmg: 1.5, cavSpeed: 2,
  catHp: 40, catHpPerN: 0.5, catPos: 0.6, catEvery: 3, catDmg: 18, catDmgPerN: 0.08,
  cap: 120,              // ayni anda en fazla birlik
  militiaEvery: 4, militiaN: 3, militiaJitter: 0.25,
  likeSquad: 6, likeDelay: 1.5, likeMaxSquad: 40, chatCool: 2,
  revenge: 15, revengeOff: 12, revengeMul: 1.5,
  shieldT: 8, shieldRepair: 40,
  mehterT: 12, mehterBuff: 1.5, mehterWaves: 5, mehterRepair: 150, mehterWaveDiv: 14, mehterWaveMin: 8,
  giftPow: 4, giftExp: 0.75,
  tierCav: 10, tierCat: 100, tierMehter: 1000,
  winBonus: 25, tieEps: 0.002,
  bankMax: 60, bankRate: 4, saveEvery: 20
};

var RANKS = ['Er','Onbaşı','Çavuş','Bey','Paşa','Vezir','Sultan'];
var RANKAT = [0,50,200,600,2000,6000,20000];
function rankOf(l){ var r=0; while (r<6 && l>=RANKAT[r+1]) r++; return r; }

var BAD = /(amk|aq|orospu|sik|piç|yarra|göt|salak|gerizekal|ibne|kahpe|pezevenk|şerefsiz)/i;
var BOT = ['Ayşe','Mehmet','Zeynep','Emre','Elif','Can','Fatma','Burak','Selin','Oğuz','Derya','Kerem','Merve','Yusuf','Büşra','Hakan','Ece','Tolga','Gizem','Serkan','Melis','Onur','İrem','Volkan','Damla','Umut','Sevgi','Barış','Nazlı','Kaan','Hatice','Murat','Aslı','Cem','Esra','Tuna','Pınar','Deniz','Sinem','Arda'];
var BOTIL = [34,34,34,6,6,35,35,16,1,7,27,42,21,61,55,38,63,33,31,41,25,65,44,52,20,26,58,48,10,46];

function pad2(n){ return (n<10?'0':'')+n; }
function trUpper(s){ return String(s).replace(/i/g,'İ').replace(/ı/g,'I').toUpperCase(); }
function memStorage(){ var m={}; return { get:function(k){ return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null; }, set:function(k,v){ m[k]=String(v); } }; }

function create(cfg){
  cfg = cfg || {};
  var T0 = {}; for (var tk in TUNE) T0[tk]=TUNE[tk];
  if (cfg.tune) for (var tk2 in cfg.tune) T0[tk2]=cfg.tune[tk2];
  var K = T0;
  if (cfg.round) K.round = cfg.round;
  var storage = cfg.storage || memStorage();
  var now = cfg.now || function(){ return Date.now(); };
  var rnd = cfg.random || Math.random;
  var D = MF.data, P = D.P;

  /* ---------------------------------------------------------------- durum */
  var state = {
    phase:'intro', phaseT:0, timeLeft:K.round, overtime:false, doubleDmg:false,
    sides:[ blankSide(), blankSide() ],
    champion:{id:34, streak:0}, queue:[], owners:{}, conquerors:{}, units:[], users:{},
    winner:null, fatih:null, viewers:0, matchNo:0, RANKS:RANKS
  };
  function blankSide(){ return {id:0,name:'',hp:1,maxHp:1,shield:0,buff:0,revenge:false,players:0,score:0,top:[]}; }
  var S = state.sides, units = state.units, users = state.users;
  var meta = {};            // uid -> iç alanlar
  var T = 0;                // oyun saati (sn)
  var matchId = 0, uidSeq = 0;
  var handlers = {};
  var STORE = {}, votes = {}, voteCount = {};
  var members = [[],[]], topDirty = false;
  var bank = [], timers = [], liking = {};
  var militiaT = [0,0], stageDone = [0,0], lastRate = {};
  var announce = true, saveT = 0, dirty = false;
  var botN = 0, nextCh = null;

  /* ---------------------------------------------------------------- yardimcilar */
  function on(name, fn){ (handlers[name] = handlers[name] || []).push(fn); return g; }
  function emit(name, a, b, c){
    var h = handlers[name]; if (!h) return;
    for (var i=0;i<h.length;i++){ try { h[i](a,b,c); } catch (err) { if (typeof console!=='undefined') console.error('MF.game handler',name,err); } }
  }
  function rate(key, gap){ if (T - (lastRate[key]===undefined?-1e9:lastRate[key]) < gap) return false; lastRate[key]=T; return true; }
  function plateName(id){ return pad2(id)+' '+P[id].name; }
  function feed(text, side){ emit('feed', {text:text, side:side==null?null:side}); }
  function banner(big, small, side){ emit('banner', {big:big, small:small||'', side:side==null?null:side}); }
  function say(t){ emit('say', t); }
  function sfx(n){ emit('sfx', n); }
  function card(u, why){ emit('card', {user:u, why:why}); }
  function who(u){ return (u.rank?RANKS[u.rank]+' ':'')+u.name; }
  function pctOf(i){ return S[i].maxHp>0 ? Math.max(0,S[i].hp)/S[i].maxHp : 0; }
  function nOfHp(u){ return Math.max(1, Math.ceil(u.hp / (K.hpPerN * (u.type==='suvari'?K.cavHp:1)))); }

  /* ---------------------------------------------------------------- kalici kayit */
  function loadStore(){
    try { var s = storage.get('mf2-users'); if (s) STORE = JSON.parse(s) || {}; } catch (_) { STORE = {}; }
    try {
      var w = storage.get('mf2-world');
      if (w) { w = JSON.parse(w);
        if (w && w.champion && P[w.champion.id]) { state.champion.id = w.champion.id; state.champion.streak = w.champion.streak|0; }
        if (w && w.owners) for (var k in w.owners) state.owners[k] = w.owners[k];
        if (w && w.conquerors) for (var k2 in w.conquerors) state.conquerors[k2] = w.conquerors[k2];
      }
    } catch (_) {}
  }
  function save(){
    try {
      for (var id in users){ var u = users[id]; if (id.indexOf('bot')!==0 && u.life>0) STORE[id] = {l:u.life, h:u.home||0, w:u.wins||0}; }
      var ks = Object.keys(STORE);
      for (var i=0;i<ks.length-3000;i++) delete STORE[ks[i]];
      storage.set('mf2-users', JSON.stringify(STORE));
      storage.set('mf2-world', JSON.stringify({champion:state.champion, owners:state.owners, conquerors:state.conquerors, t:now()}));
    } catch (_) {}
    dirty = false;
  }

  /* ---------------------------------------------------------------- izleyiciler */
  function getUser(e){
    var id = String(e.uid!=null && e.uid!=='' ? e.uid : (e.name||'anon')), u = users[id];
    if (!u){
      var st = STORE[id] || {};
      u = users[id] = {id:id, name:e.name||id, pic:e.pic||'', home:st.h||0, side:null, volunteer:false, pts:0, life:st.l||0, rank:rankOf(st.l||0), wins:st.w||0};
      meta[id] = {mid:0, power:0, pT:null, lastChat:-1e9, back:!!st.l, nVote:0};
    }
    if (e.name) u.name = e.name; if (e.pic) u.pic = e.pic;
    return u;
  }
  function touch(u){
    var m = meta[u.id];
    if (m.back && rate('greet', 0.7)){
      m.back = false;
      feed('Tekrar hoş geldin '+who(u), u.side);
      card(u, 'Tekrar hoş geldin'); m.greeted = true;
    }
  }
  function addPts(u, k){
    if (!k) return;
    u.pts += k; u.life += k; dirty = true;
    if (u.side!=null && meta[u.id].mid===matchId){ S[u.side].score += k; topDirty = true; }
    var r = rankOf(u.life); if (r <= u.rank) return;
    u.rank = r;
    if (r>=5 || rate('rankfeed', 2.5)) feed(u.name+' rütbe atladı: '+RANKS[r], u.side);
    sfx('rankup');
    if (r>=2 && rate('rankban', 2.5)){ banner(u.name+' artık '+RANKS[r]+'!', r>=3 ? 'Bey ve üstü rütbeler ata biner' : 'Rütbe atladı', u.side); card(u, 'Yeni rütbe: '+RANKS[r]); }
    if (r>=2 && rate('rankspeech', 4)) say(u.name+' '+RANKS[r].toLowerCase()+' oldu.');   // Onbaşı sessiz; ünvan düz cümle içinde, küçük harfle
  }
  function placeUser(u, s, vol){
    var m = meta[u.id];
    if (m.mid===matchId && u.side!=null){
      if (u.side===s) return;
      var a = members[u.side], ix = a.indexOf(u); if (ix>=0) a.splice(ix,1);
      S[u.side].players--; S[u.side].score -= u.pts;
    }
    m.mid = matchId; u.side = s; u.volunteer = !!vol;
    members[s].push(u); S[s].players++; S[s].score += u.pts; topDirty = true;
    if (!m.greeted && rate('join', 2.5))
      feed(u.name+(vol?' gönüllü: ':' sahada: ')+plateName(S[s].id), s);
    m.greeted = false;
  }
  function ensureSide(u){
    var m = meta[u.id];
    if (m.mid===matchId && u.side!=null) return u.side;
    var s, vol = false;
    if (u.home && u.home===S[0].id) s = 0;
    else if (u.home && u.home===S[1].id) s = 1;
    else { vol = true; s = S[0].players<S[1].players ? 0 : S[1].players<S[0].players ? 1 : (rnd()<.5?0:1); }
    placeUser(u, s, vol);
    return s;
  }
  function refreshTop(){
    for (var i=0;i<2;i++){
      var a = members[i].slice().sort(function(x,y){ return y.pts-x.pts; }).slice(0,3);
      S[i].top = a.map(function(u){ return {user:u, pts:u.pts}; });
    }
    topDirty = false;
  }

  /* ---------------------------------------------------------------- oylama */
  function setVote(u, id){
    var old = votes[u.id]; if (old===id) return;
    if (old){ voteCount[old]--; if (voteCount[old]<=0) delete voteCount[old]; }
    if (id){ votes[u.id] = id; voteCount[id] = (voteCount[id]||0)+1; } else delete votes[u.id];
    refreshQueue();
  }
  function refreshQueue(){
    var ex0 = state.phase==='end' ? state.champion.id : S[0].id, ex1 = state.phase==='end' ? state.champion.id : S[1].id;
    var a = [];
    for (var id in voteCount){ if (+id===ex0 || +id===ex1) continue; a.push({id:+id, votes:voteCount[id]}); }
    a.sort(function(x,y){ return y.votes-x.votes || x.id-y.id; });
    state.queue.length = 0; for (var i=0;i<a.length && i<5;i++) state.queue.push(a[i]);
  }
  function purgeVotes(ids){
    for (var uid in votes){ if (ids.indexOf(votes[uid])>=0){ var id = votes[uid]; delete votes[uid]; voteCount[id]--; if (voteCount[id]<=0) delete voteCount[id]; } }
  }

  /* ---------------------------------------------------------------- birlikler */
  function removeUnit(u, reason){
    var i = units.indexOf(u); if (i<0) return; units.splice(i,1); u.dead = true; emit('remove', u, reason);
  }
  function newUnit(side, type, n, user){
    var hpMul = type==='suvari' ? K.cavHp : 1, hp;
    if (type==='topcu') hp = K.catHp + n*K.catHpPerN; else if (type==='mehter') hp = 1e6; else hp = K.hpPerN*hpMul*n;
    return { id:++uidSeq, side:side, type:type, n:n, hp:hp, maxHp:hp, pos: type==='mehter'?0.03:0, lane: rnd()*2-1,
             state: type==='mehter'?'idle':'walk', user:user||null, shotT:K.catEvery*(0.4+rnd()*0.6), wacc:0, wt:0, din:0, target:null, born:T };
  }
  function addUnit(side, type, n, user){
    if (units.length >= K.cap){
      if (type==='mehter' || type==='milis') return null;
      var best = null;
      for (var i=0;i<units.length;i++){ var c = units[i]; if (c.side!==side || c.type==='topcu' || c.type==='mehter') continue; if (!best || c.pos<best.pos) best = c; }
      if (!best) return null;
      var per = K.hpPerN*(best.type==='suvari'?K.cavHp:1);
      best.hp += per*n; best.maxHp += per*n; best.n = nOfHp(best); if (user && !best.user) best.user = user;
      return best;
    }
    var u = newUnit(side, type, n, user); units.push(u); emit('spawn', u); return u;
  }
  // izleyici/hediye kaynakli birlik: intro'da bankaya girer, play'de hemen cikar
  function deploy(side, type, n, user){
    if (state.phase==='intro'){
      if (bank.length >= K.bankMax){ var b = bank[(rnd()*bank.length)|0]; if (b.side===side && b.type===type && !b.fx) b.n += n; return; }
      bank.push({side:side, type:type, n:n, user:user}); return;
    }
    if (state.phase!=='play') return;
    addUnit(side, type, n, user);
  }
  function bankRelease(){
    var k = K.bankRate; while (bank.length && k-- > 0){ var b = bank.shift(); if (b.fx) b.fx(); else addUnit(b.side, b.type, b.n, b.user); }
  }

  /* beğeni / güç birikimi */
  function addPower(u, x){
    var m = meta[u.id]; if (u.side==null) return;
    if (m.power<=0.0001) m.pT = T; m.power += x; liking[u.id] = u;
    if (m.power >= K.likeSquad) flushPower(u, false);
  }
  function flushPower(u, timer){
    var m = meta[u.id], n;
    if (timer){ n = Math.max(1, Math.round(m.power)); m.power = 0; deploy(u.side, 'piyade', n, u); }
    else while (m.power >= K.likeSquad){ n = Math.min(Math.floor(m.power), K.likeMaxSquad); m.power -= n; deploy(u.side, 'piyade', n, u); }
    if (m.power <= 0.0001){ m.power = 0; m.pT = null; delete liking[u.id]; } else m.pT = T;
  }
  function tickLikers(){
    for (var id in liking){ var u = liking[id], m = meta[id]; if (m.pT!=null && T - m.pT >= K.likeDelay) flushPower(u, true); }
  }

  /* ---------------------------------------------------------------- efektler */
  function mehterEffect(u, side, nGift){
    var s = S[side];
    s.buff = K.mehterT; s.hp = Math.min(s.maxHp, s.hp + K.mehterRepair);
    var wave = Math.max(K.mehterWaveMin, Math.round(nGift / K.mehterWaveDiv));
    for (var i=0;i<K.mehterWaves;i++)
      (function(i){ timers.push({at:T + i*(K.mehterT/K.mehterWaves), fn:function(){ addUnit(side,'piyade',wave,u); }}); })(i);
    var d = addUnit(side, 'mehter', 1, u);
    if (d) { d.lane = side===0 ? 0.55 : -0.55; timers.push({at:T+K.mehterT, fn:function(){ if (!d.dead) removeUnit(d,'expired'); }}); }
    banner('MEHTER MARŞI', u.name+' '+s.name+' mehterini çağırdı: 12 sn +%50 hasar', side);
    card(u, 'Mehter çağırdı'); sfx('mehter');
    say(s.name+' için mehter marşı. Teşekkürler '+u.name);
    feed(u.name+' mehter çağırdı → '+s.name+' +%50 hasar, sura onarım', side);
  }
  function shieldEffect(u, side){
    var s = S[side]; s.shield = K.shieldT; s.hp = Math.min(s.maxHp, s.hp + K.shieldRepair);
    feed(u.name+' takip etti → '+s.name+' surları kalkanda', side); sfx('shield');
  }

  /* ---------------------------------------------------------------- olaylar */
  function onEvent(e){
    if (!e) return;
    if (e.viewers!=null && isFinite(e.viewers)) state.viewers = e.viewers|0;
    if (e.type==='roomUser') return;
    var u = getUser(e); touch(u);
    var ph = state.phase;
    if (e.type==='member'){
      if (!meta[u.id].greeted && !u.home && rate('hello', 2.5)) feed('Hoş geldin '+u.name+', plakanı yaz, askerin yola çıksın');
      return;
    }
    if (e.type==='chat') return onChat(u, e);
    if (ph==='end') return;
    var side = ensureSide(u);
    switch (e.type){
      case 'like': {
        var k = Math.max(1, e.count|0), mul = S[side].revenge ? K.revengeMul : 1;
        addPts(u, k); addPower(u, k*mul);
        if (k>=20 && rate('likefeed', 3)) feed(u.name+' '+k+' beğeni gönderdi', side);
        break; }
      case 'gift': {
        var rep = Math.max(1, e.repeat|0), d = Math.max(1, e.diamonds|0) * rep;
        var n = Math.round(K.giftPow * Math.pow(d, K.giftExp));
        addPts(u, d*5);
        var tier = d>=K.tierMehter ? 'mehter' : d>=K.tierCat ? 'topcu' : d>=K.tierCav ? 'suvari' : 'piyade';
        var names = {piyade:'Piyade bölüğü', suvari:'Şövalye süvarisi', topcu:'Topçu', mehter:'Mehter'};
        if (d>=K.tierCat || rate('giftfeed', d>=K.tierCav ? 1.5 : 4)) feed(u.name+' '+d+' elmas → '+names[tier], side);
        if (rep>=5 && rate('combo', 1)){ banner('x'+rep+' KOMBO', u.name+' · '+(e.giftName||'hediye'), side); sfx('combo'); }
        if (d>=K.tierCav && rate('giftcard', 2)) card(u, d+' elmas gönderdi');
        if (tier==='mehter'){
          if (ph==='play') mehterEffect(u, side, n);
          else bank.push({fx:function(){ mehterEffect(u, side, n); }});
        } else {
          if (tier==='topcu'){ banner(u.name+' TOPÇU GÖNDERDİ', S[side].name+' taş yağdıracak', side); sfx('cannon'); }
          else if (tier==='suvari') sfx('horse');
          deploy(side, tier, n, u);
        }
        break; }
      case 'follow': {
        addPts(u, 20);
        if (ph==='play') shieldEffect(u, side); else if (rate('followfeed',2)) feed(u.name+' takip etti', side);
        break; }
      case 'share': {
        addPts(u, 30); addPower(u, 10);
        if (rate('sharefeed', 2)) feed(u.name+' paylaştı → +10 güç', side);
        break; }
    }
  }
  function onChat(u, e){
    var txt = String(e.comment||''), id = D.parsePlate(txt), m = meta[u.id], ph = state.phase;
    if (id){
      u.home = id; dirty = true;
      if (id===S[0].id || id===S[1].id){
        if (ph!=='end'){ placeUser(u, id===S[0].id?0:1, false); }
        setVote(u, 0);
      } else if (ph==='end' && id===state.champion.id){
        setVote(u, 0);
      } else {
        setVote(u, id);
        if (ph!=='end') ensureSide(u);
      }
      return;
    }
    if (/^\s*!?(ben|kart|rütbe|rutbe)\s*$/i.test(txt)){ card(u, 'Kartın'); return; }
    if (ph!=='play') return;
    ensureSide(u);
    if (T - m.lastChat >= K.chatCool){
      m.lastChat = T; addPts(u, 1); addPower(u, 1);
      var t = txt.replace(/https?:\S+|www\.\S+/g,'').trim().slice(0,42);
      if (t && !BAD.test(t)) emit('bubble', {user:u, text:t});
    }
  }

  /* ---------------------------------------------------------------- mac akisi */
  function maxHpNow(){ return Math.min(K.hpMax, K.hpBase + K.hpPerViewer * Math.max(0, state.viewers|0)); }

  function startIntro(){
    var champ = state.champion.id, ch = nextCh || pickChallenger();
    nextCh = null;
    while (units.length) removeUnit(units[units.length-1], 'clear');
    matchId++; state.matchNo++;
    state.phase = 'intro'; state.phaseT = 0; state.timeLeft = K.round; state.overtime = false; state.doubleDmg = false;
    state.winner = null; state.fatih = null;
    var mh = maxHpNow(), ids = [champ, ch];
    for (var i=0;i<2;i++){
      var s = S[i]; s.id = ids[i]; s.name = P[ids[i]].name; s.maxHp = mh; s.hp = mh; s.shield = 0; s.buff = 0; s.revenge = false; s.players = 0; s.score = 0; s.top = [];
      members[i].length = 0; stageDone[i] = 0; militiaT[i] = 1.5 + i*0.7;
    }
    for (var uid in users){ var u = users[uid]; u.side = null; u.volunteer = false; u.pts = 0; meta[uid].power = 0; meta[uid].pT = null; }
    liking = {}; bank.length = 0; timers.length = 0;
    purgeVotes(ids); refreshQueue();
    announceIntro();
    emit('phase', 'intro');
  }
  function announceIntro(){
    var c = state.champion;
    banner('SIRADAKİ KUŞATMA', plateName(S[0].id)+' ⚔ '+plateName(S[1].id), null);
    sfx('intro'); say('Sıradaki kuşatma. '+S[0].name+' karşı '+S[1].name);
    if (c.streak>=2){
      feed(S[0].name+' '+c.streak+' maçtır yenilmiyor!', 0);
      banner(trUpper(S[0].name)+' '+c.streak+' MAÇTIR YENİLMİYOR', 'Onu kim durduracak?', 0);
    }
  }
  function pickChallenger(){
    var champ = state.champion.id, best = 0, bv = 0, ties = [];
    for (var id in voteCount){ if (+id===champ) continue; if (voteCount[id]>bv){ bv = voteCount[id]; ties = [+id]; } else if (voteCount[id]===bv) ties.push(+id); }
    if (bv>0 && ties.length) { best = ties[(rnd()*ties.length)|0]; purgeVotes([best]); return best; }
    var terr = [champ]; for (var k in state.owners) if (state.owners[k]===champ && +k!==champ) terr.push(+k);
    var cand = [], seen = {}, free = [];
    terr.forEach(function(t){ (D.adj[t]||[]).forEach(function(a){ if (a===champ || seen[a]) return; seen[a] = 1; cand.push(a); if (state.owners[a]!==champ) free.push(a); }); });
    var pool = free.length ? free : cand;
    if (!pool.length){ do { best = 1 + ((rnd()*81)|0); } while (best===champ); return best; }
    return pool[(rnd()*pool.length)|0];
  }

  function startPlay(){
    state.phase = 'play'; state.phaseT = 0;
    var mh = maxHpNow(); for (var i=0;i<2;i++){ S[i].maxHp = mh; S[i].hp = mh; }
    for (var id in liking) meta[id].pT = T;
    banner('SAVAŞ BAŞLASIN', S[0].name+' ⚔ '+S[1].name, null); sfx('start');
    emit('phase', 'play');
  }

  function endMatch(w){
    if (state.phase!=='play') return;
    var l = 1-w;
    state.phase = 'end'; state.phaseT = 0; state.timeLeft = 0; state.doubleDmg = false; state.winner = w;
    for (var i=0;i<2;i++){ S[i].revenge = false; S[i].shield = 0; S[i].buff = 0; }
    if (topDirty) refreshTop();
    var fatih = S[w].top[0] ? S[w].top[0].user : null; state.fatih = fatih;
    S[l].hp = Math.max(0, S[l].hp);
    // birlikler
    units.slice().forEach(function(u){ if (u.side===l || u.type==='mehter') removeUnit(u, u.type==='mehter'?'expired':'defeat'); else { u.state = 'idle'; u.target = null; } });
    // puan, galibiyet
    members[w].forEach(function(u){ u.wins++; addPts(u, K.winBonus); });
    // fetih haritasi
    var wid = S[w].id, lid = S[l].id;
    for (var k in state.owners) if (state.owners[k]===lid) state.owners[k] = wid;
    state.owners[lid] = wid; state.owners[wid] = wid;
    state.conquerors[lid] = fatih ? fatih.name : S[w].name;
    delete state.conquerors[wid];
    // seri
    var c = state.champion, rebel = (wid!==c.id);
    if (rebel){ c.id = wid; c.streak = 1; } else c.streak++;
    // anonslar
    if (stageDone[l]<3){ stageDone[l] = 3; emit('stage', l, 3); }
    banner(trUpper(S[l].name)+' DÜŞTÜ', S[w].name+' kuşatmayı kazandı', w); sfx('victory');
    feed(S[w].name+' kazandı, '+S[l].name+' fethedildi'+(fatih?' · Fatih: '+fatih.name:''), w);
    if (rebel) feed(S[w].name+' şampiyonu devirdi!', w);
    else if (c.streak>=2) feed(S[w].name+' '+c.streak+' maçtır yenilmiyor!', w);
    if (fatih){ card(fatih, 'Fatih'); say('Fatih '+fatih.name+'. '+S[w].name+' kazandı'); }
    else say(S[w].name+' kazandı');
    refreshQueue(); save();
    emit('matchEnd', {winner:w, fatih:fatih});
    emit('phase', 'end');
  }

  function stageCheck(i){
    var p = pctOf(i);
    if (stageDone[i]<1 && p<=0.66){ stageDone[i]=1; emit('stage', i, 1); banner(trUpper(S[i].name)+' SURLARI YARILDI', 'Sur gediği açıldı', i); sfx('stage'); say(S[i].name+' surları yarıldı'); }
    if (stageDone[i]<2 && p<=0.33){ stageDone[i]=2; emit('stage', i, 2); banner(trUpper(S[i].name)+' SURLARI YIKILIYOR', 'Kale son demlerinde', i); sfx('stage'); }
  }

  function wallHit(def, dmg, by, dt, immediate){
    var s = S[def]; if (s.shield>0 || dmg<=0 || s.hp<=0) return;
    s.hp = Math.max(0, s.hp - dmg);
    by.wacc += dmg;
    if (immediate){ emit('wallHit', def, by.wacc, by); by.wacc = 0; by.wt = 0; }
    else { by.wt += dt; if (by.wt >= 0.5){ emit('wallHit', def, by.wacc, by); by.wacc = 0; by.wt = 0; } }
  }

  function playStep(dt){
    var i, j, u;
    // zaman
    state.timeLeft -= dt;
    var dbl = state.timeLeft <= K.last;
    if (dbl && !state.doubleDmg){
      state.doubleDmg = true;
      if (!state.overtime){ banner('SON 30 SANİYE', 'Tüm hasar ×2', null); feed('Son 30 saniye: tüm hasar iki kat', null); sfx('last30'); say('Son otuz saniye'); }
    }
    for (i=0;i<2;i++){ if (S[i].shield>0) S[i].shield = Math.max(0, S[i].shield-dt); if (S[i].buff>0) S[i].buff = Math.max(0, S[i].buff-dt); }
    for (i=timers.length-1;i>=0;i--) if (T >= timers[i].at){ var t = timers[i]; timers.splice(i,1); t.fn(); }
    if (bank.length) bankRelease();
    // milis
    for (i=0;i<2;i++){
      militiaT[i] -= dt;
      if (militiaT[i] <= 0){ militiaT[i] += K.militiaEvery * (1 + (rnd()*2-1)*K.militiaJitter); addUnit(i, 'milis', K.militiaN, null); }
    }
    tickLikers();
    // savas
    var A = [[],[]];
    for (i=0;i<units.length;i++){ u = units[i]; if (u.type!=='mehter'){ u.din = 0; u.target = null; A[u.side].push(u); } }
    var dmul = [ (dbl?2:1)*(S[0].buff>0?K.mehterBuff:1), (dbl?2:1)*(S[1].buff>0?K.mehterBuff:1) ];
    for (var s=0;s<2;s++){
      var mine = A[s], foes = A[1-s];
      for (i=0;i<mine.length;i++){
        u = mine[i]; if (u.type==='topcu') continue;
        var best = null, bd = K.contact;
        for (j=0;j<foes.length;j++){ var d = 1 - u.pos - foes[j].pos; if (d < bd){ bd = d; best = foes[j]; } }
        if (best){
          u.target = best;
          best.din += K.dps * Math.pow(u.n, K.dpsExp) * (u.type==='suvari'?K.cavDmg:1) * dmul[s] * dt;
        }
      }
    }
    // hareket / sur
    for (s=0;s<2;s++){
      for (i=0;i<A[s].length;i++){
        u = A[s][i];
        if (u.type==='topcu'){
          if (u.pos < K.catPos){ u.pos = Math.min(K.catPos, u.pos + K.speed*dt); u.state = 'walk'; }
          else {
            u.state = 'fight'; u.shotT -= dt;
            if (u.shotT <= 0){
              u.shotT += K.catEvery; emit('shot', u, 1-s);
              wallHit(1-s, (K.catDmg + K.catDmgPerN*u.n) * dmul[s], u, dt, true);
            }
          }
        } else if (u.target){ u.state = 'fight'; }
        else if (u.pos < 1){ u.pos = Math.min(1, u.pos + K.speed*(u.type==='suvari'?K.cavSpeed:1)*(0.92+0.16*((u.id*37)%11)/10)*dt); u.state = 'walk'; }
        else { u.state = 'fight'; wallHit(1-s, K.wallDps*Math.pow(u.n,K.dpsExp)*dmul[s]*dt, u, dt, false); }
      }
    }
    // hasar uygula
    for (i=units.length-1;i>=0;i--){
      u = units[i]; if (u.type==='mehter' || u.din<=0) continue;
      u.hp -= u.din; u.din = 0;
      if (u.hp <= 0) removeUnit(u, 'dead'); else if (u.type!=='topcu') u.n = nOfHp(u);
    }
    // intikam
    for (i=0;i<2;i++){
      var behind = (pctOf(1-i) - pctOf(i)) * 100, r = S[i].revenge;
      if (!r && behind > K.revenge){ S[i].revenge = true; banner('İNTİKAM ×'+K.revengeMul, S[i].name+' beğenileri 1,5 kat güçlü', i); feed('İntikam: '+S[i].name+' beğenileri ×'+K.revengeMul, i); sfx('revenge'); }
      else if (r && behind < K.revengeOff){ S[i].revenge = false; feed('İntikam sona erdi: '+S[i].name, i); }
      stageCheck(i);
    }
    // bitis
    var dead0 = S[0].hp<=0, dead1 = S[1].hp<=0;
    if (dead0 || dead1){ endMatch(dead0 && dead1 ? (rnd()<.5?0:1) : dead0 ? 1 : 0); return; }
    if (state.timeLeft <= 0){
      var diff = pctOf(0) - pctOf(1);
      if (Math.abs(diff) < K.tieEps && !state.overtime){
        state.overtime = true; state.timeLeft = K.overtime;
        banner('UZATMA +'+K.overtime+' SN', 'Eşitlik bozulmadı', null); feed('Uzatma: +'+K.overtime+' saniye', null); sfx('last30'); say('Eşitlik. Uzatma');
      } else {
        var w = Math.abs(diff) >= K.tieEps ? (diff>0?0:1) : (S[0].score!==S[1].score ? (S[0].score>S[1].score?0:1) : (rnd()<.5?0:1));
        endMatch(w);
      }
    }
  }

  function step(dt){
    if (!(dt>0)) return;
    if (dt > 0.1) dt = 0.1;
    if (announce){ announce = false; announceIntro(); emit('phase', 'intro'); }
    T += dt; state.phaseT += dt;
    var ph = state.phase;
    if (ph==='intro'){ if (state.phaseT >= K.intro) startPlay(); }
    else if (ph==='play') playStep(dt);
    else if (ph==='end'){ if (state.phaseT >= K.end) startIntro(); }
    if (topDirty && rate('top', 0.25)) refreshTop();
    saveT += dt; if (saveT >= K.saveEvery){ saveT = 0; if (dirty) save(); }
  }

  /* ---------------------------------------------------------------- demo izleyici */
  function botTick(){
    var i = (rnd() * Math.min(BOT.length, 8 + botN/4)) | 0; botN++;
    var uid = 'bot'+i, e = {uid:uid, name:BOT[i]+(i%3?'':'_'+(60+i)), pic:''}, r = rnd(), u = users[uid];
    if (botN % 40 === 1){ onEvent({type:'roomUser', viewers: Math.min(400, 40 + (botN/3|0))}); }
    function pickPlate(){
      var q = rnd();
      if (q < 0.36) return S[0].id; if (q < 0.72) return S[1].id;
      var p = BOTIL[(rnd()*BOTIL.length)|0]; return p;
    }
    if (!u || !u.home){ e.type = 'chat'; e.comment = rnd()<.5 ? String(pickPlate()) : P[pickPlate()].name; return onEvent(e); }
    if (r < 0.04){ e.type = 'chat'; e.comment = String(pickPlate()); }
    else if (r < .58){ e.type = 'like'; e.count = 1 + ((rnd()*12)|0); }
    else if (r < .74){ e.type = 'chat'; var nm = P[u.home].name; e.comment = ['haydi '+nm, nm+' burada','bastır '+nm,'selam herkese','geliyoruz','en büyük '+nm,'ben','kalkan lazım'][(rnd()*8)|0]; }
    else if (r < .9){ e.type = 'gift'; e.diamonds = rnd()<.7 ? 1 : 5; e.repeat = rnd()<.15 ? 5+((rnd()*10)|0) : 1; e.giftName = 'Gül'; }
    else if (r < .955){ e.type = 'gift'; e.diamonds = 10 + ((rnd()*80)|0); e.giftName = 'Hediye'; }
    else if (r < .972){ e.type = 'gift'; e.diamonds = 100 + ((rnd()*300)|0); e.giftName = 'Büyük hediye'; }
    else if (r < .9735){ e.type = 'gift'; e.diamonds = 1000; e.giftName = 'Aslan'; }
    else if (r < .99){ e.type = 'follow'; }
    else e.type = 'share';
    onEvent(e);
  }

  /* ---------------------------------------------------------------- baslat */
  var g = { onEvent:onEvent, step:step, botTick:botTick, on:on, state:state, save:save, tune:K };
  loadStore();
  // baslangic cifti
  if (state.champion.id===34 && !Object.keys(state.owners).length) nextCh = 6;
  startIntro();
  announce = true;
  return g;
}

MF.game = { create:create, RANKS:RANKS, RANKAT:RANKAT, rankOf:rankOf, TUNE:TUNE };
})();
if (typeof module !== 'undefined') module.exports = MF;
