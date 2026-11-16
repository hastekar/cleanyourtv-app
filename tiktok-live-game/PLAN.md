# Memleket Fethi v2 — Kuşatma Düellosu Planı

## 1. Neden değişiyor

v1'in sorunları: 81 il aynı anda ekranda olduğu için kaleler küçük, kuş bakışı açıda koni gibi; 81 dağınık takım olduğu için net bir "biz ve onlar" yok, dolayısıyla hediye göndermek için sebep yok.

v2'nin cevabı: ekranda her an **yalnızca iki şehir** var. İki büyük, surlu İngiliz kalesi karşı karşıya; aradaki yolda izleyicilerin kendi adını taşıyan askerleri çarpışıyor. Kimin kazandığı her saniye üstteki can barlarından okunuyor. 81 il haritası kaybolmuyor: köşede "fetih haritası" olarak kalıyor ve her maçın sonucu oraya işleniyor.

## 2. Oyun tasarımı

### Maç
- İki taraf: **şampiyon** (uzaktaki kale, side 0) ve **meydan okuyan** (yakındaki kale, side 1). Her taraf bir il (plaka).
- Süre 180 sn (`?tur=`). Kale canı 1500 + 10 × izleyici sayısı (üst sınır 6000).
- Akış: `intro` (6 sn, "SIRADAKİ KUŞATMA: 34 İstanbul ⚔ 06 Ankara") → `play` → `end` (10 sn tören) → yeni `intro`.
- Kazanan: rakip kalenin canını 0'a indiren; süre biterse can yüzdesi yüksek olan; eşitse +30 sn uzatma.
- Kazanan şampiyon olur/kalır (galibiyet serisi sayılır). Kaybedenin ili fetih haritasında kazananın rengine boyanır, üstüne kazanan tarafın en çok katkı veren izleyicisinin adı yazılır.
- Sıradaki meydan okuyan: oy sırasındaki en çok oy alan plaka (şampiyon hariç). Oy yoksa şampiyon topraklarına komşu rastgele bir il.
- İlk maç: demo/boş durumda 34 İstanbul ⚔ 06 Ankara.

### İzleyici → taraf
- Yoruma plaka ya da il adı yazan izleyicinin "memleketi" kaydedilir (kalıcı).
- Memleketi o an savaşan iki ilden biriyse o tarafta oynar.
- Değilse: plakası **sıradaki rakip oylamasına 1 oy** sayılır ve izleyici bu maç için oyuncusu az olan tarafa **gönüllü** olarak atanır (maç boyunca sabit). Kendi ili sahaya çıkınca otomatik oraya geçer.
- Hiç plaka yazmadan beğenen/hediye gönderen izleyici de gönüllü atanır (kimse boşta kalmaz).

### Olay → oyun
| Olay | Etki |
| --- | --- |
| Beğeni | Her beğeni 1 güç. İzleyicinin gücü birikir; 6 güce ulaşınca (ya da 1,5 sn sonra) kendi adını taşıyan **piyade bölüğü** kapıdan çıkar |
| 1–9 elmas | Hemen piyade bölüğü (güç = round(4 × elmas^0.75)) |
| 10–99 elmas | **Şövalye süvarisi**: iki kat hızlı, güçlü |
| 100–999 elmas | **Mancınık**: sura menzilden taş atar, sur hasarı yüksek |
| 1000+ elmas | **Mehter/Kral çağrısı**: 12 sn boyunca tarafın tüm hasarı +%50, 5 dalga piyade, sura 150 onarım |
| Takip | Kendi surlarına 8 sn kalkan + 40 onarım |
| Paylaşım | +10 güç |
| Yorum (serbest) | İzleyicinin askerinin üstünde konuşma balonu, +1 güç (2 sn bekleme) |
| Yorum `ben` | Rütbe kartı |
| Seri hediye (repeat ≥ 5) | "x10 KOMBO" |

### Rekabeti kuran mekanikler
1. **Çift can barı + çekişme çubuğu** her an ekranda.
2. **Taraf başına ilk 3 destekçi** fotoğraflarıyla kendi kalesinin yanında (hediye yarışının kendisi).
3. **İntikam**: can yüzdesi rakipten 15 puandan fazla gerideyse o tarafın beğenileri ×1,5 güç; ekranda "İNTİKAM x1.5" rozeti.
4. **Son 30 saniye**: tüm hasar ×2, sayaç kırmızı yanıp söner.
5. **Sur aşamaları**: %66 ve %33'te sur gediği açılır; kamera o kaleye yaklaşır, afiş çıkar ("ANKARA SURLARI YARILDI").
6. **Şampiyon serisi**: "İstanbul 3 maçtır yenilmiyor" ve sıradaki rakip oylaması ("Sıradaki: 35 İzmir 12 oy") her an görünür; yenilmeyen şampiyon tüm diğer şehirlere hedef olur.
7. **Tören**: kazanan tarafın 1 numaralı destekçisi "Fatih" olarak fotoğrafıyla ilan edilir, sesli anons.
8. Kale kendiliğinden 4 sn'de bir 3 güçlük milis çıkarır; izleyici azken de yol boş kalmaz, ama sonucu izleyici belirler.

### Kişisel öğeler (v1'den korunur)
Rütbeler (Er, Onbaşı, Çavuş, Bey, Paşa, Vezir, Sultan; eşikler 0/50/200/600/2000/6000/20000 toplam puan), kalıcı kayıt, rütbe kartı, konuşma balonu ve küfür/bağlantı süzgeci, "Tekrar hoş geldin". Puan: beğeni 1, yorum 1, elmas ×5, takip 20, paylaşım 30, maç kazanan taraf üyelerine +25.

## 3. TikTok mobil (Android + iPhone) uyumu

İzleyici oyunu TikTok uygulamasında **video olarak** izler ve yorum/beğeni/hediye ile katılır; izleyici telefonunda kod çalışmaz. Bu yüzden iki şey önemli: ekran düzeni ve yayıncının oyunu nerede çalıştırdığı.

### Ekran düzeni: 1080×1920 dikey, güvenli alanlar
TikTok mobil arayüzü videonun üstüne biner. Kritik hiçbir şey şu bölgelere konmaz (CSS değişkenleriyle ayarlanır):
- Üst %0–11: yayıncı bilgisi, izleyici sayısı (`--safe-top:11%`)
- Alt %0–36, soldan %78 genişlik: sohbet akışı; en alt %8: yorum çubuğu (`--safe-bottom:36%`)
- Sağ kenar %12, yükseklik %45–78: hediye/beğeni animasyonları (`--safe-right:12%`)

Yerleşim:
- %11–19: can barları, şehir adları, sayaç, çekişme çubuğu
- %19–24: tek satır dönen ipucu ("Yoruma plakanı yaz", "Beğen: asker gönder") ve sıradaki rakip oylaması
- %24–64: sahne (uzak kale üstte, yakın kale altta, arada yol)
- Sol/sağ kenar orta bant: tarafların ilk 3 destekçisi
- %64'ün altı: yalnızca zemin ve yakın kalenin ön yüzü; metin yok. Rütbe kartı ve fetih haritası %45–64 bandında sağda/solda küçük durur.
- Yazılar 1080 genişlikte en az 28 px; telefon ekranında okunur olmalı.

### Yayıncı oyunu nerede çalıştırır
- **A (önerilen): bilgisayar + TikTok LIVE Studio veya OBS.** Tarayıcı kaynağı 1080×1920, `http://localhost:8787/?obs=1`.
- **B: yalnızca telefon.** Köprü sunucusu bir bilgisayarda/bulutta çalışır; telefon tarayıcısında (Android Chrome, iPhone Safari) sayfa `?ws=wss://sunucu` ile açılır ve TikTok uygulamasının mobil oyun/ekran paylaşımı ile yayınlanır. Bunun için sayfa mobil tarayıcıda akıcı çalışmalı:
  - WebGL1 uyumlu, three.js r128 global derleme, modül yok
  - piksel oranı en fazla 2, `?kalite=dusuk` ile 1
  - kare başına ≤ 150 çizim çağrısı, ≤ 120 bin üçgen, aynı anda ≤ 120 birlik
  - gerçek gölge haritası yok; DOM etiketi ≤ 20
  - iOS: ses yalnızca dokunuştan sonra; `100vh` yerine `height:100%`; safe-area inset'leri

## 4. Mimari

Modül yok; her dosya `window.MF` ad alanına yazar. Yükleme sırası: three.min.js → data.js → models.js → game.js → view.js.

```
tiktok-live-game/
  memleket-fethi.html   sayfa parçası (doctype/html/head/body etiketi YOK): <title>, <style>, DOM, <script src="js/...">
  js/data.js            il verisi, renkler, plaka çözümleme, harita ızgarası
  js/models.js          3B modeller (THREE gerekir)
  js/game.js            oyun mantığı (THREE ve DOM KULLANMAZ; node'da test edilir)
  js/view.js            sahne, kamera, HUD, köprü bağlantısı
  test/sim.js           node ile başsız oyun testi
  server.js             köprü + statik dosya sunucusu
```

### 4.1 `MF.data` (js/data.js)
```
MF.data.IL            [{id, name, lon, lat}]  81 il (v1'deki listeden)
MF.data.P             {id: il}
MF.data.adj           {id: [komşu id...]}      v1'deki Voronoi ızgarasından
MF.data.colorHex(id)  → 0xRRGGBB  (v1: HSL(((id*47)%360), .72, .56))
MF.data.css(id)       → '#rrggbb'
MF.data.parsePlate(s) → 1..81 | 0   (plaka ya da il adı; v1'deki kural)
MF.data.grid          {W, H, cell:Int8Array}   mini harita boyaması için (cell = il dizini ya da -1)
```
`data.js` DOM/THREE kullanmaz, node'da `require` edilebilir (`if(typeof module!=='undefined')module.exports=MF`).

### 4.2 `MF.models` (js/models.js)
Tüm modeller +Z yönüne bakar, zemin y=0. Her model v1'deki `Bld` birleştiricisiyle tek geometriye indirilir: grup 0 köşe renkli sabit malzeme, grup 1 taraf rengi malzemesi (model başına ≤ 2 çizim çağrısı; kale ≤ 4).

```
MF.models.castle(colorHex) → THREE.Group
   userData.setDamage(f)   f = kalan can oranı 1..0. Aşamalar: >0.66 sağlam, 0.33–0.66 gedikli, <0.33 yıkık, 0 = düşmüş
   userData.setColor(hex)
   userData.setShield(bool)
   userData.gate           THREE.Vector3 (yerel) kapı önü, birliklerin çıktığı nokta
   userData.wallZ          ön surun yerel z'si (düşmanın vurduğu çizgi)
   userData.tick(t)        sancak dalgalanması vb.
   Boyut: taban ~8 (x) × 6 (z) birim, sur yüksekliği ~1.6, köşe kuleleri ~2.6, iç kale (keep) ~4.
   Görünüm: İngiliz ortaçağ kalesi — dikdörtgen perde suru (curtain wall) ve üstünde mazgal dişleri, 4 yuvarlak köşe kulesi,
   önde iki kuleli kapı binası (gatehouse) ve demir ızgaralı kemerli kapı, ortada kare iç kale (keep) ve köşe kulecikleri,
   ok mazgalları, taş sıraları, sur üstünde taraf rengi sancaklar ve duvardan sarkan armalı flamalar, keep tepesinde büyük bayrak.
   Çatı konisi YOK (v1'deki "koni" görüntüsünden kaçın): kuleler düz, mazgallı tepeli.
   Hasar aşamaları ayrı önceden üretilmiş geometrilerdir (gedik, dökülmüş taş yığını, eğik kule, is lekesi).
MF.models.unit(type, colorHex) → THREE.Group      type: 'piyade' | 'milis' | 'suvari' | 'mancinik' | 'mehter'
   userData.animate(t, state)   state: 'walk' | 'fight' | 'idle'
   userData.height              isim etiketi için tepe yüksekliği
   'piyade' = önde ayrıntılı lider + arkada 2 sade asker (izleyici bölüğü); 'milis' = tek sade asker
   Yaya ~1 birim boy. Mancınıkta kol 'fight' durumunda atış yapar gibi sallanır.
MF.models.stone() → THREE.Mesh                    mancınık taşı
MF.models.catalog  [{id, name, trigger, desc, make()}]   galeri için (Türkçe metin)
MF.models.dispose()
```
Üçgen bütçesi: kale ≤ 14 bin, ayrıntılı birlik ≤ 2,5 bin, milis ≤ 500.

### 4.3 `MF.game` (js/game.js)
```
const g = MF.game.create({ round:180, storage:{get(k),set(k,v)}, now:()=>ms, random:Math.random })
g.onEvent(e)      e = {type:'chat'|'like'|'gift'|'follow'|'share'|'member'|'roomUser',
                       uid, name, pic, comment, count, diamonds, repeat, giftName, viewers}
g.step(dt)        dt saniye (≤ 0.1)
g.botTick()       bir demo izleyici olayı üretir (view, demo açıkken ~0.2 sn'de bir çağırır)
g.on(name, fn)    olay dinleyici
g.state           aşağıdaki salt-okunur durum
```
`g.state`:
```
phase: 'intro'|'play'|'end',  phaseT, timeLeft, overtime:bool, doubleDmg:bool
sides: [ {id, name, hp, maxHp, shield (sn), buff (sn), revenge:bool, players:int, score, top:[{user, pts}] (ilk 3)} , {...} ]
champion: {id, streak},  queue: [{id, votes}] (çoktan aza, ilk 5),  owners: {ilId: sahipIlId},  conquerors: {ilId: izleyiciAdı}
units: [ {id, side, type, n (güç), hp, pos (0..1: kendi kapısından rakip sura), lane (-1..1 yanal), state:'walk'|'fight'|'idle', user|null} ]
users: {uid: {id, name, pic, home, side, volunteer:bool, pts (maç), life (toplam), rank, wins}}
winner: 0|1|null,  fatih: user|null
RANKS: [...]
```
Yayınlanan olaylar (`g.on`): 
`spawn(unit)`, `remove(unit, reason)`, `wallHit(side, dmg, byUnit)`, `stage(side, stage 1|2|3)`, `shot(unit, side)` (mancınık taşı), 
`banner({big, small, side})`, `feed({text, side})`, `card({user, why})`, `bubble({user, text})`, `say(text)`, `sfx(name)`,
`phase(phase)`, `matchEnd({winner, fatih})`.

Savaş modeli (sade ve hızlı): birlikler `pos` üzerinde ilerler; karşı taraftan bir birlikle mesafe < 0.04 olunca ikisi de `fight`'a geçer ve birbirine saniyede `2.5 × n^0.8` hasar verir (birlik canı = 10 × n; süvari ×1.5 can, ×2 hız; mancınık canı 40, `pos` 0.6'da durur, 3 sn'de bir sura 60 hasar). `pos ≥ 1` olan birlik sura saniyede `1.2 × n^0.8` hasar verir. Aynı anda en fazla 120 birlik; sınır dolunca yeni güç, aynı tarafın en yakın birliğine eklenir.

`test/sim.js`: node ile `data.js` + `game.js` yüklenir, sahte olaylarla 20 maç koşturulur. Doğrulanacaklar: her maç biter; iki taraf da kazanabiliyor; tek taraf yoğun hediye alınca o taraf kazanıyor; intikam ve son 30 sn kuralları devreye giriyor; şampiyon/oy sırası/fetih haritası güncelleniyor; kalıcı kayıt yazılıp geri okunuyor; birlik sayısı 120'yi aşmıyor.

### 4.4 Görünüm (memleket-fethi.html + js/view.js)
- Sahne: uzak kale z = −9, yakın kale z = +9 (gate'ler birbirine bakar), arada 6 birim genişlikte toprak yol, iki yanda çimen/ağaç öbekleri (tek birleşik geometri). `unit.pos` → dünya z'si doğrusal eşlenir.
- Kamera: dikey 9:16 için yakın kalenin arkasından yukarıdan ~35° bakış; iki kale de kadrajda, uzak kale yakın kalenin en az %65'i büyüklüğünde görünür. Hafif salınım, büyük vuruşta sarsıntı, sur aşamasında 2 sn yakınlaşma. Yatay ekranda da çalışır (yan bakış) ama öncelik dikey.
- HUD: 3. bölümdeki güvenli alan yerleşimi. v1'deki görsel kimlik korunur (koyu deniz/gece zemin, altın başlık, Lilita One + Rubik).
- İsim etiketleri: yalnızca izleyiciye ait birlikler, en fazla 14; fotoğraf + ad + rütbe.
- Fetih haritası: `MF.data.grid` + `g.state.owners` ile 2B canvas.
- Yayıncı araç çubuğu (demo aç/kapa, plaka, test düğmeleri, modeller galerisi, ses) ekranın altında; `?obs=1` ya da `h` tuşuyla gizlenir.
- Köprü: `?ws=` WebSocket, üstel geri çekilmeyle yeniden bağlanma; bağlanınca demo kapanır.
- Ses: WebAudio davul + `speechSynthesis` (tr-TR), yalnızca "Ses" düğmesinden sonra.
- `window.MemleketFethi = {onEvent, state, info}`.

## 5. İş bölümü
1. **Ajan A — modeller**: `js/models.js`.
2. **Ajan B — oyun mantığı**: `js/data.js`, `js/game.js`, `test/sim.js`.
3. **Ajan C — görünüm ve birleştirme** (A ve B bitince): `memleket-fethi.html`, `js/view.js`, `server.js` (statik `js/` sunumu), `README.md`.
4. Doğrulama: 540×960 ve 390×844 (mobil) ekran görüntüleri, çizim çağrısı ölçümü, `node test/sim.js`.
