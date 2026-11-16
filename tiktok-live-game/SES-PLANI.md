# Memleket Fethi — Ses Planı

## 1. Sorunlar
- **Seslendirme:** "Çavuş", "Paşa", "Ayşe" gibi Türkçe sözcükler bozuk okunuyor. Sebep: tarayıcıya yalnızca `lang='tr-TR'` veriliyor, Türkçe ses seçilmiyor; Türkçe ses yüklenmemişse İngilizce ses Türkçe metni okuyor. Ayrıca kullanıcı adları ham okunuyor ("Ayşe_60").
- **Müzik yok:** mehter anında ve savaş boyunca müzik çalmıyor.

## 2. Telif
Hiçbir hazır ses dosyası ya da var olan beste kullanılmaz. Tüm müzik ve efektler tarayıcıda WebAudio ile **üretilir**; ezgiler bu oyun için yazılmış özgün bestelerdir. "Ceddin Deden" gibi bilinen marşlar çalınmaz (bestecisi ve hak durumu tartışmalı); onun yerine aynı çalgı takımı ve usulle **mehter tarzında özgün bir marş** bestelenir. Böylece yayında telif riski olmaz ve dışarıdan dosya indirmek gerekmez.

## 3. Seslendirme (Türkçe)
- `speechSynthesis.getVoices()` + `voiceschanged` ile sesler beklenir; dili `tr` ile başlayan ses seçilir (öncelik: yerel/`localService`, adında "Google", "Yelda", "Filiz", "Emel", "Ahmet", "Tolga" geçenler). Seçilen ses `utterance.voice` olarak atanır, `lang='tr-TR'`, hız 1.0, perde 1.0.
- **Türkçe ses yoksa konuşma yapılmaz** (yanlış aksanla okumaktansa susar); durum satırında "Türkçe ses bulunamadı" yazar ve README'de nasıl kurulacağı anlatılır (Windows: Ayarlar → Zaman ve dil → Konuşma → Türkçe ses ekle; Android/iOS/macOS'ta hazır gelir). OBS tarayıcı kaynağında ses listesi boş olabilir; bu durumda da susar.
- Metin temizliği (`MF.audio.cleanName` ve `cleanText`):
  - kullanıcı adlarında `_ . -` ve rakamlar atılır, emoji ve simgeler atılır, 3'ten fazla tekrar eden harf kısaltılır, 24 karakterde kesilir; hiçbir harf kalmazsa "bir izleyici" denir
  - tamamı büyük harfli sözcükler Türkçe kurala göre küçültülür (`toLocaleLowerCase('tr')`: I→ı, İ→i) ki "İSTANBUL" harf harf okunmasın
  - "x10" → "on kat", "×1.5" → "bir buçuk kat", "34 İstanbul" → "İstanbul", "sn" → "saniye"
- Kuyruk: en fazla 2 bekleyen anons; yenisi gelince en eski bekleyen düşer. Konuşma sırasında müzik %40'a kısılır (ducking).

## 4. Müzik (özgün, üretilen)
Ortak: 44.1 kHz, ana çıkışta kompresör + sınırlayıcı, müzik ve efekt için ayrı ses düğmeleri. Zamanlama `AudioContext.currentTime` üzerinden ileriye dönük planlanır (setInterval sapmasına bağlı kalmaz). Parçalar arası 1.2 sn çapraz geçiş.

| Parça | Ne zaman | Karakter |
| --- | --- | --- |
| `intro` | maç tanıtımı (6 sn) | tek boru çağrısı + alçak davul tremolosu |
| `battle` | maç boyunca | 100 bpm, 4/4, re minör. Katmanlar yoğunluğa göre açılır: (1) davul ostinatosu, (2) pes yaylı dem, (3) alçak korno ezgisi, (4) üst yaylı ostinato. 16 ölçülük özgün tema, 2 varyasyon |
| `tense` | bir tarafın canı %33'ün altına inince | aynı tema, yarım ses yukarı, ek gerilim nabzı |
| `last30` | son 30 saniye | tempo 124 bpm, tüm katmanlar, zil vuruşları |
| `mehter` | 1000+ elmas (mehter etkisi sürerken, ~12 sn) | **mehter tarzı özgün marş**: 2/4, 92 bpm, hicaz dizisi (re–mi♭–fa♯–sol–la–si♭–do). Çalgılar: kös (pes, uzun), davul ("düm tek tek düm tek" usulü), nakkare (ince çift vuruş), zil, zurna (testere dalga + dar bant geçiren süzgeç, çarpma ve titretme süsleri), boru (dem). 8 ölçülük ezgi, tekrarında zurna bir oktav üstten |
| `victory` | maç sonu töreni | 6 sn boru ve davul fanfarı, sonra hafif dem |

`mehter` bitince önceki parçaya (battle/tense/last30) geri dönülür.

## 5. Efektler (üretilen)
`sword` (madeni çınlama, 3 varyasyon), `hit`, `arrow`, `horse` (dörtnal), `cannon` (pes patlama + gürültü kuyruğu), `wall` (taş çökmesi), `stage` (büyük çöküş), `horn`, `shield`, `rankup`, `combo`, `cheer` (kalabalık), `join`, `tick` (son 10 sn). Savaş uğultusu: çarpışan asker sayısına göre seviyesi değişen sürekli hafif kılıç/kalabalık dokusu. Aynı efekt saniyede en fazla 6 kez; toplam eşzamanlı ses ≤ 24.

## 6. Kod
Yeni dosya `js/audio.js` → `MF.audio`. THREE ve oyun mantığına bağımlı değildir.

```
const a = MF.audio.create()
a.enable()                 // kullanıcı dokunuşu içinde çağrılır; AudioContext'i başlatır/sürdürür (iOS dahil)
a.setMuted(bool)
a.setVolume({music, sfx, voice})        // 0..1
a.music(name)              // 'intro'|'battle'|'tense'|'last30'|'mehter'|'victory'|'off'
a.intensity(x)             // 0..1: battle katmanları ve savaş uğultusu
a.sfx(name, {pan, gain})
a.say(text)                // Türkçe ses varsa okur
a.status()                 // {enabled, muted, voice: sesAdı|null, track}
MF.audio.cleanName(s), MF.audio.cleanText(s)
MF.audio.render(name, seconds) → Promise<AudioBuffer>   // OfflineAudioContext ile test için
```

Görünüm (view.js) bağlantısı: `phase` → intro/battle/victory; `sides[].hp` → tense; `timeLeft ≤ 30` → last30; `sides[].buff > 0` → mehter; savaşan birlik oranı → `intensity`; oyun `sfx(name)` ve `say(text)` olayları → `a.sfx` / `a.say`. Araç çubuğunda "Ses" düğmesi `enable()` çağırır; yanında müzik ve efekt seviyesi.

## 7. Doğrulama
Ses kulakla dinlenemediği için ölçümle doğrulanır: her parça ve efekt `MF.audio.render` ile çevrilir; sessiz değil (RMS > eşik), kırpılma yok (tepe < 1.0), parçalar birbirinden farklı, döngü noktasında tık yok (sınırda süreksizlik ölçümü). `cleanName`/`cleanText` için birim testleri. Türkçe ses seçimi sahte ses listesiyle test edilir.
