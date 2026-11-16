/* node test/audio.test.js
   (a) saf metin fonksiyonlari + Turkce ses secimi + konusma kuyrugu (sahte speechSynthesis, node)
   (b) Playwright/Chromium: her parca ve efekt OfflineAudioContext ile cevrilir ve olculur; canli yol bir kez calistirilir.
   Bitis kodu: hepsi gecerse 0, aksi halde 1. Tarayici kismini atlamak icin AUDIO_NO_BROWSER=1. */
var path = require('path');
var A = require(path.join(__dirname, '..', 'js', 'audio.js'));

var fails = 0, checks = 0;
function ok(cond, msg){ checks++; if (!cond){ fails++; console.log('  FAIL: ' + msg); } }
function eq(a, b, msg){ ok(a === b, msg + '  (beklenen ' + JSON.stringify(b) + ', gelen ' + JSON.stringify(a) + ')'); }

/* ---------------------------------------------------------------- (a) metin */
(function textTests(){
  console.log('[a] metin temizligi');
  eq(A.cleanName('Ayşe_60'), 'Ayşe', 'Ayşe_60');
  eq(A.cleanName('xX_KRAL.34_Xx'), 'Kral', 'xX_KRAL.34_Xx');
  eq(A.cleanName('😀🔥✨'), 'bir izleyici', 'yalniz emoji');
  eq(A.cleanName('1234_56'), 'bir izleyici', 'yalniz rakam');
  eq(A.cleanName(''), 'bir izleyici', 'bos');
  eq(A.cleanName(null), 'bir izleyici', 'null');
  eq(A.cleanName('ali-veli.99'), 'Ali Veli', 'tire/nokta');
  eq(A.cleanName('Seeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'), 'Seee', 'uzun tekrar + 24 kesme');
  eq(A.cleanName('Merhabaaaaaaaaaaa'), 'Merhabaaa', 'tekrar 3 e iner');
  eq(A.cleanName('ŞÜKRÜ_1905'), 'Şükrü', 'buyuk harf tr kurali');
  eq(A.cleanName('IŞIK'), 'Işık', 'I -> ı');
  ok(A.cleanName('abcdefghij klmnopqrst uvwxyz abc').length <= 24, '24 karakter siniri');
  eq(A.cleanName('𝓐𝓵𝓲 Veli'), 'Ali Veli', 'sus harfleri NFKC');
  eq(A.cleanName('Мария'), 'bir izleyici', 'Kiril harfler atilir');

  eq(A.cleanText('İSTANBUL HÜCUM'), 'İstanbul hücum', 'buyuk harf tr kucultme + cumle basi');
  eq(A.cleanText('IŞIK DÜŞTÜ'), 'Işık düştü', 'I -> ı, İ -> i');
  eq(A.cleanText('x10 KOMBO'), 'On kat kombo', 'x10');
  eq(A.cleanText('×1.5'), 'Bir buçuk kat', '×1.5');
  eq(A.cleanText('x2.5 hasar'), 'İki buçuk kat hasar', 'x2.5');
  eq(A.cleanText('34 İstanbul'), 'İstanbul', 'plaka + il');
  eq(A.cleanText('06 Ankara düştü'), 'Ankara düştü', 'plaka 06');
  eq(A.cleanText('5 elmas'), 'Beş elmas', 'plaka olmayan sayi kalir');
  eq(A.cleanText('1500 elmas'), 'Bin beş yüz elmas', 'sayi okunusu');
  eq(A.cleanText('30 sn kaldı'), 'Otuz saniye kaldı', 'sn');
  eq(A.cleanText('Son 30 SN'), 'Son otuz saniye', 'SN');
  eq(A.cleanText('Ayşe_60 İstanbul fethetti!!!!'), 'Ayşe İstanbul fethetti!', 'ad + tekrarli ünlem');
  eq(A.cleanText('Çavuş Paşa'), 'Çavuş Paşa', 'Çavuş Paşa bozulmaz');
  eq(A.cleanText('Merhabaaaaaaaaaa 😀 millet'), 'Merhabaaa millet', 'emoji + uzun tekrar');
  eq(A.cleanText('xX_KRAL.34_Xx çavuş geldi'), 'Kral çavuş geldi', 'ham ad metin icinde');
  eq(A.cleanText('😀🔥'), '', 'yalniz emoji metin');
  ok(A.cleanText('a '.repeat(300)).length <= 160, 'uzunluk siniri');
  eq(A.trNum(1000), 'bin', 'bin');
  eq(A.trNum(21), 'yirmi bir', '21');
  eq(A.trNum(2005000), 'iki milyon beş bin', 'milyon');
})();

/* ---------------------------------------------------------------- (a) ses secimi */
function V(name, lang, local){ return {name: name, lang: lang, localService: !!local, voiceURI: name}; }
function fakeSynth(voices){
  var l = {};
  return {
    voices: voices || [], spoken: [], cancelled: 0,
    getVoices: function(){ return this.voices; },
    addEventListener: function(n, f){ (l[n] = l[n] || []).push(f); },
    fire: function(n){ (l[n] || []).forEach(function(f){ f(); }); },
    speak: function(u){ this.spoken.push(u); },
    cancel: function(){ this.cancelled++; this.spoken = []; }
  };
}
function FakeUtt(text){ this.text = text; this.voice = null; this.lang = ''; this.rate = 0; this.pitch = 0; this.volume = 0; }

(function voiceTests(){
  console.log('[a] Turkce ses secimi');
  var en = V('Google US English', 'en-US', false), tr1 = V('Microsoft Tolga', 'tr-TR', true), tr2 = V('Google Türkçe', 'tr-TR', false),
      tr3 = V('Piper', 'tr_TR', false), de = V('Anna', 'de-DE', true);
  eq(A.pickVoice([en, de]), null, 'Turkce yok -> null');
  eq(A.pickVoice([]), null, 'bos liste');
  eq(A.pickVoice(null), null, 'null liste');
  eq(A.pickVoice([en, tr2, de]), tr2, 'tek Turkce');
  eq(A.pickVoice([en, tr2, tr1]), tr1, 'yerel ses oncelikli');
  eq(A.pickVoice([tr3, tr2]), tr2, 'Google adi oncelikli');
  eq(A.pickVoice([tr3, en]), tr3, 'tr_TR alt cizgili de kabul');
  eq(A.pickVoice([V('Turkish X', 'tr', false), en]).name, 'Turkish X', 'yalniz tr');
  ok(A.pickVoice([V('Treble', 'trk-XX', true)]) === null, 'tr ile baslayan ama tr olmayan dil secilmez');

  // Turkce yok: susar
  var s = fakeSynth([en, de]), a = A.create({AudioContext: null, speechSynthesis: s, SpeechSynthesisUtterance: FakeUtt});
  a.enable();
  eq(a.say('Merhaba'), false, 'Turkce ses yokken say() false');
  eq(s.spoken.length, 0, 'Turkce ses yokken hic konusma');
  eq(a.status().voice, null, 'status.voice null');
  eq(a.status().speech, 'no-voice', 'status.speech');
  ok(/Türkçe ses bulunamadı/.test(a.status().message), 'durum mesaji');
  eq(a.status().audio, false, 'AudioContext yok -> audio false (ama atmaz)');
  a.dispose();

  // Turkce ses gec gelir (voiceschanged)
  s = fakeSynth([]); a = A.create({AudioContext: null, speechSynthesis: s, SpeechSynthesisUtterance: FakeUtt}); a.enable();
  eq(a.say('Merhaba'), false, 'gec gelen: ilk say() sessiz');
  s.voices = [en, tr2]; s.fire('voiceschanged');
  eq(a.status().voice, 'Google Türkçe', 'voiceschanged sonrasi ses secildi');
  eq(a.status().speech, 'ok', 'speech ok');
  eq(a.say('Merhaba'), true, 'gec gelen: simdi konusur');
  eq(s.spoken.length, 1, 'bir utterance');
  var u = s.spoken[0];
  eq(u.text, 'Merhaba', 'metin'); eq(u.voice, tr2, 'utterance.voice atandi'); eq(u.lang, 'tr-TR', 'lang');
  eq(u.rate, 1, 'rate'); eq(u.pitch, 1, 'pitch');
  eq(a.status().ducked, true, 'konusurken ducking');
  u.onend();
  eq(a.status().ducked, false, 'bitince ducking kalkar');
  a.dispose();

  // olay hic gelmez ama getVoices sonradan dolar (say icinde yeniden bakilir)
  s = fakeSynth([]); a = A.create({AudioContext: null, speechSynthesis: s, SpeechSynthesisUtterance: FakeUtt}); a.enable();
  s.voices = [tr1];
  eq(a.say('Selam'), true, 'olay gelmese de say() sesleri yeniden tarar');
  a.dispose();

  // kuyruk: en fazla 2 bekleyen, en eski duser; mute susturur
  s = fakeSynth([tr1]); a = A.create({AudioContext: null, speechSynthesis: s, SpeechSynthesisUtterance: FakeUtt}); a.enable();
  ['bir', 'iki', 'üç', 'dört', 'beş'].forEach(function(t){ a.say(t); });
  eq(s.spoken.length, 1, 'ilk anons hemen, digerleri bekler');
  var order = [s.spoken[0].text];
  for (var k = 0; k < 6 && s.spoken.length; k++){
    var cur = s.spoken.shift(); cur.onend();
    if (s.spoken.length) order.push(s.spoken[0].text);
  }
  eq(order.join(','), 'Bir,Dört,Beş', 'kuyruk: 1 konusur, 2-3 dusur, 4-5 sirayla');
  eq(a.status().ducked, false, 'kuyruk bitince ducking yok');
  a.setMuted(true);
  eq(a.say('sessiz'), false, 'muted iken say() konusmaz');
  a.setMuted(false);
  a.dispose();
  // enable edilmeden konusma yok
  s = fakeSynth([tr1]); a = A.create({AudioContext: null, speechSynthesis: s, SpeechSynthesisUtterance: FakeUtt});
  eq(a.say('x'), false, 'enable() oncesi say() konusmaz');
  a.dispose();
  // hic speechSynthesis yok
  a = A.create({AudioContext: null, speechSynthesis: null});
  a.enable(); eq(a.say('Merhaba'), false, 'speechSynthesis yok: atmaz, false'); eq(a.status().speech, 'unsupported', 'unsupported');
  ['music', 'sfx', 'intensity', 'setMuted', 'setVolume'].forEach(function(f){ try { a[f]('battle', {}); ok(true); } catch (e) { ok(false, f + ' atti: ' + e.message); } });
  a.dispose();
})();

/* ---------------------------------------------------------------- (b) tarayici */
var ANALYSIS = function(){
  /* tarayici icinde calisir: window.__an(buf, opts) */
  function fft(re, im){
    var n = re.length;
    for (var i = 1, j = 0; i < n; i++){ var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j){ var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (var len = 2; len <= n; len <<= 1){
      var ang = -2*Math.PI/len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (var i2 = 0; i2 < n; i2 += len){
        var cr = 1, ci = 0;
        for (var k = 0; k < len/2; k++){
          var a = i2 + k, b = a + len/2, xr = re[b]*cr - im[b]*ci, xi = re[b]*ci + im[b]*cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          var nr = cr*wr - ci*wi; ci = cr*wi + ci*wr; cr = nr;
        }
      }
    }
  }
  window.__an = function(buf, opts){
    opts = opts || {};
    var sr = buf.sampleRate, L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L, n = L.length;
    var nan = 0, peak = 0, ss = 0, last = 0, mono = new Float32Array(n);
    for (var i = 0; i < n; i++){
      var l = L[i], r = R[i];
      if (l !== l || r !== r || !isFinite(l) || !isFinite(r)){ nan++; l = 0; r = 0; }
      var pk = Math.max(Math.abs(l), Math.abs(r)); if (pk > peak) peak = pk;
      mono[i] = (l + r)/2; ss += (l*l + r*r)/2;
      if (pk > 0.001) last = i;
    }
    var rms = Math.sqrt(ss/n), activeN = Math.max(1, last), as = 0;
    for (i = 0; i < activeN; i++) as += mono[i]*mono[i];
    var activeRms = Math.sqrt(as/activeN);
    // spektrum: 2048'lik Hann pencereleri, ~0.25 sn aralikla; merkez + 8 bant profili
    var N = 2048, re = new Float64Array(N), im = new Float64Array(N), win = new Float64Array(N);
    for (i = 0; i < N; i++) win[i] = 0.5 - 0.5*Math.cos(2*Math.PI*i/(N-1));
    var edges = [0, 150, 300, 600, 1200, 2400, 4800, 9600, 22050], bands = new Float64Array(8), cs = 0, cw = 0;
    for (var p = 0; p + N < Math.min(n, activeN + N); p += Math.floor(sr*0.25)){
      for (i = 0; i < N; i++){ re[i] = mono[p + i]*win[i]; im[i] = 0; }
      fft(re, im);
      for (var k = 1; k < N/2; k++){
        var f = k*sr/N, m = Math.sqrt(re[k]*re[k] + im[k]*im[k]);
        cs += f*m; cw += m;
        for (var bnd = 0; bnd < 8; bnd++) if (f >= edges[bnd] && f < edges[bnd+1]){ bands[bnd] += m*m; break; }
      }
    }
    var bs = 0; for (i = 0; i < 8; i++) bs += bands[i];
    var prof = Array.prototype.map.call(bands, function(x){ return bs ? x/bs : 0; });
    // RMS zarfi (0.5 sn)
    var hop = Math.floor(sr*0.5), env = [];
    for (p = 0; p + hop <= n; p += hop){ var e = 0; for (i = p; i < p + hop; i++) e += mono[i]*mono[i]; env.push(Math.sqrt(e/hop)); }
    // vurus (onset) zarfi: birinci farkin enerjisi, log, pozitif akis
    var H = 512, F = 1024, oenv = [], prev = 0;
    for (p = 0; p + F < n; p += H){
      var en = 0; for (i = p + 1; i < p + F; i++){ var df = mono[i] - mono[i-1]; en += df*df; }
      var le = Math.log(1 + 2000*en/F); oenv.push(Math.max(0, le - prev)); prev = le;
    }
    var fr = sr/H, bestLag = 0, best = -1, acf = {};
    function ac(lag){ var s = 0, c = 0; for (var q = 0; q + lag < oenv.length; q++){ s += oenv[q]*oenv[q+lag]; c++; } return c ? s/c : 0; }
    var lo = Math.round(0.30*fr), hi = Math.round(1.40*fr), a0 = ac(0) || 1, arr = [];
    for (var lag = lo; lag <= hi; lag++){ var v = ac(lag)/a0; arr.push(v); if (lag >= Math.round(opts.minLag*fr || 0.45*fr) && lag <= Math.round((opts.maxLag || 0.9)*fr) && v > best){ best = v; bestLag = lag; } }
    var tempo = bestLag ? 60/(bestLag/fr) : 0;
    // olcu uzunlugu: ac(bar) ile ac(yarim) karsilastirmasi icin ham degerler
    var res = {sr: sr, n: n, dur: n/sr, nan: nan, peak: peak, rms: rms, activeRms: activeRms, centroid: cw ? cs/cw : 0, prof: prof, env: env, tempo: tempo, acf: {}};
    (opts.lags || []).forEach(function(sec){ res.acf[sec] = ac(Math.round(sec*fr))/a0; });
    // dongu siniri: 40 ms pencerelerin en buyuk |ornek farki|; sinir penceresi ile karsilastir
    if (opts.boundary){
      var W = Math.floor(sr*0.04), bi = Math.round(opts.boundary*sr), wm = [], bmax = 0;
      for (p = 0; p + W < n; p += W){
        var mx = 0; for (i = p + 1; i < p + W; i++){ var d1 = Math.max(Math.abs(L[i] - L[i-1]), Math.abs(R[i] - R[i-1])); if (d1 > mx) mx = d1; }
        wm.push(mx);
      }
      function dmax(a, b){ var m = 0; for (var z = a; z < b; z++){ var dd = Math.max(Math.abs(L[z] - L[z-1]), Math.abs(R[z] - R[z-1])); if (dd > m) m = dd; } return m; }
      bmax = dmax(bi, bi + W);
      var sorted = wm.slice().sort(function(a, b){ return a - b; });
      var w2 = Math.floor(sr*0.002), ctxMax = 0, ctxHalf = Math.floor(sr*0.3), seam = dmax(bi - w2, bi + w2);
      for (p = bi - ctxHalf; p + 2*w2 < bi + ctxHalf; p += 2*w2){ if (p + 2*w2 > bi - w2 && p < bi + w2) continue; var cm = dmax(p, p + 2*w2); if (cm > ctxMax) ctxMax = cm; }
      res.boundary = {seam: seam, ctxMax: ctxMax, post: bmax, pre: dmax(bi - W, bi), start: dmax(1, W + 1), max: bmax, p99: sorted[Math.floor(sorted.length*0.99)], median: sorted[Math.floor(sorted.length/2)], top: sorted[sorted.length - 1]};
    }
    return res;
  };
};

function db(x){ return x > 0 ? 20*Math.log10(x) : -999; }
function pad(s, n){ s = String(s); while (s.length < n) s += ' '; return s; }

async function browserTests(){
  console.log('[b] Chromium (OfflineAudioContext + canli yol)');
  var playwright;
  try { playwright = require('playwright'); } catch (e) { ok(false, 'playwright yuklenemedi: ' + e.message); return; }
  var browser = await playwright.chromium.launch({args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox']});
  var page = await browser.newPage();
  var pageErrors = [];
  page.on('pageerror', function(e){ pageErrors.push(String(e && e.message || e)); });
  page.on('console', function(m){ if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({path: path.join(__dirname, '..', 'js', 'audio.js')});
  await page.addScriptTag({content: '(' + ANALYSIS.toString() + ')()'});
  eq(await page.evaluate(function(){ return typeof MF.audio.render; }), 'function', 'MF.audio.render tanimli');

  var meta = await page.evaluate(function(){ return MF.audio._meta; });
  var R = {};
  async function measure(name, secs, opts){
    var t0 = Date.now();
    var r = await page.evaluate(function(a){
      return MF.audio.render(a.name, a.secs, a.fx).then(function(b){ return window.__an(b, a.an); });
    }, {name: name, secs: secs, fx: (opts && opts.fx) || {}, an: (opts && opts.an) || {}});
    r.ms = Date.now() - t0; R[((opts && opts.fxKey) ? 'fx:' : '') + name + ((opts && opts.tag) || '')] = r; return r;
  }
  var trackPlan = {intro: 7, battle: 41, tense: 14, last30: 14, mehter: 20, victory: 14};
  var ONLY = process.env.AUDIO_ONLY ? process.env.AUDIO_ONLY.split(',') : null;   // gelistirme: yalniz bu parcalar
  for (var name in trackPlan){
    if (ONLY && ONLY.indexOf(name) < 0) continue;
    var o = {};
    if (name === 'battle') o.an = {boundary: meta.battleBarSeconds*meta.battleBars, lags: [0.6]};
    if (name === 'mehter') o.an = {lags: [60/92, 60/92*2, 60/92/2, 60/92*1.5, 60/92*0.75]};
    await measure(name, trackPlan[name], o);
  }
  var fxNames = await page.evaluate(function(){ return MF.audio.effects.slice(); });
  if (!ONLY){
    for (var i = 0; i < fxNames.length; i++) await measure(fxNames[i], null, {fxKey: 1, fx: {kind: 'fx'}});
    await measure('ambience', 8, {fxKey: 1});
    await measure('battle', 6, {fx: {intensity: 0}, tag: '#yogunluk0'});
    await measure('battle', 6, {fx: {intensity: 1}, tag: '#yogunluk1'});
    for (var v = 0; v < 3; v++) await measure('sword', null, {fx: {v: v, kind: 'fx'}, tag: '#' + v, fxKey: 1});
  }

  // tablo
  var allNames = Object.keys(R);
  console.log('\n ' + pad('ad', 11) + pad('sure s', 8) + pad('RMS dBFS', 10) + pad('aktifRMS', 10) + pad('tepe', 8) + pad('tepe dB', 9) + pad('merkez Hz', 10) + 'olcum ms');
  allNames.forEach(function(n){
    var r = R[n];
    console.log(' ' + pad(n, 11) + pad(r.dur.toFixed(1), 8) + pad(db(r.rms).toFixed(1), 10) + pad(db(r.activeRms).toFixed(1), 10) + pad(r.peak.toFixed(3), 8) + pad(db(r.peak).toFixed(1), 9) + pad(Math.round(r.centroid), 10) + r.ms);
  });
  console.log('');
  if (true){ Object.keys(R).filter(function(n){ return trackPlan[n]; }).forEach(function(n){ var r = R[n]; console.log(n, 'tempo', r.tempo && r.tempo.toFixed(1), JSON.stringify(r.acf), JSON.stringify(r.boundary), 'prof', r.prof.map(function(x){ return +x.toFixed(2); }).join(' ')); }); if (ONLY){ await browser.close(); return; } }

  // genel: sessiz degil, kirpma yok, NaN yok
  var trackNames = Object.keys(trackPlan);
  allNames.forEach(function(n){
    var r = R[n], isTrack = trackPlan[n] !== undefined || n === 'fx:ambience';
    eq(r.nan, 0, n + ': NaN yok');
    ok(r.peak < 1.0, n + ': tepe < 1.0 (' + r.peak.toFixed(4) + ')');
    ok(r.peak > 0.02, n + ': tepe > 0.02 (sessiz degil) (' + r.peak.toFixed(4) + ')');
    if (isTrack) ok(db(r.rms) > -34, n + ': RMS > -34 dBFS (' + db(r.rms).toFixed(1) + ')');
    else ok(db(r.activeRms) > -42, n + ': aktif RMS > -42 dBFS (' + db(r.activeRms).toFixed(1) + ')');
    ok(r.centroid > 100 && r.centroid < 12000, n + ': merkez frekans makul (' + Math.round(r.centroid) + ')');
  });
  // tutarli yuksek ses: parcalar arasinda en fazla 4 dB fark; efekt tepeleri makul
  var rmsDb = trackNames.map(function(n){ return db(R[n].rms); });
  var spread = Math.max.apply(null, rmsDb) - Math.min.apply(null, rmsDb);
  ok(spread <= 4.0, 'parcalar arasi RMS farki <= 4 dB (' + spread.toFixed(1) + ' dB)');
  var peaksDb = trackNames.map(function(n){ return db(R[n].peak); });
  ok(Math.max.apply(null, peaksDb) - Math.min.apply(null, peaksDb) <= 6, 'parca tepeleri 6 dB icinde');
  fxNames.forEach(function(n){ var pk = db(R['fx:' + n].peak); ok(pk > -24 && pk < -0.2, n + ': efekt tepesi -24..-0.2 dB (' + pk.toFixed(1) + ')'); });

  var i0 = R['battle#yogunluk0'], i1 = R['battle#yogunluk1'];
  ok(db(i1.rms) - db(i0.rms) > 1.5 && i1.centroid > i0.centroid, 'battle: yogunluk 1 katmanlari acar (RMS ' + db(i0.rms).toFixed(1) + ' -> ' + db(i1.rms).toFixed(1) + ' dB, merkez ' + Math.round(i0.centroid) + ' -> ' + Math.round(i1.centroid) + ')');
  // parcalar birbirinden farkli: bant profili L1 mesafesi
  console.log(' parca farklari (8 bant profili L1 mesafesi / merkez frekans orani):');
  for (var a = 0; a < trackNames.length; a++) for (var b = a + 1; b < trackNames.length; b++){
    var pa = R[trackNames[a]], pb = R[trackNames[b]], dist = 0;
    for (var q = 0; q < 8; q++) dist += Math.abs(pa.prof[q] - pb.prof[q]);
    var cr = Math.abs(Math.log(pa.centroid/pb.centroid));
    var envN = Math.min(pa.env.length, pb.env.length), ea = pa.env.slice(0, envN), eb = pb.env.slice(0, envN), ma = ea.reduce(function(x, y){ return x + y; }, 0)/envN, mb = eb.reduce(function(x, y){ return x + y; }, 0)/envN, num = 0, da = 0, dbb = 0;
    for (q = 0; q < envN; q++){ num += (ea[q] - ma)*(eb[q] - mb); da += (ea[q] - ma)*(ea[q] - ma); dbb += (eb[q] - mb)*(eb[q] - mb); }
    var corr = da > 0 && dbb > 0 ? num/Math.sqrt(da*dbb) : 0;
    console.log('   ' + pad(trackNames[a] + '/' + trackNames[b], 16) + 'bant ' + dist.toFixed(3) + '  merkez ' + (cr*100).toFixed(1) + '%  zarf-korelasyon ' + corr.toFixed(2));
    ok(dist > 0.06 || cr > 0.08, trackNames[a] + ' ve ' + trackNames[b] + ' birbirinden ayirt edilebilir (bant ' + dist.toFixed(3) + ', merkez ' + (cr*100).toFixed(1) + '%)');
  }
  // sword varyasyonlari birbirinden farkli
  var sv = [R['fx:sword#0'], R['fx:sword#1'], R['fx:sword#2']];
  ok(Math.abs(sv[0].centroid - sv[1].centroid) > 20 && Math.abs(sv[1].centroid - sv[2].centroid) > 20, 'sword varyasyonlari farkli merkez frekansta (' + sv.map(function(r){ return Math.round(r.centroid); }).join('/') + ')');
  // efektler birbirinden farkli (merkez + sure)
  var cs = fxNames.filter(function(n){ return n !== 'intro'; }).map(function(n){ return Math.round(R['fx:' + n].centroid); });
  ok(new Set(cs).size === cs.length, 'her efektin merkez frekansi farkli (intro, horn takma adi)');

  // mehter temposu: vurus zarfi otokorelasyonu ~92 bpm
  var m = R.mehter;
  console.log('\n mehter tempo tahmini: ' + m.tempo.toFixed(1) + ' bpm (olcu = ' + (60/92*2).toFixed(3) + ' sn); acf: ' + JSON.stringify(m.acf, function(k, v){ return typeof v === 'number' ? +v.toFixed(3) : v; }));
  var beatLag = 60/92, acfBeat = m.acf[beatLag], acfBar = m.acf[beatLag*2], acfOff = Math.max(m.acf[beatLag*1.5], m.acf[beatLag*0.75]);
  ok(Math.abs(m.tempo - 92) <= 92*0.03, 'mehter tempo ~92 bpm (' + m.tempo.toFixed(1) + ')');
  ok(acfBeat > 0.5 && acfBar > 0.5 && acfBeat > m.acf[beatLag*0.75]*1.4, 'mehter: vurus ve olcu gecikmelerinde guclu otokorelasyon, 3 adimlik gecikmede degil (' + acfBeat.toFixed(3) + ', ' + acfBar.toFixed(3) + ' vs ' + m.acf[beatLag*0.75].toFixed(3) + ')');
  // savas dongusu: sinirda tik yok
  var bt = R.battle, bd = bt.boundary;
  console.log(' battle dongu siniri: sinir maks |dx| ' + bd.max.toFixed(4) + ', pencere medyani ' + bd.median.toFixed(4) + ', p99 ' + bd.p99.toFixed(4) + ', en buyuk ' + bd.top.toFixed(4));
  console.log(' seam: sinir oncesi 40 ms ' + bd.pre.toFixed(4) + ', sonrasi 40 ms ' + bd.post.toFixed(4) + ', parcanin kendi baslangici ' + bd.start.toFixed(4));
  ok(bd.pre <= bd.p99*1.0, 'battle sinir oncesi pencere olagan (' + bd.pre.toFixed(4) + ' <= p99 ' + bd.p99.toFixed(4) + ')');
  console.log(' seam +-2 ms maks |dx| ' + bd.seam.toFixed(4) + ', cevre (+-300 ms) en buyuk 4 ms penceresi ' + bd.ctxMax.toFixed(4));
  ok(bd.seam <= bd.ctxMax, 'battle dongu sinirinda tik yok: +-2 ms icindeki sicrama cevredeki en buyuk sicramadan fazla degil (' + bd.seam.toFixed(4) + ' <= ' + bd.ctxMax.toFixed(4) + ')');

  // ------------------------------------------------------------ canli yol
  console.log('\n canli yol');
  var live = await page.evaluate(async function(){
    var out = {errors: [], notes: {}};
    function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    function FakeUtt(t){ this.text = t; }
    var listeners = {};
    var synth = {
      voices: [], spoken: [],
      getVoices: function(){ return this.voices; },
      addEventListener: function(n, f){ (listeners[n] = listeners[n] || []).push(f); },
      speak: function(u){ this.spoken.push(u); var s = this; setTimeout(function(){ if (u.onstart) u.onstart(); setTimeout(function(){ if (u.onend) u.onend(); }, 40); }, 5); },
      cancel: function(){}
    };
    try {
      var a = MF.audio.create({speechSynthesis: synth, SpeechSynthesisUtterance: FakeUtt});
      out.s0 = a.status();
      out.enableRet = [a.enable(), a.enable(), a.enable()];
      await wait(300);
      out.s1 = a.status();
      out.musicRet = [];
      var seq = ['battle', 'tense', 'last30', 'mehter', 'battle', 'victory', 'intro', 'battle'];
      for (var i = 0; i < seq.length; i++){ out.musicRet.push(a.music(seq[i])); a.intensity(i/8); await wait(350); if (a.status().track !== seq[i]) out.errors.push('track ' + seq[i] + ' != ' + a.status().track); }
      out.badMusic = a.music('nope');
      var fx = MF.audio.effects, accepted = 0, attempts = 0;
      for (var k = 0; k < fx.length; k++) if (a.sfx(fx[k], {pan: (k%5 - 2)/2.5, gain: 0.9})) accepted++;
      out.sfxFirst = accepted + '/' + fx.length;
      await wait(1100);
      var sw = 0; for (k = 0; k < 20; k++) if (a.sfx('sword')) sw++;
      out.swordBurst = sw;
      await wait(1100);
      var cap = 0, names = ['sword', 'hit', 'arrow', 'horse', 'cannon', 'wall', 'stage', 'horn', 'shield', 'rankup', 'combo', 'cheer', 'join', 'tick'];
      names.forEach(function(n){ for (var j = 0; j < 6; j++){ attempts++; if (a.sfx(n)) cap++; } });
      out.voiceCap = cap; out.attempts = attempts; out.voicesNow = a.status().voices;
      out.unknownSfx = a.sfx('yok');
      // konusma: Turkce ses yok
      out.sayNoVoice = a.say('Merhaba çavuş');
      out.sNoVoice = a.status();
      // Turkce ses gelir
      synth.voices = [{name: 'Google Türkçe', lang: 'tr-TR', localService: false}];
      (listeners.voiceschanged || []).forEach(function(f){ f(); });
      out.sayVoice = a.say('Ayşe_60 İstanbul fethetti');
      out.duckedWhileSpeaking = a.status().ducked;
      await wait(150);
      out.spoken = synth.spoken.map(function(u){ return [u.text, u.lang, u.rate, u.pitch, u.voice && u.voice.name]; });
      await wait(200);
      out.duckedAfter = a.status().ducked;
      a.setVolume({music: 0.5, sfx: 0.5, voice: 0.8});
      a.setMuted(true); out.sMuted = a.status(); a.setMuted(false);
      a.music('off'); await wait(300);
      out.sOff = a.status();
      out.s2 = a.status();
      a.dispose();
      // AudioContext olmadan olusturma: atmamali
      var b = MF.audio.create({AudioContext: null, speechSynthesis: null});
      b.enable(); b.music('battle'); b.sfx('sword'); b.say('x'); b.intensity(0.5);
      out.noAC = b.status();
    } catch (e){ out.errors.push('ISTISNA ' + (e && e.stack || e)); }
    return out;
  });
  console.log(' ' + JSON.stringify({enable: live.enableRet, state: live.s1.state, track0: live.s0.track, sfxFirst: live.sfxFirst, swordBurst: live.swordBurst, voiceCap: live.voiceCap + '/' + live.attempts, spoken: live.spoken, noVoice: live.sNoVoice.message, noAC: [live.noAC.audio, live.noAC.state, live.noAC.speech]}));
  eq(live.errors.length, 0, 'canli yol: istisna/yanlis parca yok ' + live.errors.join(' | '));
  ok(live.enableRet.every(function(x){ return x === true; }), 'enable() tekrar tekrar guvenli');
  eq(live.s0.audio, false, 'enable oncesi AudioContext yok');
  eq(live.s1.audio, true, 'enable sonrasi AudioContext var');
  eq(live.s1.state, 'running', 'AudioContext running (resume edildi)');
  eq(live.s1.enabled, true, 'status.enabled');
  ok(live.musicRet.every(function(x){ return x === true; }), 'music() gecerli adlari kabul eder');
  eq(live.badMusic, false, 'music("nope") reddedilir');
  ok(/^1[0-9]\/|^[0-9]+\//.test(live.sfxFirst) && parseInt(live.sfxFirst, 10) === MF_COUNT(live), 'tum efektler bir kez calinabilir (' + live.sfxFirst + ')');
  ok(live.swordBurst <= 6 && live.swordBurst >= 5, 'efekt hiz siniri: saniyede <= 6 (' + live.swordBurst + ')');
  ok(live.voicesNow <= 24 && live.voicesNow >= 22 && live.voiceCap < live.attempts, 'es zamanli ses sayisi 24 ile sinirli (' + live.voicesNow + ' aktif, ' + live.voiceCap + ' / ' + live.attempts + ' kabul)');
  eq(live.unknownSfx, false, 'bilinmeyen efekt false');
  eq(live.sayNoVoice, false, 'Turkce ses yokken say() false');
  eq(live.sNoVoice.speech, 'no-voice', 'status.speech no-voice'); ok(/Türkçe ses bulunamadı/.test(live.sNoVoice.message), 'durum mesaji');
  eq(live.sayVoice, true, 'Turkce ses gelince say() true');
  eq(live.duckedWhileSpeaking, true, 'konusurken muzik kisilir');
  eq(live.duckedAfter, false, 'konusma bitince kisma kalkar');
  eq(JSON.stringify(live.spoken), JSON.stringify([['Ayşe İstanbul fethetti', 'tr-TR', 1, 1, 'Google Türkçe']]), 'utterance: temiz metin, tr-TR, hiz 1, perde 1, Turkce ses');
  eq(live.sMuted.muted, true, 'status.muted');
  eq(live.sOff.track, 'off', 'music("off")');
  eq(live.s2.error, '', 'canli yolda zamanlayici hatasi yok (' + live.s2.error + ')');
  eq(live.noAC.audio, false, 'AudioContext yokken status.audio false, istisna yok');
  eq(pageErrors.length, 0, 'sayfada hata yok ' + pageErrors.join(' | '));
  await browser.close();
}
function MF_COUNT(live){ return A.effects.length; }

(async function main(){
  if (process.env.AUDIO_NO_BROWSER !== '1'){
    try { await browserTests(); } catch (e){ ok(false, 'tarayici testi coktu: ' + (e && e.stack || e)); }
  }
  console.log('\n' + (fails ? 'BASARISIZ: ' + fails + ' / ' + checks : 'TAMAM: ' + checks + ' kontrol gecti'));
  process.exit(fails ? 1 : 0);
})();
