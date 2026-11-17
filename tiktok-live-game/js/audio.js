/* Memleket Fethi - ses motoru (MF.audio). Plan: SES-PLANI.md
   Hazir ses dosyasi / ornek / ag yok: her sey WebAudio ile uretilir. Tum ezgiler bu oyun icin yazilmis ozgun bestelerdir.
   Duz <script>; THREE ve oyun mantigina bagimli degil. node'da require ile metin fonksiyonlari test edilir.
   Sentez kodu BaseAudioContext'e karsi yazildi: canli (AudioContext) ve cevrimdisi (OfflineAudioContext) ayni yolu kullanir. */
var MF = (typeof window!=='undefined' ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
(function(){
'use strict';
var G = typeof window!=='undefined' ? window : (typeof globalThis!=='undefined' ? globalThis : {});

/* ======================================================================
   1. METIN TEMIZLIGI (saf fonksiyonlar)
   ====================================================================== */
var PLATE = 'Adana,Adıyaman,Afyon,Ağrı,Amasya,Ankara,Antalya,Artvin,Aydın,Balıkesir,Bilecik,Bingöl,Bitlis,Bolu,Burdur,Bursa,Çanakkale,Çankırı,Çorum,Denizli,Diyarbakır,Edirne,Elazığ,Erzincan,Erzurum,Eskişehir,Gaziantep,Giresun,Gümüşhane,Hakkari,Hatay,Isparta,Mersin,İstanbul,İzmir,Kars,Kastamonu,Kayseri,Kırklareli,Kırşehir,Kocaeli,Konya,Kütahya,Malatya,Manisa,Kahramanmaraş,Mardin,Muğla,Muş,Nevşehir,Niğde,Ordu,Rize,Sakarya,Samsun,Siirt,Sinop,Sivas,Tekirdağ,Tokat,Trabzon,Tunceli,Şanlıurfa,Uşak,Van,Yozgat,Zonguldak,Aksaray,Bayburt,Karaman,Kırıkkale,Batman,Şırnak,Bartın,Ardahan,Iğdır,Yalova,Karabük,Kilis,Osmaniye,Düzce'.split(',');
var FALLBACK_NAME = 'bir izleyici';

function lowTR(s){ return String(s).toLocaleLowerCase('tr'); }
function upTR(s){ return String(s).toLocaleUpperCase('tr'); }
function fold(s){
  return lowTR(s).replace(/[çğıöşü]/g, function(c){ return {'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u'}[c]; }).replace(/[^a-z0-9]/g, '');
}
var ONES = ['sıfır','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
var TENS = ['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
function below1000(x){
  var s = [], h = Math.floor(x/100), r = x%100, t = Math.floor(r/10), o = r%10;
  if (h > 0){ if (h > 1) s.push(ONES[h]); s.push('yüz'); }
  if (t) s.push(TENS[t]);
  if (o) s.push(ONES[o]);
  return s.join(' ');
}
function trNum(n){
  n = Math.floor(Math.abs(+n) || 0);
  if (n === 0) return ONES[0];
  if (n > 999999999) return String(n).split('').map(function(d){ return ONES[+d]; }).join(' ');
  var out = [], m = Math.floor(n/1e6), th = Math.floor((n%1e6)/1000), r = n%1000;
  if (m) out.push(below1000(m)+' milyon');
  if (th) out.push((th === 1 ? '' : below1000(th)+' ')+'bin');
  if (r) out.push(below1000(r));
  return out.join(' ');
}
function numWords(intPart, frac){
  var s = trNum(+intPart);
  if (frac){
    if (frac === '5') s += ' buçuk';
    else s += ' virgül ' + frac.split('').map(function(d){ return ONES[+d]; }).join(' ');
  }
  return s;
}

function cleanName(s){
  s = String(s == null ? '' : s).normalize('NFKC');
  s = s.replace(/[^\p{Script=Latin}\s]/gu, ' ');          // _ . - rakam emoji simge atilir
  s = s.replace(/(\p{L})\1{3,}/giu, '$1$1$1');             // 3'ten fazla tekrar eden harf
  var words = s.split(/\s+/).filter(Boolean);
  var longW = words.filter(function(w){ return w.length >= 3; }).length;
  if (longW) words = words.filter(function(w){
    return !(w.length <= 2 && (/^x+$/i.test(w) || /^\p{Ll}\p{Lu}$/u.test(w)));   // xX, Xx, x
  });
  words = words.map(function(w){
    if (w.length > 1 && w === upTR(w) && w !== lowTR(w)) w = lowTR(w);          // BÜYÜK HARF -> kucuk (tr kurali)
    return upTR(w.charAt(0)) + w.slice(1);
  });
  s = words.join(' ');
  if (s.length > 24) s = s.slice(0, 24).replace(/\s+$/, '');
  return /\p{L}/u.test(s) ? s : FALLBACK_NAME;
}

function plateStrip(s){
  return s.replace(/(^|[^\p{L}\p{N}])(\d{1,2})\s+(\p{L}[\p{L}'’]*)/gu, function(all, pre, num, word){
    var n = +num;
    if (n >= 1 && n <= 81){
      var il = fold(PLATE[n-1]), w = fold(word);
      if (w.length >= 3 && (w.indexOf(il) === 0 || il.indexOf(w) === 0)) return pre + word;
    }
    return all;
  });
}

/* ---- telaffuz sozlugu: tam sozcuk, buyuk/kucuk harf duyarsiz, Turkce harf siniri (\p{L}); "Çavuşoğlu" gibi adlara dokunmaz.
   Yerine konan bicim kucuk harflidir; cumle basi buyuk harfi sonraki adimda (cleanText sonu) geri gelir.
   Ozel olarak yazilmamis sozcukler kendi kucuk harfli bicimine doner: buyuk harfle baslayan yalin sozcuklerden motorlar sasabiliyor. */
var LEX = {
  'çavuş': null,   // PRON_VARIANTS.cavus'tan secilir
  'onbaşı': 'onbaşı', 'paşa': 'paşa', 'vezir': 'vezir', 'sultan': 'sultan', 'bey': 'bey', 'fatih': 'fatih',
  'mehter': 'mehter', 'kuşatma': 'kuşatma', 'kale': 'kale', 'sur': 'sur', 'topçu': 'topçu', 'süvari': 'süvari',
  'derbi': 'derbi', 'intikam': 'intikam', 'hücum': 'hücum'
};
/* "çavuş" icin motora verilecek 6 yazi bicimi (SSML yok: Chrome/Edge/OBS Web Speech SSML'i yok sayar). Numara 1 tabanli, 1 varsayilan.
   Olasi nedenler: "avu" kumesinde v'nin yari-unlu (w/ğ benzeri) okunup uzamasi, bas harfi buyuk yalin sozcugun ad gibi okunmasi, sondaki ş. */
var PRON_VARIANTS = {
  cavus: [
    'çavuş',     // 1 duz kucuk harf: buyuk harfli yalin sozcuk sorunuysa bu yeter (varsayilan)
    'ça vuş',    // 2 hece bolme + bosluk: "avu" kumesini keser, v hecenin basinda net sessiz harf olur
    'çavvuş',    // 3 cift v: uzun/sert sessiz harfe zorlar, v'nin ğ/w gibi akmasini engeller
    'ça-vuş',    // 4 tireli bolme: cogu motor bosluk kadar duraksamadan hece siniri koyar
    'çavoş',     // 5 u yerine o: "avu" kumesini hic uretmez; sesi yakin, ses uyumu bozulmaz
    'chavush'    // 6 Latin-fonetik yedek: ç/ş'yi hic okumayan ya da yanlis okuyan motorlar icin
  ]
};
var PRON = {cavus: 1};
function pronKey(w){ var f = fold(w); return f === 'cavus' ? 'cavus' : null; }
function pronVariants(w){ var k = pronKey(w); return k ? PRON_VARIANTS[k].slice() : []; }
function clampVar(n, len){ n = Math.round(+n); return n >= 1 && n <= len ? n : 1; }
function setPronunciation(w, n){ var k = pronKey(w); if (!k) return false; PRON[k] = clampVar(n, PRON_VARIANTS[k].length); return true; }
function getPronunciation(w){ var k = pronKey(w); return k ? PRON[k] : 0; }
var LEX_RE = new RegExp('(?<![\\p{L}])(' + Object.keys(LEX).sort(function(a, b){ return b.length - a.length; }).join('|') + ')(?![\\p{L}])', 'giu');
function applyLexicon(s, pron){
  pron = pron || PRON;
  return s.replace(LEX_RE, function(w){
    var k = lowTR(w);
    if (k === 'çavuş') return PRON_VARIANTS.cavus[clampVar(pron.cavus == null ? PRON.cavus : pron.cavus, 6) - 1];
    return LEX[k] != null ? LEX[k] : k;
  });
}

function cleanText(s, pron){
  s = String(s == null ? '' : s).normalize('NFKC');
  // x10 / ×1.5
  s = s.replace(/(^|[^\p{L}\p{N}])[x×]\s?(\d+)(?:[.,](\d+))?/giu, function(a, pre, i, f){ return pre + numWords(i, f) + ' kat'; });
  s = s.replace(/%\s?(\d+)/g, 'yüzde $1').replace(/(\d+)\s?%/g, 'yüzde $1');
  s = s.replace(/(\d)\s*sn(?![\p{L}\d])\.?/giu, '$1 saniye').replace(/(\d)\s*dk(?![\p{L}\d])\.?/giu, '$1 dakika');
  s = s.replace(/(^|[^\p{L}])sn(?![\p{L}\d])\.?/giu, '$1saniye');
  s = s.replace(/&/g, ' ve ');
  s = plateStrip(s);
  // kullanici adi gibi gorunen sozcukler (alt cizgi, harf+rakam)
  s = s.split(/(\s+)/).map(function(tok){
    if (/^\s*$/.test(tok)) return tok;
    var m = /^([^\p{L}\p{N}_]*)(.*?)([^\p{L}\p{N}_]*)$/su.exec(tok);
    var core = m[2];
    if (core && (/_/.test(core) || /\p{L}\d/u.test(core) || /\p{L}[.\-]\d/u.test(core))) return m[1] + cleanName(core) + m[3];
    return tok;
  }).join('');
  s = s.replace(/\d+(?:[.,]\d+)?/g, function(n){
    var p = n.split(/[.,]/);
    if (p[0].length > 9) return p[0].split('').map(function(d){ return ONES[+d]; }).join(' ');
    return numWords(p[0], p[1]);
  });
  s = s.replace(/[^\p{Script=Latin}\s.,!?:;'’"()\-]/gu, ' ');
  s = s.replace(/(\p{L})\1{3,}/giu, '$1$1$1').replace(/([!?.,])\1{1,}/g, '$1');
  s = s.replace(/\p{L}+/gu, function(w){ return (w.length > 1 && w === upTR(w) && w !== lowTR(w)) ? lowTR(w) : w; });
  s = applyLexicon(s, pron);
  s = s.replace(/\s+/g, ' ').replace(/\s+([.,!?:;])/g, '$1').trim();
  s = s.replace(/(^|[.!?]\s+)(\p{L})/gu, function(a, p, c){ return p + upTR(c); });
  if (s.length > 160){ s = s.slice(0, 160); var k = s.lastIndexOf(' '); if (k > 80) s = s.slice(0, k); }
  return s;
}

/* Turkce ses secimi: lang 'tr' ile baslayan; yerel + bilinen adlar oncelikli. Yoksa null (konusma yapilmaz). */
function pickVoice(list){
  var best = null, bs = -1;
  for (var i = 0; list && i < list.length; i++){
    var v = list[i];
    if (!v || !/^tr([-_]|$)/i.test(String(v.lang || ''))) continue;
    var sc = 1;
    if (v.localService) sc += 10;
    if (/google|yelda|filiz|emel|ahmet|tolga/i.test(String(v.name || ''))) sc += 5;
    if (/^tr[-_]tr$/i.test(v.lang)) sc += 1;
    if (sc > bs){ bs = sc; best = v; }
  }
  return best;
}

/* ======================================================================
   2. SENTEZ YARDIMCILARI (BaseAudioContext uzerinde)
   ====================================================================== */
function mtof(m){ return 440*Math.pow(2, (m-69)/12); }
function clamp(x, a, b){ return x < a ? a : x > b ? b : x; }
var PC = {c:0, d:2, e:4, f:5, g:7, a:9, b:11};
function parseNote(n){
  var m = /^([a-g])([#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error('nota? '+n);
  return 12*(+m[3]+1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
/* "~a4:2 d5:1 r:1" -> [{s,m,l,o}] ; s,l 16'lik adim; onek: ~ cirpma  % titreme  * titresimli uzun */
function parseBar(str){
  var out = [], pos = 0;
  str.trim().split(/\s+/).forEach(function(tok){
    var orn = '';
    while (tok.length && '~%*'.indexOf(tok.charAt(0)) >= 0){ orn += tok.charAt(0); tok = tok.slice(1); }
    var p = tok.split(':'), len = +p[1] || 1;
    if (p[0] !== 'r') out.push({s:pos, m:parseNote(p[0]), l:len, o:orn});
    pos += len;
  });
  return out;
}
function mulberry(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a>>>15, 1 | a); t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t; return ((t ^ t>>>14) >>> 0) / 4294967296; }; }

/* vurmali zarf: hizli giris, ustel sonum */
function perc(p, t, peak, decay, a){
  a = a || 0.002;
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  p.setTargetAtTime(0, t + a, Math.max(decay, 0.01)/3);
  return t + a + decay*2.3;
}
/* ADSR: sure dur'da biter, r sonra solar; bitis zamanini dondurur */
function env(p, t, dur, peak, a, d, s, r){
  a = Math.min(a, dur*0.9);
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  if (d > 0) p.setTargetAtTime(peak*s, t + a, d/3);
  p.setTargetAtTime(0, t + dur, Math.max(r, 0.02)/3);
  return t + dur + r*2.3;
}
function noiseSrc(E, t, dur){
  var s = E.ctx.createBufferSource();
  s.buffer = E.noise; s.loop = true;
  s.start(t, E.rand()*(E.noise.duration-0.2));
  s.stop(t + dur);
  return s;
}
function tone(E, d, type, t, f0, f1, fd, peak, decay, a){
  var c = E.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 > 0 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + fd);
  var end = perc(g.gain, t, peak, decay, a);
  o.connect(g); g.connect(d); o.start(t); o.stop(end + 0.02);
}
function nz(E, d, ftype, f0, f1, fd, q, t, peak, decay, a){
  var c = E.ctx, f = c.createBiquadFilter(), g = c.createGain();
  f.type = ftype; f.frequency.setValueAtTime(f0, t);
  if (f1 > 0) f.frequency.exponentialRampToValueAtTime(f1, t + fd);
  f.Q.value = q;
  var end = perc(g.gain, t, peak, decay, a);
  var s = noiseSrc(E, t, end - t + 0.03);
  s.connect(f); f.connect(g); g.connect(d);
}
function hv(E, v){ return v*(0.9 + 0.2*E.rand()); }
function jt(E){ return (E.rand()-0.5)*0.012; }

/* ---------------- calgilar ---------------- */
var I = {};

I.kick = function(E, d, t, v){
  tone(E, d, 'sine', t, 140, 55, 0.1, 0.72*v, 0.3);
  nz(E, d, 'highpass', 2500, 0, 0, 0.7, t, 0.22*v, 0.012);
};
I.tom = function(E, d, t, v, f){
  f = f || 100;
  tone(E, d, 'sine', t, f*1.6, f, 0.09, 0.6*v, 0.38);
  nz(E, d, 'bandpass', f*5, 0, 0, 1.2, t, 0.25*v, 0.07);
};
I.snare = function(E, d, t, v){
  nz(E, d, 'highpass', 1400, 0, 0, 0.6, t, 0.55*v, 0.17);
  nz(E, d, 'bandpass', 2200, 0, 0, 1.0, t, 0.3*v, 0.1);
  tone(E, d, 'triangle', t, 210, 150, 0.06, 0.45*v, 0.09);
};
I.hat = function(E, d, t, v, open){
  nz(E, d, 'highpass', 7200, 0, 0, 0.8, t, 0.26*v, open ? 0.22 : 0.04);
};
I.cymbal = function(E, d, t, v, len){
  len = len || 1.4;
  nz(E, d, 'highpass', 5200, 0, 0, 0.7, t, 0.22*v, len, 0.004);
  nz(E, d, 'bandpass', 9000, 0, 0, 0.9, t, 0.1*v, len*0.6, 0.004);
  var g = E.ctx.createGain(), hp = E.ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 6500;
  perc(g.gain, t, 0.04*v, len*0.7, 0.003);
  hp.connect(g); g.connect(d);
  [263, 400, 421, 474, 587, 845].forEach(function(f){
    var o = E.ctx.createOscillator(); o.type = 'square'; o.frequency.value = f*2.1;
    o.connect(hp); o.start(t); o.stop(t + len*1.7 + 0.05);
  });
};
I.kos = function(E, d, t, v){
  tone(E, d, 'sine', t, 100, 58, 0.3, 0.7*v, 0.9);
  tone(E, d, 'sine', t, 150, 80, 0.12, 0.4*v, 0.5);
  nz(E, d, 'lowpass', 240, 0, 0, 0.7, t, 0.5*v, 0.12);
};
I.dum = function(E, d, t, v){
  tone(E, d, 'sine', t, 140, 80, 0.09, 0.7*v, 0.3);
  nz(E, d, 'lowpass', 1500, 0, 0, 0.7, t, 0.38*v, 0.08);
};
I.tek = function(E, d, t, v){
  nz(E, d, 'bandpass', 2300, 0, 0, 1.6, t, 0.6*v, 0.07);
  tone(E, d, 'triangle', t, 270, 200, 0.04, 0.3*v, 0.08);
};
I.nakkare = function(E, d, t, v){
  tone(E, d, 'sine', t, 430, 300, 0.04, 0.36*v, 0.1);
  nz(E, d, 'bandpass', 3800, 0, 0, 2, t, 0.2*v, 0.05);
};

/* tuncu / korno / boru: testere + kare, suzgec zarfi, gecikmeli titresim */
I.brass = function(E, d, t, dur, m, v, o){
  o = o || {};
  var c = E.ctx, f = mtof(m), g = c.createGain(), lp = c.createBiquadFilter();
  var open = o.open || 1;
  lp.type = 'lowpass'; lp.Q.value = 1.1;
  lp.frequency.setValueAtTime(f*1.4, t);
  lp.frequency.linearRampToValueAtTime(Math.min(f*(2.6+5*v)*open, 9000), t + (o.a || 0.05) + 0.03);
  lp.frequency.setTargetAtTime(f*(2.0+2.6*v)*open, t + (o.a || 0.05) + 0.03, 0.18);
  var end = env(g.gain, t, dur, (o.peak || 0.5)*v, o.a || 0.05, 0.22, 0.78, o.r || 0.12);
  lp.connect(g); g.connect(d);
  var lfo = c.createOscillator(), lg = c.createGain();
  lfo.frequency.value = 5.2 + E.rand()*0.6;
  lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib === undefined ? 5 : o.vib, t + 0.35);
  lfo.connect(lg); lfo.start(t); lfo.stop(end);
  [['sawtooth', -7, 1], ['sawtooth', 7, 1], ['square', 0, 0.35]].forEach(function(p){
    var os = c.createOscillator(), og = c.createGain();
    os.type = p[0]; os.frequency.value = f; os.detune.value = p[1]; og.gain.value = p[2]*0.5;
    lg.connect(os.detune);
    os.connect(og); og.connect(lp); os.start(t); os.stop(end);
  });
};
/* yaylilar: uc hafif akortsuz testere + alcak geciren, yavas giris */
I.strings = function(E, d, t, dur, m, v, o){
  o = o || {};
  var c = E.ctx, f = mtof(m), g = c.createGain(), lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = o.cut || Math.min(f*4, 2600); lp.Q.value = 0.5;
  var end = env(g.gain, t, dur, (o.peak || 0.1)*v, o.a || 0.3, 0.3, 0.9, o.r || 0.5);
  lp.connect(g); g.connect(d);
  [-13, 0, 11].forEach(function(dt){
    var os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; os.detune.value = dt + (E.rand()-0.5)*4;
    var og = c.createGain(); og.gain.value = 0.34;
    os.connect(og); og.connect(lp); os.start(t); os.stop(end);
  });
};
/* kisa yayli / mizrap */
I.pluck = function(E, d, t, dur, m, v, o){
  o = o || {};
  var c = E.ctx, f = mtof(m), g = c.createGain(), lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 2;
  lp.frequency.setValueAtTime(Math.min(f*6, 5500), t);
  lp.frequency.setTargetAtTime(f*1.3, t, 0.07);
  var end = env(g.gain, t, dur, (o.peak || 0.6)*v, 0.006, 0.1, 0.35, 0.08);
  lp.connect(g); g.connect(d);
  [['sawtooth', -6], ['sawtooth', 6], ['triangle', 0]].forEach(function(p){
    var os = c.createOscillator(); os.type = p[0]; os.frequency.value = f; os.detune.value = p[1];
    var og = c.createGain(); og.gain.value = 0.4;
    os.connect(og); og.connect(lp); os.start(t); os.stop(end);
  });
};
I.bass = function(E, d, t, dur, m, v, o){
  o = o || {};
  var c = E.ctx, f = mtof(m), g = c.createGain(), lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 1.4;
  lp.frequency.setValueAtTime(f*7, t); lp.frequency.setTargetAtTime(f*2.2, t, 0.06);
  var end = env(g.gain, t, dur, (o.peak || 0.28)*v, 0.008, 0.12, 0.6, 0.07);
  lp.connect(g); g.connect(d);
  var a = c.createOscillator(), b = c.createOscillator(), bg = c.createGain();
  a.type = 'sawtooth'; a.frequency.value = f; b.type = 'sine'; b.frequency.value = f; bg.gain.value = 0.6;
  a.connect(lp); b.connect(bg); bg.connect(g);
  a.start(t); b.start(t); a.stop(end); b.stop(end);
};
var HICAZ = {0:1, 2:1, 3:1, 6:1, 7:1, 9:1, 10:1};   // re uzerinde hicaz
function hicazUp(m){ do { m++; } while (!HICAZ[((m%12)+12)%12]); return m; }
/* zurna: testere + dar bant geciren (iki formant), titresim; o: ''|'~'|'%'|'*' */
I.zurna = function(E, d, t, dur, m, v, orn){
  orn = orn || '';
  var c = E.ctx, f = mtof(m), fu = mtof(hicazUp(m)), g = c.createGain(), mix = c.createGain();
  var end = env(g.gain, t, dur, 1.2*v, 0.018, 0.1, 0.88, 0.06);
  [[1250, 4.5, 1.0], [2700, 6, 0.65]].forEach(function(p){
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = p[0]; bp.Q.value = p[1];
    var pg = c.createGain(); pg.gain.value = p[2];
    mix.connect(bp); bp.connect(pg); pg.connect(g);
  });
  var dry = c.createBiquadFilter(); dry.type = 'lowpass'; dry.frequency.value = 1800;
  var dg = c.createGain(); dg.gain.value = 0.22; mix.connect(dry); dry.connect(dg); dg.connect(g);
  g.connect(d);
  var lfo = c.createOscillator(), lg = c.createGain();
  lfo.frequency.value = 5.8; lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(orn.indexOf('*') >= 0 ? 26 : 10, t + 0.22);
  lfo.connect(lg); lfo.start(t); lfo.stop(end);
  [['sawtooth', -5], ['sawtooth', 6], ['square', 0]].forEach(function(p, i){
    var os = c.createOscillator(), og = c.createGain();
    os.type = p[0]; os.frequency.setValueAtTime(f, t); os.detune.value = p[1]; og.gain.value = i === 2 ? 0.18 : 0.5;
    if (orn.indexOf('~') >= 0){ os.frequency.setValueAtTime(fu, t); os.frequency.setValueAtTime(f, t + 0.055); }   // cirpma
    if (orn.indexOf('%') >= 0 && dur > 0.2){                                                                        // titreme
      var tt = t + 0.1, k = 0;
      while (tt < t + dur - 0.06){ os.frequency.setValueAtTime(k%2 ? f : fu, tt); tt += 0.062; k++; }
      os.frequency.setValueAtTime(f, tt);
    }
    lg.connect(os.detune);
    os.connect(og); og.connect(mix); os.start(t); os.stop(end);
  });
};
I.bell = function(E, d, t, m, v, decay){
  var f = mtof(m);
  tone(E, d, 'sine', t, f, 0, 0, 0.3*v, decay);
  tone(E, d, 'sine', t, f*2.76, 0, 0, 0.12*v, decay*0.5);
  tone(E, d, 'sine', t, f*5.4, 0, 0, 0.05*v, decay*0.25);
};

/* ======================================================================
   3. MOTOR: ana zincir, yankilanma, katman/iz, siralayici
   ====================================================================== */
function makeImpulse(ctx, secs, rand){
  var sr = ctx.sampleRate, n = Math.floor(sr*secs), b = ctx.createBuffer(2, n, sr);
  for (var ch = 0; ch < 2; ch++){
    var d = b.getChannelData(ch), y = 0, pre = Math.floor(sr*0.012);
    for (var i = 0; i < n; i++){
      var x = i/n, k = 0.55 - 0.47*Math.min(1, x*1.4);                 // kuyruk gittikce kararir
      y += k*((rand()*2-1) - y);
      d[i] = i < pre ? 0 : y*Math.exp(-5.5*x)*(1 - Math.exp(-(i-pre)/(sr*0.004)));
    }
  }
  return b;
}
function softClipCurve(){
  var n = 2048, c = new Float32Array(n);
  for (var i = 0; i < n; i++){
    var x = i/(n-1)*2 - 1, a = Math.abs(x), y = a < 0.8 ? a : 0.8 + 0.18*Math.tanh((a-0.8)/0.18);
    c[i] = x < 0 ? -y : y;
  }
  return c;
}

function buildEngine(ctx, o){
  o = o || {};
  var E = {ctx: ctx, rand: mulberry(o.seed || ((Math.random()*2147483647)|0))};
  var sr = ctx.sampleRate;
  // ortak gurultu (2 sn)
  var nb = ctx.createBuffer(1, Math.floor(sr*2), sr), nd = nb.getChannelData(0);
  for (var i = 0; i < nd.length; i++) nd[i] = E.rand()*2-1;
  E.noise = nb;
  // ana zincir: pre -> kompresor -> sinirlayici -> yumusak kirpma -> sessize alma -> cikis
  E.pre = ctx.createGain();
  var comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.012; comp.release.value = 0.25;
  var mk = ctx.createGain(); mk.gain.value = 2.0;   // +6 dB: yayinda muzik kisik kaliyordu; sinirlayici tepeleri tutar
  var lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -6; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
  var clip = ctx.createWaveShaper(); clip.curve = softClipCurve();
  E.muteGain = ctx.createGain(); E.muteGain.gain.value = 1;
  E.pre.connect(comp); comp.connect(mk); mk.connect(lim); lim.connect(clip); clip.connect(E.muteGain); E.muteGain.connect(ctx.destination);
  // ana veriyolu: muzik (sessiz-kisma + seviye) ve efekt
  E.duck = ctx.createGain(); E.musicVol = ctx.createGain(); E.musicIn = ctx.createGain();
  E.musicIn.gain.value = 0.27;
  E.musicLP = ctx.createBiquadFilter(); E.musicLP.type = 'lowpass'; E.musicLP.frequency.value = 9000; E.musicLP.Q.value = 0.5;
  E.musicIn.connect(E.musicLP); E.musicLP.connect(E.duck); E.duck.connect(E.musicVol); E.musicVol.connect(E.pre);
  E.sfxVol = ctx.createGain(); E.sfxIn = ctx.createGain(); E.sfxIn.gain.value = 0.55; E.sfxIn.connect(E.sfxVol); E.sfxVol.connect(E.pre);
  // iki yankilanma (muzik / efekt) ayni uretilmis dürtü yanıtını kullanir
  var imp = makeImpulse(ctx, 1.9, E.rand);
  function reverb(outTo){
    var inn = ctx.createGain(), cv = ctx.createConvolver(), out = ctx.createGain();
    cv.buffer = imp; out.gain.value = 0.55;
    inn.connect(cv); cv.connect(out); out.connect(outTo);
    return inn;
  }
  E.musRevIn = reverb(E.musicIn);
  E.sfxRevIn = reverb(E.sfxIn);
  E.voices = 0;
  return E;
}

/* her muzik izi: kendi veri yolu (bus) ve yankilanma gonderisi (rev); capraz geciste ikisi birden solar */
function newTrackNodes(E){
  var c = E.ctx, bus = c.createGain(), rev = c.createGain();
  bus.gain.value = 0; rev.gain.value = 0;
  bus.connect(E.musicIn); rev.connect(E.musRevIn);
  return {bus: bus, rev: rev};
}
function fadeNodes(nodes, to, t, tc){
  [nodes.bus.gain, nodes.rev.gain].forEach(function(p){
    p.cancelScheduledValues(t);
    p.setTargetAtTime(to, t, tc);
  });
}
function makeLayer(E, nodes, send, pan, gain){
  var c = E.ctx, inn = c.createGain(), out = c.createGain();
  out.gain.value = gain === undefined ? 1 : gain;
  inn.connect(out);
  if (pan && c.createStereoPanner){ var p = c.createStereoPanner(); p.pan.value = pan; out.connect(p); p.connect(nodes.bus); }
  else out.connect(nodes.bus);
  if (send){ var s = c.createGain(); s.gain.value = send; inn.connect(s); s.connect(nodes.rev); }
  return {in: inn, out: out};
}
function setLayer(E, L, g){ L.out.gain.setTargetAtTime(g, E.ctx.currentTime, 0.35); }

/* ileriye donuk siralayici: bar() olaylari kuyruga koyar, run(ufuk) zamani gelenleri atesler */
function Sequencer(E, track, t0){
  this.E = E; this.track = track; this.t = t0; this.i = 0; this.q = []; this.done = false;
}
Sequencer.prototype.at = function(t, fn){ this.q.push({t: t, fn: fn}); };
Sequencer.prototype.stop = function(){ this.done = true; this.q = []; };
Sequencer.prototype.run = function(horizon){
  var tr = this.track;
  while (!this.done && this.t < horizon){
    var len = tr.bar(this.i, this.t, this);
    this.t += len; this.i++;
    if (!tr.loop && this.i >= tr.bars){ this.done = true; break; }
  }
  if (!this.q.length) return;
  var keep = [], now = this.E.ctx.currentTime;
  for (var k = 0; k < this.q.length; k++){
    var ev = this.q[k];
    if (ev.t < horizon) ev.fn(Math.max(ev.t, now)); else keep.push(ev);
  }
  this.q = keep;
};

/* ======================================================================
   4. PARCALAR (hepsi ozgun beste)
   ====================================================================== */
var CH = {
  Dm:{r:38, t:[50,53,57]}, Bb:{r:34, t:[50,53,58]}, F:{r:41, t:[48,53,57]},
  C:{r:36, t:[48,52,55]}, Gm:{r:43, t:[50,55,58]}, A:{r:33, t:[49,52,57]}
};
var PROG = [['Dm','Dm'],['Bb','Bb'],['F','F'],['C','C'],['Dm','Dm'],['Bb','Bb'],['Gm','A'],['Dm','Dm'],
            ['Dm','Dm'],['Bb','Bb'],['F','F'],['C','C'],['Gm','Gm'],['Dm','Dm'],['A','A'],['A','A']];
var SLOTS = []; PROG.forEach(function(p){ SLOTS.push(p[0], p[1]); });
// "Memleket savas temasi": 16 olcu = 8 olcuk ana ezgi + 8 olcuk varyasyon (re minor, 4/4)
var THEME = [
  'd3:6 f3:2 a3:4 g3:2 f3:2',  'bb3:6 a3:2 f3:4 d3:4',   'f3:4 a3:4 c4:6 a3:2',    'e3:4 g3:4 c4:4 b3:2 g3:2',
  'd4:6 c4:2 a3:4 d4:4',       'bb3:4 d4:4 f4:6 d4:2',   'g3:4 bb3:4 a3:4 c#4:4',  'd4:10 r:2 f3:2 a3:2',
  'd4:4 f4:4 a4:6 g4:2',       'f4:6 d4:2 bb3:4 d4:4',   'c4:4 f4:4 a4:4 g4:2 f4:2','g4:6 e4:2 c4:4 e4:4',
  'bb4:6 a4:2 g4:4 d4:4',      'f4:4 a4:4 d5:6 c5:2',    'c#5:4 a4:4 e4:4 a4:4',   'a4:6 g4:2 e4:4 c#4:2 e4:2'
].map(parseBar);

function battleTrack(E, nodes, cfg){
  var spb = 60/cfg.bpm, step = spb/4, barLen = spb*4, trans = cfg.trans || 0;
  var L1 = makeLayer(E, nodes, 0.09, 0, 1), L2 = makeLayer(E, nodes, 0.25, 0, 1), L3 = makeLayer(E, nodes, 0.34, -0.1, 1),
      L4 = makeLayer(E, nodes, 0.2, 0.22, 1), L5 = makeLayer(E, nodes, 0.22, 0, 1);
  var tr = {loop: true, bars: 16, name: cfg.name};
  tr.setIntensity = function(x){
    if (cfg.fixed) return;
    setLayer(E, L1, 0.8*(0.55 + 0.45*clamp(x*3, 0, 1)));
    setLayer(E, L2, 0.8*clamp((x-0.08)/0.2, 0, 1));
    setLayer(E, L3, clamp((x-0.3)/0.2, 0, 1));
    setLayer(E, L4, clamp((x-0.55)/0.2, 0, 1));
  };
  var x0 = cfg.intensity == null ? 1 : cfg.intensity;
  if (cfg.fixed){ [L1, L2, L3, L4, L5].forEach(function(L, k){ L.out.gain.value = k < 2 ? 0.8 : 1; }); }
  else {
    L1.out.gain.value = 0.8*(0.55 + 0.45*clamp(x0*3, 0, 1)); L2.out.gain.value = 0.8*clamp((x0-0.08)/0.2, 0, 1);
    L3.out.gain.value = clamp((x0-0.3)/0.2, 0, 1);     L4.out.gain.value = clamp((x0-0.55)/0.2, 0, 1);
  }
  tr.bar = function(i, t, S){
    var b = i%16, B = b >= 8, bt = function(s){ return t + s*step; };
    var fill = (b%8 === 7), e;
    // --- 1) davul ostinatosu
    var K = B ? [0,6,8,10] : [0,7,8];
    K.forEach(function(s){ S.at(bt(s)+jt(E), function(tt){ I.kick(E, L1.in, tt, hv(E, s === 0 ? 1 : 0.8)); }); });
    [4, 12].forEach(function(s){ if (!(fill && s === 12)) S.at(bt(s)+jt(E), function(tt){ I.snare(E, L1.in, tt, hv(E, 0.85)); }); });
    if (B) S.at(bt(15), function(tt){ I.snare(E, L1.in, tt, 0.25); });
    [6, 14].forEach(function(s){ S.at(bt(s), function(tt){ I.tom(E, L1.in, tt, hv(E, 0.5), 78); }); });
    for (var s = 0; s < 16; s += 2) (function(s){
      var vv = [0.5,0.2,0.34,0.2][(s/2)%4];
      if (cfg.hype) vv += 0.12;
      S.at(bt(s), function(tt){ I.hat(E, L1.in, tt, hv(E, vv), s === 14 && B); });
    })(s);
    if (fill){
      [[8,150],[10,120],[11,100],[12,88]].forEach(function(p, k){ S.at(bt(p[0]), function(tt){ I.tom(E, L1.in, tt, 0.55+k*0.08, p[1]); }); });
      for (s = 12; s < 16; s++) (function(s){ S.at(bt(s), function(tt){ I.snare(E, L1.in, tt, 0.35+(s-12)*0.17); }); })(s);
    }
    if (b === 0 || b === 8) S.at(t, function(tt){ I.cymbal(E, L1.in, tt, b === 0 ? 0.7 : 0.45, 1.8); });
    // --- 2) pes yayli dem (pad) + bas
    for (var h = 0; h < 2; h++) (function(h){
      var slot = b*2+h, cn = SLOTS[slot], prev = SLOTS[(slot+31)%32], c = CH[cn], th = t + h*8*step;
      if (cn !== prev){
        var run = 1; while (run < 32 && SLOTS[(slot+run)%32] === cn) run++;
        c.t.forEach(function(m, k){ S.at(th, function(tt){ I.strings(E, L2.in, tt, run*8*step + 0.12, m+trans, 0.9, {a: 0.45, r: 0.7, cut: 1100, peak: 0.075}); }); });
      }
      var r = c.r + trans;
      [[0,3,1,0],[3,1,0.55,0],[4,2,0.85,0],[6,1,0.5,12]].forEach(function(p){
        S.at(th + p[0]*step + jt(E), function(tt){ I.bass(E, L2.in, tt, p[1]*step*0.92, r+p[3], hv(E, p[2])); });
      });
    })(h);
    // --- 3) alcak korno ezgisi
    THEME[b].forEach(function(n){
      var acc = (n.s%4 === 0) ? 1 : 0.78;
      S.at(bt(n.s), function(tt){
        I.brass(E, L3.in, tt, n.l*step*0.94, n.m+trans, hv(E, acc), {a: 0.06, open: B ? 1.15 : 1});
        if (B) I.brass(E, L3.in, tt, n.l*step*0.94, n.m+trans-7, hv(E, acc*0.5), {a: 0.08, peak: 0.16});
      });
    });
    // --- 4) ust yayli ostinato (8'lik arpej)
    var ord = B ? [0,2,1,2] : [0,1,2,1];
    for (var q = 0; q < 8; q++) (function(q){
      var c = CH[SLOTS[b*2 + (q >= 4 ? 1 : 0)]], m = c.t[ord[q%4]] + 12 + trans;
      S.at(bt(q*2)+jt(E), function(tt){ I.pluck(E, L4.in, tt, step*1.7, m, hv(E, q%4 === 0 ? 1 : 0.62)); });
    })(q);
    // --- 5) ek katman (tense: gerilim nabzi, last30: zil)
    if (cfg.pulse){
      var rr = CH[SLOTS[b*2]].r + 12 + trans;
      for (var p = 0; p < 4; p++) (function(p){
        var cr = CH[SLOTS[b*2 + (p >= 2 ? 1 : 0)]].r + 12 + trans;
        S.at(bt(p*4), function(tt){ tone(E, L5.in, 'sine', tt, mtof(cr)*1.5, mtof(cr), 0.08, 0.5, 0.22); tone(E, L5.in, 'sine', tt+step*1.5, mtof(cr), mtof(cr)*0.9, 0.08, 0.3, 0.2); });
      })(p);
      if (b%2 === 0) S.at(t, function(tt){
        [78, 79].forEach(function(m, k){ I.strings(E, L5.in, tt, barLen*2, m+trans, 0.8, {a: 1.2, r: 1.2, cut: 2400, peak: 0.032}); });
      });
    }
    if (cfg.hype){
      for (s = 2; s < 16; s += 4) (function(s){ S.at(bt(s), function(tt){ I.cymbal(E, L5.in, tt, 0.28, 0.5); }); })(s);
      if (b%4 === 0) S.at(t, function(tt){ I.cymbal(E, L5.in, tt, 0.6, 1.6); });
      if (b%4 === 3) for (s = 8; s < 16; s++) (function(s){ S.at(bt(s), function(tt){ I.snare(E, L5.in, tt, 0.3+(s-8)*0.07); }); })(s);
    }
    return barLen;
  };
  return tr;
}

/* mehter: 2/4, 92 bpm, re uzerinde hicaz. Ezgi (zurna) 8 olcu; tekrarda bir oktav ustte. */
var MEH_BPM = 92;
var MEHTER = [
  '%d5:2 eb5:1 d5:1 c5:2 d5:2',   '~a4:2 bb4:1 a4:1 g4:2 f#4:2',  'g4:1 a4:1 bb4:2 ~c5:2 bb4:2', '*a4:6 r:2',
  'a4:2 ~bb4:2 c5:2 %d5:2',       'eb5:3 ~d5:1 c5:2 ~bb4:2',      'bb4:2 ~a4:2 g4:2 %f#4:2',     'eb4:1 f#4:1 ~g4:2 *d4:4'
].map(parseBar);
function mehterTrack(E, nodes, cfg){
  var spb = 60/MEH_BPM, step = spb/4, barLen = spb*2;
  var LK = makeLayer(E, nodes, 0.12, 0, 0.5), LD = makeLayer(E, nodes, 0.1, 0, 0.55), LZ = makeLayer(E, nodes, 0.3, 0.05, 1), LB = makeLayer(E, nodes, 0.3, 0, 2.5);
  var tr = {loop: true, bars: 16, name: 'mehter'};
  tr.bar = function(i, t, S){
    var b = i%8, pass = Math.floor(i/8)%2, bt = function(s){ return t + s*step; };
    var last = (b === 7);
    // kos: pes, uzun
    S.at(t, function(tt){ I.kos(E, LK.in, tt, b === 0 ? 1 : 0.8); });
    S.at(bt(4), function(tt){ I.kos(E, LK.in, tt, 0.5); });
    // davul usulu: dum tek tek dum tek
    [[0,'d',1],[2,'t',0.8],[3,'t',0.45],[4,'d',0.8],[6,'t',0.75]].forEach(function(p){
      S.at(bt(p[0])+jt(E)*0.5, function(tt){ (p[1] === 'd' ? I.dum : I.tek)(E, LD.in, tt, hv(E, p[2])); });
    });
    // nakkare: ince cift vurus
    [1, 5, 7].forEach(function(s){
      S.at(bt(s), function(tt){ I.nakkare(E, LD.in, tt, hv(E, 0.7)); I.nakkare(E, LD.in, tt+step*0.5, hv(E, 0.45)); });
    });
    if (b === 3 || last){
      for (var k = 0; k < 8; k++) (function(k){ S.at(bt(4 + k*0.5), function(tt){ I.nakkare(E, LD.in, tt, 0.35 + k*0.07); }); })(k);
    }
    // zil
    S.at(t, function(tt){ I.cymbal(E, LK.in, tt, b === 0 ? 0.55 : 0.32, b === 0 ? 1.4 : 0.55); });
    S.at(bt(4), function(tt){ I.cymbal(E, LK.in, tt, 0.22, 0.4); });
    // zurna
    MEHTER[b].forEach(function(n){
      S.at(bt(n.s)+jt(E)*0.5, function(tt){ I.zurna(E, LZ.in, tt, n.l*step*0.96, n.m + (pass ? 12 : 0), hv(E, n.s%4 === 0 ? 1 : 0.85), n.o); });
    });
    // boru: dem (re-la) + dort olcude bir cagri
    if (b%2 === 0){
      S.at(t, function(tt){
        I.brass(E, LB.in, tt, barLen*2, 50, 0.7, {a: 0.25, r: 0.4, open: 0.7, peak: 0.07, vib: 2});
        I.brass(E, LB.in, tt, barLen*2, 57, 0.5, {a: 0.3, r: 0.4, open: 0.7, peak: 0.07, vib: 2});
        I.brass(E, LB.in, tt, barLen*2, 38, 0.8, {a: 0.2, r: 0.4, open: 0.5, peak: 0.07, vib: 0});
      });
    }
    if (b === 3) S.at(bt(6), function(tt){ I.brass(E, LB.in, tt, step*2, 62, 0.9, {a: 0.02, peak: 0.16}); });
    return barLen;
  };
  return tr;
}

/* intro: tek boru cagrisi + alcak davul tremolosu (6 sn) */
function introTrack(E, nodes){
  var LD = makeLayer(E, nodes, 0.2, 0, 1), LB = makeLayer(E, nodes, 0.4, 0, 1);
  var tr = {loop: false, bars: 1, name: 'intro'};
  tr.bar = function(i, t, S){
    S.at(t, function(tt){ I.kos(E, LD.in, tt, 1); });
    S.at(t+3.3, function(tt){ I.kos(E, LD.in, tt, 0.9); });
    for (var k = 0; k < 72; k++) (function(k){
      var x = k/72;
      S.at(t + 0.15 + k*0.078, function(tt){ I.tom(E, LD.in, tt, 0.12 + 0.55*x*x + 0.08*E.rand(), 72); });
    })(k);
    S.at(t+0.4, function(tt){ I.brass(E, LB.in, tt, 0.55, 50, 0.85, {a: 0.08, r: 0.15}); });
    S.at(t+1.0, function(tt){ I.brass(E, LB.in, tt, 0.55, 57, 0.9, {a: 0.08, r: 0.15}); });
    S.at(t+1.6, function(tt){ I.brass(E, LB.in, tt, 1.5, 62, 1, {a: 0.1, r: 0.3, vib: 8}); });
    S.at(t+3.4, function(tt){
      [38, 50, 57, 62].forEach(function(m, k){ I.brass(E, LB.in, tt, 2.0, m, k === 3 ? 1 : 0.8, {a: 0.5, r: 0.7, peak: 0.16}); });
    });
    S.at(t+5.1, function(tt){ nz(E, LD.in, 'highpass', 5000, 0, 0, 0.7, tt, 0.22, 1.2, 0.8); });
    S.at(t+5.9, function(tt){ I.kos(E, LD.in, tt, 1); I.cymbal(E, LD.in, tt, 0.6, 1.8); });
    return 6;
  };
  return tr;
}

/* victory: 6 sn boru + davul fanfari (re majör), sonra hafif dem (pad + arpej) dongusu */
var FANFARE = ['d4:3 r:1 d4:2 f#4:2 a4:6 r:2', 'd5:4 c#5:2 d5:2 e5:4 f#5:4', 'e5:2 d5:2 e5:2 f#5:2 d5:8'].map(parseBar);
var VPAD = [[50,54,57], [50,55,59], [50,54,59], [49,52,57]], VROOT = [38, 43, 35, 33];
function victoryTrack(E, nodes){
  var bpm = 112, spb = 60/bpm, step = spb/4, barLen = spb*4;
  var LD = makeLayer(E, nodes, 0.18, 0, 1), LB = makeLayer(E, nodes, 0.35, 0, 1), LP = makeLayer(E, nodes, 0.3, 0, 1);
  var tr = {loop: true, bars: 7, name: 'victory'};
  tr.bar = function(i, t, S){
    var bt = function(s){ return t + s*step; };
    if (i < 3){
      FANFARE[i].forEach(function(n){
        S.at(bt(n.s), function(tt){
          var dd = n.l*step*0.95;
          I.brass(E, LB.in, tt, dd, n.m, hv(E, 1), {a: 0.04, peak: 0.19});
          I.brass(E, LB.in, tt, dd, n.m-7, hv(E, 0.7), {a: 0.05, peak: 0.19});
          I.brass(E, LB.in, tt, dd, n.m-12, hv(E, 0.6), {a: 0.05, peak: 0.19});
        });
      });
      if (i === 0) [0,3,6,8,11,14].forEach(function(s){ S.at(bt(s), function(tt){ I.tom(E, LD.in, tt, 0.7, s%2 ? 120 : 85); }); });
      if (i === 0) S.at(t, function(tt){ I.kos(E, LD.in, tt, 1); });
      if (i === 1){
        for (var s = 8; s < 16; s++) (function(s){ S.at(bt(s), function(tt){ I.snare(E, LD.in, tt, 0.3+(s-8)*0.1); }); })(s);
        [0,4].forEach(function(s){ S.at(bt(s), function(tt){ I.kos(E, LD.in, tt, 0.7); }); });
      }
      if (i === 2){
        S.at(t, function(tt){ I.kos(E, LD.in, tt, 0.9); I.tom(E, LD.in, tt, 0.8, 110); });
        S.at(bt(8), function(tt){ I.kos(E, LD.in, tt, 1); I.cymbal(E, LD.in, tt, 0.8, 2.6); I.snare(E, LD.in, tt, 0.8); });
      }
    } else {
      var k = (i-3)%4;
      VPAD[k].forEach(function(m){ S.at(t, function(tt){ I.strings(E, LP.in, tt, barLen+0.3, m, 0.9, {a: 0.5, r: 0.8, cut: 1400, peak: 0.07}); }); });
      S.at(t, function(tt){ I.bass(E, LP.in, tt, barLen*0.9, VROOT[k], 0.7, {peak: 0.3}); });
      for (var q = 0; q < 8; q++) (function(q){
        var m = VPAD[k][[0,1,2,1][q%4]] + 24 - (q > 3 ? 12 : 0);
        S.at(bt(q*2), function(tt){ I.bell(E, LP.in, tt, m, q%4 === 0 ? 0.55 : 0.32, 0.5); });
      })(q);
      if (k === 0) S.at(t, function(tt){ I.cymbal(E, LD.in, tt, 0.18, 1.2); });
    }
    return barLen;
  };
  return tr;
}

var TRACKS = {
  intro:   {trim: 1.0, make: function(E, n){ return introTrack(E, n); }},
  battle:  {trim: 1.0, ambient: true, make: function(E, n, o){ return battleTrack(E, n, {bpm: 100, intensity: o.intensity, name: 'battle'}); }},
  tense:   {trim: 1.0, ambient: true, make: function(E, n, o){ return battleTrack(E, n, {bpm: 104, trans: 1, pulse: true, fixed: true, name: 'tense'}); }},
  last30:  {trim: 1.0, ambient: true, make: function(E, n, o){ return battleTrack(E, n, {bpm: 124, hype: true, fixed: true, name: 'last30'}); }},
  mehter:  {trim: 1.4, make: function(E, n){ return mehterTrack(E, n, {}); }},
  victory: {trim: 1.2, make: function(E, n){ return victoryTrack(E, n); }}
};
var TRACK_SECONDS = {intro: 7, battle: 40, tense: 20, last30: 16, mehter: 21, victory: 14};

/* ======================================================================
   5. EFEKTLER
   ====================================================================== */
var FX = {};
function def(name, dur, rev, fn, g){ FX[name] = {dur: dur, rev: rev, fn: fn, g: g || 1}; }

def('sword', 1.2, 0.22, function(E, t, d, o){
  var v = o.v != null ? (o.v|0)%3 : Math.floor(E.rand()*3);
  var base = [1750, 2230, 1480][v]*(0.97 + E.rand()*0.06), dec = [0.6, 0.45, 0.75][v];
  [1, 2.32, 4.19, 6.43].forEach(function(r, i){ tone(E, d, 'sine', t, base*r, 0, 0, [0.3, 0.22, 0.14, 0.08][i], dec/(1 + i*0.5)); });
  nz(E, d, 'highpass', 2800, 0, 0, 0.7, t, 0.4, 0.07);
  nz(E, d, 'bandpass', 4200, 1800, 0.08, 3, t, 0.22, 0.12);
  tone(E, d, 'triangle', t, base*0.5, 0, 0, 0.12, 0.05);
}, 0.8);
def('hit', 0.4, 0.08, function(E, t, d){
  tone(E, d, 'sine', t, 160, 50, 0.1, 0.9, 0.17);
  nz(E, d, 'lowpass', 1200, 0, 0, 0.7, t, 0.55, 0.09);
  tone(E, d, 'triangle', t, 300, 120, 0.05, 0.3, 0.06);
});
def('arrow', 0.7, 0.12, function(E, t, d){
  nz(E, d, 'bandpass', 2600, 900, 0.3, 1.2, t, 0.5, 0.28, 0.1);
  tone(E, d, 'sine', t+0.3, 220, 90, 0.06, 0.55, 0.12);
  nz(E, d, 'lowpass', 700, 0, 0, 0.7, t+0.3, 0.3, 0.1);
});
def('horse', 1.6, 0.14, function(E, t, d){
  [0, 0.14, 0.28, 0.58, 0.72, 0.86].forEach(function(dt, i){
    var tt = t + dt, v = 0.65 + 0.35*E.rand();
    tone(E, d, 'sine', tt, 130, 72, 0.05, 0.6*v, 0.11);
    nz(E, d, 'lowpass', 700, 0, 0, 0.7, tt, 0.5*v, 0.06);
    nz(E, d, 'bandpass', 1100, 0, 0, 3, tt, 0.22*v, 0.045);
  });
});
def('cannon', 2.2, 0.38, function(E, t, d){
  tone(E, d, 'sine', t, 110, 28, 0.35, 1.0, 0.65);
  tone(E, d, 'triangle', t, 70, 35, 0.3, 0.5, 0.5);
  nz(E, d, 'lowpass', 1400, 120, 1.2, 0.5, t, 0.9, 0.9);
  nz(E, d, 'bandpass', 2500, 0, 0, 0.8, t, 0.35, 0.03);
  nz(E, d, 'lowpass', 300, 80, 1.5, 0.5, t+0.1, 0.5, 1.3, 0.08);
});
function debris(E, d, t, n, span, peak){
  for (var i = 0; i < n; i++){
    var x = i/n, tt = t + E.rand()*span, f = 250 + E.rand()*1200;
    nz(E, d, 'bandpass', f, f*0.5, 0.15, 2, tt, peak*(1 - x*0.7)*(0.4 + 0.6*E.rand()), 0.08 + E.rand()*0.14);
    if (E.rand() < 0.35) tone(E, d, 'sine', tt, 120 + E.rand()*80, 55, 0.08, peak*0.5, 0.12);
  }
}
def('wall', 1.8, 0.3, function(E, t, d){
  nz(E, d, 'lowpass', 180, 0, 0, 0.8, t, 0.7, 0.9, 0.05);
  tone(E, d, 'sine', t, 62, 38, 0.5, 0.65, 0.6);
  debris(E, d, t, 16, 0.9, 0.45);
});
def('stage', 3.6, 0.4, function(E, t, d){
  tone(E, d, 'sine', t, 100, 26, 0.5, 1.0, 0.9);
  nz(E, d, 'lowpass', 1100, 90, 2.4, 0.5, t, 0.9, 1.9, 0.04);
  nz(E, d, 'lowpass', 220, 0, 0, 0.8, t+0.3, 0.7, 1.8, 0.4);
  debris(E, d, t, 34, 2.0, 0.5);
});
def('horn', 2.4, 0.4, function(E, t, d){
  I.brass(E, d, t, 0.6, 50, 0.9, {a: 0.12, r: 0.2, peak: 0.26});
  I.brass(E, d, t, 0.6, 38, 0.8, {a: 0.12, r: 0.2, peak: 0.26});
  I.brass(E, d, t+0.55, 1.0, 57, 1, {a: 0.12, r: 0.45, peak: 0.26, vib: 7});
  I.brass(E, d, t+0.55, 1.0, 45, 0.8, {a: 0.12, r: 0.45, peak: 0.26});
});
def('shield', 0.9, 0.18, function(E, t, d){
  nz(E, d, 'bandpass', 1200, 0, 0, 6, t, 0.55, 0.09);
  tone(E, d, 'sine', t, 900, 0, 0, 0.2, 0.3);
  tone(E, d, 'sine', t, 1580, 0, 0, 0.12, 0.22);
  tone(E, d, 'sine', t, 130, 70, 0.06, 0.7, 0.12);
});
def('rankup', 1.8, 0.35, function(E, t, d){
  [74, 78, 81, 86].forEach(function(m, i){ I.bell(E, d, t + i*0.085, m, 0.8, 0.7); });
  tone(E, d, 'sine', t+0.34, mtof(98), 0, 0, 0.06, 0.9);
}, 0.9);
def('combo', 0.6, 0.2, function(E, t, d, o){
  var lv = clamp(o.level == null ? 0.3 : o.level, 0, 1), f = 520*(1 + lv*0.6);
  [1, 1.26, 1.5].forEach(function(r, i){
    var tt = t + i*0.06;
    tone(E, d, 'triangle', tt, f*r, 0, 0, 0.35, 0.16);
    tone(E, d, 'square', tt, f*r*2, 0, 0, 0.05, 0.08);
  });
});
def('cheer', 2.8, 0.3, function(E, t, d){
  var c = E.ctx, n = 2.4, g = c.createGain(), am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  env(g.gain, t, 1.5, 0.5, 0.35, 0.8, 0.6, 0.8);
  am.gain.value = 0.75; lfo.frequency.value = 6.5; lg.gain.value = 0.22; lfo.connect(lg); lg.connect(am.gain); lfo.start(t); lfo.stop(t+n+0.5);
  am.connect(g); g.connect(d);
  [[650, 2], [1300, 2], [2700, 1.5]].forEach(function(p){
    var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = p[0]; f.Q.value = p[1];
    var s = noiseSrc(E, t, n+0.5); s.connect(f); f.connect(am);
  });
  for (var k = 0; k < 4; k++){
    var f0 = 190 + E.rand()*130, tt = t + E.rand()*0.4, o = c.createOscillator(), bp = c.createBiquadFilter(), og = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, tt); o.frequency.linearRampToValueAtTime(f0*1.25, tt+0.9);
    bp.type = 'bandpass'; bp.frequency.value = 850; bp.Q.value = 5;
    env(og.gain, tt, 1.0, 0.18, 0.3, 0.4, 0.7, 0.5);
    o.connect(bp); bp.connect(og); og.connect(d); o.start(tt); o.stop(tt+2.2);
  }
}, 0.9);
def('join', 1.3, 0.3, function(E, t, d){
  I.bell(E, d, t, 79, 0.6, 0.45); I.bell(E, d, t+0.09, 86, 0.5, 0.6);
}, 1.5);
def('tick', 0.25, 0.04, function(E, t, d){
  tone(E, d, 'triangle', t, 1000, 0, 0, 0.5, 0.04);
  nz(E, d, 'highpass', 3000, 0, 0, 0.7, t, 0.3, 0.015);
});
/* oyunun urettigi ek olay adlari */
def('mehter', 2.6, 0.35, function(E, t, d){
  I.kos(E, d, t, 1); I.cymbal(E, d, t, 0.7, 1.8);
  [0.2, 0.4, 0.6].forEach(function(dt, i){ I.dum(E, d, t+dt, 0.8); I.tek(E, d, t+dt+0.1, 0.6); });
  I.brass(E, d, t+0.3, 1.4, 50, 1, {a: 0.2, r: 0.4, peak: 0.22});
  I.brass(E, d, t+0.3, 1.4, 57, 0.8, {a: 0.2, r: 0.4, peak: 0.22});
}, 0.9);
def('intro', 2.4, 0.4, function(E, t, d){ FX.horn.fn(E, t, d, {}); });
def('start', 2.6, 0.4, function(E, t, d){ FX.horn.fn(E, t, d, {}); FX.cannon.fn(E, t+0.9, d, {}); }, 0.8);
def('victory', 3.0, 0.4, function(E, t, d){
  [[0, 62], [0.18, 66], [0.36, 69]].forEach(function(p){ I.brass(E, d, t+p[0], 0.3, p[1], 1, {a: 0.03, peak: 0.24}); });
  [74, 69, 62, 57].forEach(function(m){ I.brass(E, d, t+0.6, 1.6, m, 0.9, {a: 0.05, r: 0.5, peak: 0.2}); });
  I.cymbal(E, d, t+0.6, 0.6, 2); I.kos(E, d, t+0.6, 0.9);
}, 0.9);
def('last30', 2.0, 0.3, function(E, t, d){
  I.brass(E, d, t, 0.5, 45, 1, {a: 0.06, peak: 0.26}); I.brass(E, d, t+0.6, 0.9, 45, 1, {a: 0.06, peak: 0.26});
  I.kos(E, d, t, 1); I.kos(E, d, t+0.6, 1);
});
def('revenge', 2.0, 0.35, function(E, t, d){
  I.brass(E, d, t, 1.2, 38, 1, {a: 0.15, r: 0.4, peak: 0.28, vib: 8}); I.brass(E, d, t, 1.2, 45, 0.8, {a: 0.15, r: 0.4, peak: 0.28});
  [0, 0.25, 0.5].forEach(function(dt){ I.tom(E, d, t+dt, 0.9, 80); });
});

/* ses vermeden calan efekt: seviye (pan/gain) + yankilanma gonderisi */
function playFx(E, name, t, o){
  var f = FX[name]; if (!f) return 0;
  o = o || {};
  var c = E.ctx, v = c.createGain();
  v.gain.value = (o.gain != null ? o.gain : 1)*f.g;
  var pan = clamp(+o.pan || 0, -1, 1);
  if (pan !== 0 && c.createStereoPanner){ var p = c.createStereoPanner(); p.pan.value = pan; v.connect(p); p.connect(E.sfxIn); }
  else v.connect(E.sfxIn);
  var s = c.createGain(); s.gain.value = f.rev; v.connect(s); s.connect(E.sfxRevIn);
  f.fn(E, t, v, o);
  return f.dur;
}

/* savas uguldusu: seviyeli surekli doku + seyrek kilic cinlamalari */
function makeAmbience(E){
  var c = E.ctx, out = c.createGain(), lvl = 0, nextClink = 0;
  out.gain.value = 0; out.connect(E.sfxIn);
  var rev = c.createGain(); rev.gain.value = 0.2; out.connect(rev); rev.connect(E.sfxRevIn);
  var srcs = [];
  [[480, 0.7, 0.55], [1700, 0.9, 0.3], [3400, 1.2, 0.14]].forEach(function(p, i){
    var s = c.createBufferSource(); s.buffer = E.noise; s.loop = true;
    var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = p[0]; f.Q.value = p[1];
    var g = c.createGain(); g.gain.value = p[2];
    var lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.23 + i*0.17; lg.gain.value = p[2]*0.45; lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(0, E.rand()); lfo.start(0); srcs.push(s, lfo);
  });
  return {
    out: out,
    setLevel: function(x, now){
      lvl = clamp(x, 0, 1);
      var v = lvl*lvl*0.2;
      if (now) out.gain.setValueAtTime(v, 0); else out.gain.setTargetAtTime(v, c.currentTime, 0.6);
    },
    tick: function(horizon){
      if (nextClink < c.currentTime) nextClink = c.currentTime + 0.05;
      while (nextClink < horizon){
        if (lvl > 0.08) playFx(E, 'sword', nextClink, {gain: 0.14 + 0.16*E.rand()*lvl, pan: E.rand()*1.6 - 0.8, v: Math.floor(E.rand()*3)});
        nextClink += (1.5 - 1.2*lvl)*(0.4 + 1.2*E.rand());
      }
    },
    stop: function(){ srcs.forEach(function(s){ try { s.stop(); } catch (e) {} }); }
  };
}

/* ======================================================================
   6. CEVRIMDISI CEVIRME (test)
   ====================================================================== */
function render(name, seconds, opts){
  opts = opts || {};
  var OAC = G.OfflineAudioContext || G.webkitOfflineAudioContext;
  if (!OAC) return Promise.reject(new Error('OfflineAudioContext yok'));
  var isTrack = !!TRACKS[name] && opts.kind !== 'fx', isFx = !!FX[name] || name === 'ambience';
  if (!isTrack && !isFx) return Promise.reject(new Error('bilinmeyen ses: '+name));
  seconds = seconds || (isTrack ? TRACK_SECONDS[name] : name === 'ambience' ? 8 : FX[name].dur + 0.3);
  var sr = opts.sampleRate || 44100;
  try {
    var ctx = new OAC(2, Math.ceil(sr*seconds), sr);
    var E = buildEngine(ctx, {seed: opts.seed || 1234});
    if (isTrack){
      var nodes = newTrackNodes(E), td = TRACKS[name];
      nodes.bus.gain.value = td.trim; nodes.rev.gain.value = td.trim;
      var trk = td.make(E, nodes, {intensity: opts.intensity == null ? 1 : opts.intensity});
      var seq = new Sequencer(E, trk, 0);
      seq.run(seconds + 0.01);
    } else if (name === 'ambience'){
      var amb = makeAmbience(E); amb.setLevel(opts.level == null ? 0.85 : opts.level, true); amb.tick(seconds);
    } else {
      playFx(E, name, 0.05, opts);
    }
    return ctx.startRendering();
  } catch (e){ return Promise.reject(e); }
}

/* ======================================================================
   7. CANLI ISTEMCI: MF.audio.create()
   ====================================================================== */
var LOOKAHEAD = 0.25, TIMER_MS = 100, XFADE = 1.2, MAX_VOICES = 24, MAX_PER_SEC = 6, DUCK = 0.4;

function create(opts){
  opts = opts || {};
  var AC = opts.AudioContext !== undefined ? opts.AudioContext : (G.AudioContext || G.webkitAudioContext || null);
  var synth = opts.speechSynthesis !== undefined ? opts.speechSynthesis : (G.speechSynthesis || null);
  var Utt = opts.SpeechSynthesisUtterance !== undefined ? opts.SpeechSynthesisUtterance : (G.SpeechSynthesisUtterance || null);
  var ctx = null, E = null, amb = null, timer = null, cur = null, voice = null, speechState = 'unsupported', message = '', audioErr = '';
  var st = {enabled: false, muted: false, wanted: 'off', intensity: 0.4, vol: {music: 0.8, sfx: 0.9, voice: 1}};
  var hist = {}, speaking = null, pending = [], watchdog = null, ducked = false, pollTimer = null, pollN = 0;

  /* ---- konusma ---- */
  function refreshVoices(){
    if (!synth || typeof synth.getVoices !== 'function' || !Utt){ speechState = 'unsupported'; message = 'Konuşma desteklenmiyor'; voice = null; return null; }
    var list = [];
    try { list = synth.getVoices() || []; } catch (e) { list = []; }
    voice = pickVoice(list);
    speechState = voice ? 'ok' : 'no-voice';
    message = voice ? '' : 'Türkçe ses bulunamadı';
    return voice;
  }
  if (synth){
    try {
      if (synth.addEventListener) synth.addEventListener('voiceschanged', refreshVoices);
      else if ('onvoiceschanged' in synth) synth.onvoiceschanged = refreshVoices;
    } catch (e) {}
    refreshVoices();
    if (!voice && typeof setInterval === 'function'){   // sesler gec gelebilir ya da olay hic gelmeyebilir
      pollTimer = setInterval(function(){
        if (refreshVoices() || ++pollN > 20){ clearInterval(pollTimer); pollTimer = null; }
      }, 700);
      if (pollTimer && pollTimer.unref) pollTimer.unref();
    }
  }
  function duckLevel(){ return cur && cur.name === 'mehter' ? 0.8 : DUCK; }
  function applyDuck(){
    if (E) { E.duck.gain.cancelScheduledValues(ctx.currentTime); E.duck.gain.setTargetAtTime(ducked ? duckLevel() : 1, ctx.currentTime, ducked ? 0.06 : 0.25); }
  }
  function duck(on){
    if (ducked === on) return;
    ducked = on;
    applyDuck();
  }
  function speakNext(){
    if (watchdog){ clearTimeout(watchdog); watchdog = null; }
    speaking = null;
    if (!pending.length){ duck(false); return; }
    speakNow(pending.shift());
  }
  function speakNow(text){
    var u;
    try {
      u = new Utt(text);
      u.voice = voice; u.lang = 'tr-TR'; u.rate = 1; u.pitch = 1; u.volume = st.vol.voice;
    } catch (e) { speaking = null; duck(false); return false; }
    var done = false;
    function end(){ if (done) return; done = true; if (speaking === u) speakNext(); }
    u.onend = end; u.onerror = end;
    speaking = u;
    duck(true);
    watchdog = setTimeout(end, Math.min(14000, 1500 + 110*text.length));
    try { synth.speak(u); } catch (e) { end(); return false; }
    return true;
  }
  var pron = {cavus: opts.pron && opts.pron.cavus != null ? clampVar(opts.pron.cavus, 6) : 1};
  function setPron(w, n){ var k = pronKey(w) || (w === 'cavus' ? 'cavus' : null); if (!k) return false; pron[k] = clampVar(n, PRON_VARIANTS[k].length); return true; }
  function getPron(w){ var k = pronKey(w) || (w === 'cavus' ? 'cavus' : null); return k ? pron[k] : 0; }
  /* yayinci denemesi: oyun/ses acik olmasa da calisir; Turkce ses yoksa false */
  function sayTest(n){
    var s = cleanText('Çavuş. Ali çavuş oldu.', {cavus: clampVar(n == null ? pron.cavus : n, 6)});
    if (st.muted) return false;
    refreshVoices();
    if (!voice) return false;
    pending = [];
    if (speaking){ try { if (synth.cancel) synth.cancel(); } catch (e) {} speaking = null; }
    return speakNow(s);
  }
  function say(text){
    var s = cleanText(text, pron);
    if (!s || !st.enabled || st.muted) return false;
    refreshVoices();
    if (!voice) return false;                       // Turkce ses yoksa susar
    if (!speaking) return speakNow(s);
    pending.push(s);
    while (pending.length > 2) pending.shift();     // en eski bekleyen duser
    return true;
  }

  /* ---- ses motoru ---- */
  function applyVolumes(){
    if (!E) return;
    var t = ctx.currentTime;
    E.musicVol.gain.setTargetAtTime(st.vol.music*st.vol.music, t, 0.05);
    E.sfxVol.gain.setTargetAtTime(st.vol.sfx*st.vol.sfx, t, 0.05);
    E.muteGain.gain.setTargetAtTime(st.muted ? 0 : 1, t, 0.04);
  }
  function resume(){
    if (!ctx) return;
    try {
      if (ctx.state !== 'running' && ctx.resume){ var p = ctx.resume(); if (p && p.catch) p.catch(function(){}); }
    } catch (e) {}
  }
  function tick(){
    if (!ctx) return;
    if (ctx.state !== 'running'){ if (ctx.state === 'interrupted') resume(); return; }
    var hz = LOOKAHEAD;
    try { if (typeof document !== 'undefined' && document.hidden) hz = 2.0; } catch (e) {}
    var hor = ctx.currentTime + hz;
    try {
      if (cur) cur.seq.run(hor);
      if (amb) amb.tick(hor);
    } catch (e) { audioErr = String(e && e.message || e); }
  }
  function setAmbient(){
    if (!amb) return;
    amb.setLevel(cur && TRACKS[cur.name].ambient ? st.intensity : 0);
  }
  function startTrack(name){
    if (!ctx) return;
    var now = ctx.currentTime + 0.02, prev = cur;
    if (prev){
      fadeNodes(prev.nodes, 0, now, XFADE/4);
      prev.seq.stop();
      var pn = prev.nodes;
      setTimeout(function(){ try { pn.bus.disconnect(); pn.rev.disconnect(); } catch (e) {} }, (XFADE + 0.8)*1000);
    }
    cur = null;
    if (name !== 'off'){
      var td = TRACKS[name], nodes = newTrackNodes(E);
      var trk = td.make(E, nodes, {intensity: st.intensity});
      cur = {name: name, nodes: nodes, trk: trk, seq: new Sequencer(E, trk, now + 0.05)};
      nodes.bus.gain.setValueAtTime(0, now); nodes.rev.gain.setValueAtTime(0, now);
      fadeNodes(nodes, td.trim, now, prev ? XFADE/4 : 0.03);
      if (trk.setIntensity) trk.setIntensity(st.intensity);
      tick();
    }
    setAmbient();
    if (ducked) applyDuck();
  }
  function build(){
    var c = null;
    try { c = new AC({latencyHint: 'interactive', sampleRate: 44100}); }
    catch (e) { c = new AC(); }
    ctx = c;
    E = buildEngine(ctx);
    amb = makeAmbience(E);
    applyVolumes();
    try { ctx.addEventListener('statechange', function(){ if (ctx.state === 'suspended' || ctx.state === 'interrupted') resume(); }); } catch (e) {}
    try { // iOS: bos tampon ile kilidi ac
      var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) {}
    timer = setInterval(tick, TIMER_MS);
    if (timer && timer.unref) timer.unref();
  }
  function enable(){
    st.enabled = true;
    refreshVoices();
    if (!AC){ audioErr = 'AudioContext yok'; return false; }
    try {
      if (!ctx){ build(); if (st.wanted !== 'off') startTrack(st.wanted); }
      resume();
      audioErr = '';
      return true;
    } catch (e) {
      audioErr = String(e && e.message || e); ctx = null; E = null; amb = null;
      if (timer){ clearInterval(timer); timer = null; }
      return false;
    }
  }
  function setMuted(m){
    st.muted = !!m;
    applyVolumes();
    if (st.muted){
      pending = []; speaking = null; if (watchdog){ clearTimeout(watchdog); watchdog = null; }
      try { if (synth && synth.cancel) synth.cancel(); } catch (e) {}
      duck(false);
    }
  }
  function setVolume(v){
    v = v || {};
    ['music', 'sfx', 'voice'].forEach(function(k){ if (typeof v[k] === 'number' && v[k] === v[k]) st.vol[k] = clamp(v[k], 0, 1); });
    applyVolumes();
  }
  function music(name){
    name = String(name);
    if (name !== 'off' && !TRACKS[name]) return false;
    st.wanted = name;
    if (!ctx) return true;
    if (cur && cur.name === name) return true;
    if (!cur && name === 'off') return true;
    try { startTrack(name); } catch (e) { audioErr = String(e && e.message || e); return false; }
    return true;
  }
  function intensity(x){
    st.intensity = clamp(+x || 0, 0, 1);
    if (cur && cur.trk.setIntensity && ctx) cur.trk.setIntensity(st.intensity);
    setAmbient();
  }
  function sfx(name, o){
    if (!st.enabled || st.muted || !ctx || !E || !FX[name]) return false;
    var now = Date.now(), h = hist[name] || (hist[name] = []);
    while (h.length && now - h[0] > 1000) h.shift();
    if (h.length >= MAX_PER_SEC || E.voices >= MAX_VOICES) return false;
    h.push(now);
    var dur;
    try { dur = playFx(E, name, ctx.currentTime + 0.01, o || {}); } catch (e) { audioErr = String(e && e.message || e); return false; }
    E.voices++;
    setTimeout(function(){ E.voices = Math.max(0, E.voices - 1); }, (dur + 0.2)*1000);
    return true;
  }
  function status(){
    return {
      enabled: st.enabled, muted: st.muted, voice: voice ? voice.name : null, track: cur ? cur.name : 'off',
      audio: !!ctx, state: ctx ? ctx.state : (AC ? 'none' : 'unsupported'), speech: speechState, message: speechState === 'ok' ? '' : message,
      error: audioErr, intensity: st.intensity, ducked: ducked, voices: E ? E.voices : 0,
      volume: {music: st.vol.music, sfx: st.vol.sfx, voice: st.vol.voice}
    };
  }
  function dispose(){
    if (timer){ clearInterval(timer); timer = null; }
    if (pollTimer){ clearInterval(pollTimer); pollTimer = null; }
    if (watchdog){ clearTimeout(watchdog); watchdog = null; }
    try { if (amb) amb.stop(); if (ctx && ctx.close) ctx.close(); } catch (e) {}
    ctx = null; E = null; cur = null; st.enabled = false;
  }
  return {enable: enable, setMuted: setMuted, setVolume: setVolume, music: music, intensity: intensity, sfx: sfx, say: say, sayTest: sayTest, setPron: setPron, getPron: getPron, status: status, dispose: dispose,
          tracks: Object.keys(TRACKS), effects: Object.keys(FX)};
}

MF.audio = {
  create: create, cleanName: cleanName, cleanText: cleanText, setPronunciation: setPronunciation, getPronunciation: getPronunciation, pronVariants: pronVariants, pickVoice: pickVoice, render: render,
  tracks: Object.keys(TRACKS), effects: Object.keys(FX), trNum: trNum,
  _meta: {mehterBpm: MEH_BPM, battleBpm: 100, battleBarSeconds: 60/100*4, battleBars: 16, mehterBarSeconds: 60/MEH_BPM*2}
};
if (typeof module !== 'undefined' && module.exports) module.exports = MF.audio;
})();
