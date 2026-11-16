# Memleket Fethi v3 — Karakter ve Savaş Alanı Tasarımı

v2'nin iki eksiği: (1) askerler sade ve hareketsiz, üçlü öbekler halinde; (2) kaleler ekranı doldurduğu için arada savaş alanı kalmıyor, savaş görünmüyor. Bu belge ikisini de yeniden tanımlar. Oyun kuralları (PLAN.md bölüm 2) değişmez.

## A. Görsel dil (2026 mobil strateji oyunu estetiği)

- **Oran:** iri kafa, kalın uzuv, büyük el ve çizme, kalın silah. Boyun yok. Uzaktan bakınca silüet tek başına birliği ele vermeli. Yaya asker boyu 1.0 birim; kafa (miğferle) 0.36, gövde 0.34 yük × 0.34 gen × 0.24 der, bacak 0.26, kol 0.30, yumruk 0.11.
- **Gölgelendirme:** 3 kademeli toon (MeshToonMaterial + 3 adımlı gradientMap, NearestFilter) + sıcak kenar ışığı (fresnel rim, onBeforeCompile). Köşe renklerine pişirilmiş dikey gradyan (üst açık, alt koyu) ve eklem yerlerinde koyulaşma.
- **Takım rengi:** arma gömleği, kalkan yüzü, sorguç, pelerin, flama ve at örtüsü taraf renginde; hafif emissive ile parlar. İki ordu bir bakışta ayrılmalı. Geri kalan palet sabit: çelik 0xb8c4cc (gölge 0x6f7f8a), deri 0x6b4226, koyu kumaş 0x2b2f3a, ten 0xe0a878, altın 0xf2b632, ahşap 0x8a5a2e, bronz 0xa9782f, keten 0xc9b48a.
- **Zemin gölgesi:** her askerin altında yumuşak koyu leke (instanced).
- **Canlandırma:** her asker ayrı uzuvlarla hareket eder (yürüme, vuruş, düşme). Üçlü öbek yok; her asker tek tek çizilir.

## B. Birlik kartları

Tüm modeller +Z'ye bakar, ayak tabanı y=0. Parçalar eklem noktasından döner.

### 1. Milis — pasif kale çıkışı
- Silüet: ince, miğfersiz. Taraf renginde (koyu ton) kukuleta, keten kapitone gömlek, çapraz taraf rengi kuşak, küçük yuvarlak ahşap kalkan (göbeği taraf rengi), kısa mızrak (1.3).
- Parçalar: gövde+kafa, sol kol+kalkan, sağ kol+mızrak, sol bacak, sağ bacak.
- Üçgen ≤ 320.

### 2. Piyade — beğeni ve 1–9 elmas
- Silüet: geniş omuz. Çelik sallet miğfer, tepesinde taraf rengi sorguç şeridi; iri küre omuzluklar; zincir zırh üstünde altın etekli taraf rengi arma gömleği; uçurtma (heater) kalkan, taraf rengi üstünde altın şerit; kalın namlulu kılıç, altın balçak.
- Parçalar: gövde+kafa, sol kol+kalkan, sağ kol+kılıç, sol bacak, sağ bacak.
- Üçgen ≤ 460.

### 3. Komutan — izleyicinin kendi karakteri (her izleyici bölüğünün lideri)
- Piyadenin 1.25 katı. Büyük kapalı miğfer (great helm), yüksek taraf rengi tüy sorguç, altın süsler, dalgalanan taraf rengi pelerin, sırtında direkli küçük sancak (kalabalığın üstünden görünür), ayak altında taraf renginde parlayan halka.
- Parçalar: piyade parçaları + pelerin + sırt sancağı.
- Üçgen ≤ 720. İsim etiketi bu askere bağlanır.

### 4. Süvari — 10–99 elmas
- Silüet: tıknaz savaş atı, kavisli boyun, iri toynak. At örtüsü (caparison) dizlere kadar taraf renginde, altın etek, baklava deseni; çelik alınlık (chanfron); koyu yele ve kuyruk. Binici: kapalı miğfer + taraf rengi sorguç, uçurtma kalkan, taraf rengi/beyaz şeritli uzun mızrak (2.2) ve flama.
- Parçalar: at gövdesi (örtü, boyun, kafa, kuyruk), ön bacak çifti, arka bacak çifti, binici (gövde+kafa+kalkan kolu), mızrak kolu.
- Üçgen ≤ 1100.

### 5. Topçu — 100–999 elmas (v2'deki mancınığın yerini alır)
- Bronz kuşaklı demir bombard topu, ahşap tekerlekli kundak, kundakta taraf rengi örtü ve küçük flama, yanında barut fıçısı ve gülle yığını. Yanında 2 topçu eri (deri önlük, kalkansız, harbi).
- Parçalar: kundak, namlu (geri tepme), tekerlek çifti (yürürken döner); topçu eri ayrı asker tipi.
- Üçgen: top ≤ 900, topçu eri ≤ 320.

### 6. Mehter — 1000+ elmas
- Davulcu: büyük bakır kös (taraf rengi örtü), iki tokmak kolu hareketli, sarık. Sancaktar: uzun direkte taraf rengi büyük sancak, altın alem.
- Üçgen: her biri ≤ 600.

### Canlandırma tablosu
| Durum | Yaya | Süvari | Top |
| --- | --- | --- | --- |
| walk | bacaklar ±35°, kollar ters ±25°, gövde zıplaması | bacak çiftleri ters ±45° dörtnal, gövde ±6° yunuslama | tekerlek döner, erler yürür |
| fight | sağ kol baş üstünden vuruş (−110° → +20°), kalkan kalkar, gövde öne eğilir; milis mızrak saplar | mızrak hamlesi, at hafif şahlanır | — |
| fire (k: 0→1) | topçu eri harbi sokar | — | namlu 0.25 geri teper ve döner |
| die (k: 0→1) | sırt üstü devrilir (−90°), sonra yere gömülür | at yana devrilir | kundak çöker |
| idle | hafif nefes salınımı | baş sallama | — |

## C. Teknik: örneklemeli (instanced) ordu

Kaynak: `js/units.js` → `MF.units`. three.js r128, WebGL1 uyumlu (ANGLE_instanced_arrays).

- Her birlik tipinin her parçası için **tek InstancedMesh** (iki taraf ortak). Taraf rengi örnek başına `instanceColor` ile gelir ve köşe özniteliği `aTeam` (0..1 maske) ile karıştırılır: `renk = mix(köşeRengi, tarafRengi, aTeam)`. Böylece çizim çağrısı asker sayısından bağımsızdır (hedef: tüm ordu ≤ 45 çağrı).
- Uzuv hareketi CPU'da örnek matrisi olarak hesaplanır.
- Kapasite: aynı anda 320 asker (`kalite=dusuk`: 160).

```
MF.units.TYPES     ['milis','piyade','komutan','suvari','topcu','topcuEr','davulcu','sancaktar']
const army = MF.units.createArmy({ max: 320, quality: 'normal'|'dusuk' })
army.object                    // sahneye eklenecek THREE.Group
army.begin(t)                  // kare başı; t saniye
army.add(type, colorHex, x, z, yaw, scale, state, phase, k) → bool
                               // state: 'idle'|'walk'|'fight'|'fire'|'die'; phase: asker başına rastgele faz; k: 'fire' ve 'die' ilerlemesi 0..1
                               // kapasite dolduysa false
army.end()                     // sayıları ve tamponları günceller
army.headHeight(type)          // isim etiketi yüksekliği (scale=1 için)
army.stats()                   // {soldiers, drawCalls, triangles}
army.dispose()
MF.units.preview(type, colorHex) → THREE.Group   // galeri için örneklemesiz tekil model; userData.animate(t, state, k), userData.height
MF.units.info      {tip: {name, trigger, desc}}  // Türkçe galeri metinleri
```

## D. Savaş alanı ve kamera

### Alan
- Kale merkezleri z = ±15 (kapıdan kapıya ~21 birim). Alan genişliği 14 (x: −7..+7).
- `unit.pos` 0..1 → kendi kapısının 1 birim önünden rakip sura. `unit.lane` −1..1 → x: ±5.5.
- Zemin: ortada geniş toprak yol, iki yanda çiğnenmiş çimen, kazıklı barikatlar, kırık araba, kaya ve çalı öbekleri (alanın kenarlarında, savaşın önünü kapatmadan).

### Bölük → asker
- Mantıktaki her birlik (güç n) ekranda tek tek askerlere açılır: asker sayısı = clamp(round(n / 3), 1, 10).
  - izleyici piyade bölüğü: 1 komutan + kalanı piyade
  - milis: 1–3 milis
  - süvari: clamp(round(n / 8), 1, 5) atlı; izleyiciye aitse en öndeki atlının yanında komutan yürümez, isim etiketi öndeki atlıya bağlanır
  - top: 1 top + 2 topçu eri
  - mehter: 1 davulcu + 1 sancaktar
- Diziliş: lider önde, arkada en fazla 5'li sıralar, aralık 0.7. Savaşta askerler öne açılıp düşmanla tek tek eşleşir (hafif rastgele kayma).
- n azaldıkça askerler tek tek düşer ('die' 0.6 sn, sonra 1.5 sn'de solar; aynı anda en fazla 40 düşmüş asker).
- Toplam asker 320'yi aşarsa bölük başına asker sayısı orantılı azaltılır; izleyici komutanları her zaman çizilir.

### Kamera (dikey 9:16 öncelikli)
- **Savaş kamerası (varsayılan):** alan genişliği (14 birim) ekran genişliğini doldurur. ~52° eğim. Bakış noktası cephe hattını izler: savaşan birliklerin ortalama z'si, yumuşatılmış, ±5 ile sınırlı. Üstte uzak kalenin ön yüzü (kapı binası, ön sur, ön kuleler) başlığın hemen altında, altta yakın kalenin ön kuleleri görünür; kalelerin tamamı kadrajda olmak zorunda değil. Ekranın %27–%75 arası savaş alanıdır.
- **Kale çekimleri:** maç başı tanıtımı (iki kale bütün halde, 6 sn süzülme), sur aşaması olayında 2 sn hasarlı kaleye geçiş, maç sonu töreninde kazanan kale.
- Yatay 16:9: alan yandan 3/4 görünür, aynı kurallar.

### Savaş efektleri (hepsi örneklemeli/ucuz)
- Çarpışma hattında kıvılcım ve toz
- Süvari ve top hareketinde toz izi
- Top atışı: namlu alevi, duman, yay çizen gülle, surda taş parçası ve toz, ekran sarsıntısı
- Sur üstünden cephe hattına ara ara ok yağmuru (yalnızca görsel)
- Mehter etkisinde tarafın askerlerinin ayağında parlayan halka

### Bütçe (yoğun kare)
≤ 150 çizim çağrısı, ≤ 170 bin üçgen, isim etiketi ≤ 14.

## E. Oyun mantığında küçük değişiklik
- Birlik tipi `mancinik` → `topcu` (tüm metinler "Topçu"). Davranış aynı: menzilde durur, 3 sn'de bir sura atış.
- `test/sim.js` güncellenir ve geçmeye devam eder.

## F. İş bölümü
1. **Ajan D:** `js/units.js` (B ve C bölümleri) + görsel test.
2. **Ajan E:** `js/view.js`, `memleket-fethi.html`, `js/game.js`, `test/sim.js`, `js/models.js` (yalnızca eski birlik kodunun kaldırılması ve galeri kataloğu), `README.md` (D ve E bölümleri, ordu entegrasyonu).
