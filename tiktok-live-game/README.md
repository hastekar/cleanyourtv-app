# Memleket Fethi v2: Kuşatma Düellosu

TikTok LIVE için tarayıcı oyunu. Ekranda her an yalnızca iki şehir var: uzaktaki kale **şampiyon**, yakındaki kale **meydan okuyan**. İzleyicilerin kendi adını taşıyan askerleri aradaki yolda çarpışır, kimin kazandığı üstteki can barlarından okunur. 81 ilin fetih haritası köşede durur, her maçın sonucu oraya işlenir. Tasarım ayrıntıları için `PLAN.md`.

## İzleyici nasıl oynar

| İzleyici ne yapar | Ne olur |
| --- | --- |
| Yoruma plaka ya da il adı yaz (`34`, `izmir`) | Memleketi kaydedilir; ili savaşıyorsa o tarafta oynar. Değilse sıradaki rakibe 1 oy verir ve gönüllü olarak az oyunculu tarafa geçer |
| Beğeni | Her beğeni 1 güç; 6 güçte kendi adını taşıyan piyade bölüğü kapıdan çıkar |
| 1-9 elmas | Hemen piyade bölüğü |
| 10-99 elmas | Şövalye süvarisi (iki kat hızlı, güçlü) |
| 100-999 elmas | Topçu: sura menzilden taş atar |
| 1000+ elmas | Mehter: 12 sn tüm hasar +%50, 5 dalga piyade, sura onarım |
| Takip | Kendi surlarına 8 sn kalkan ve onarım |
| Paylaşım | +10 güç |
| Serbest yorum | Askerinin üstünde konuşma balonu, +1 güç |
| Yoruma `ben` | Rütbe kartı |

Geride kalan taraf "İNTİKAM ×1.5" alır, son 30 saniyede tüm hasar ×2 olur. Maç 180 sn sürer, kazanan şampiyon olur; tören ekranında en çok katkı veren izleyici "Fatih" ilan edilir.

## Çalıştırma

```
npm install
node server.js <tiktok_kullanici_adi> [port]     # varsayılan port 8787
```

**A) Bilgisayar + TikTok LIVE Studio / OBS (önerilen).** Tarayıcı kaynağı ekle, boyut **1080×1920**, adres `http://localhost:8787/?obs=1`. Köprü TikTok olaylarını WebSocket ile sayfaya yollar; bağlanınca demo kapanır.

**B) Yalnızca telefon.** Köprü sunucusunu bir bilgisayarda ya da bulutta çalıştır, telefondaki tarayıcıda (Android Chrome, iPhone Safari) `https://sayfa-adresi/?ws=wss://sunucu-adresi` aç ve ekranı TikTok uygulamasıyla yayınla. Ses iOS'ta yalnızca "Ses" düğmesine dokunduktan sonra açılır.

Köprü olmadan denemek için `memleket-fethi.html` dosyasını `server.js` olmadan sunan herhangi bir statik sunucuyla açabilirsin (`js/` klasörü yanında olmalı); sayfa demo izleyicilerle çalışır.

## Adres parametreleri

| Parametre | Anlamı |
| --- | --- |
| `ws=ws://...` | Köprü adresi; üstel geri çekilmeyle yeniden bağlanır |
| `sim=0` | Demo izleyicileri kapat (WebSocket bağlıyken zaten kapalı) |
| `obs=1` (ya da `#obs`) | Yayıncı araç çubuğunu gizle; `h` tuşu aç/kapa. Araç çubuğu gizli olduğu için **ses kendiliğinden açılır** |
| `ses=1` / `ses=0` | Sesi açılışta aç / kapat (OBS dışında tarayıcı ilk dokunuşa kadar sesi engelleyebilir) |
| `cavus=1..6` | "Çavuş" telaffuz varyantı (aşağıda *Telaffuz*); kayıtlı seçimi geçersiz kılar |
| `tur=60` | Maç süresi (sn), varsayılan 180 |
| `kalite=dusuk` | Piksel oranı 1, daha az süs ve daha düşük çizim bütçesi (zayıf telefonlar) |

Araç çubuğunda demo aç/kapa, plaka kutusu, test düğmeleri (beğeni ×20, 1/30/199/1000 elmas, takip), 3B model galerisi ("Modeller") ve ses düğmesi var.

## TikTok güvenli alanları

Sayfa 1080×1920 dikey yayına göre yerleşir; TikTok arayüzünün bindiği bölgelerde önemli hiçbir şey durmaz. Değerler `memleket-fethi.html` içindeki `:root` değişkenleridir:

| Değişken | Varsayılan | Bölge |
| --- | --- | --- |
| `--safe-top` | `11%` | Üstte boş bırakılır (yayıncı bilgisi, izleyici sayısı) |
| `--safe-bottom` | `36%` | Altta sohbet akışı ve yorum çubuğu; sahne bu çizginin üstünde biter |
| `--safe-right` | `12%` | Sağ kenar, %45-78 yükseklik: hediye animasyonları; kart ve harita bu şeridin soluna konur |

Sahne: kale merkezleri z=±15, savaş alanı 14 birim genişliğinde. Savaş kamerası alanı ekran genişliğine sığdırır (~52° eğim) ve cephe hattını yumuşakça izler; maç başında iki kaleyi gösteren süzülme, sur aşamasında 2 sn hasarlı kaleye geçiş ve törende kazanan kale çekimi vardır (`prefers-reduced-motion`: kesme, sallanma yok).

Ordu: her mantık birliği `js/units.js` ile tek tek askerlere açılır (komutan, piyade, milis, süvari, topçu + 2 er, mehter), örneklemeli çizilir; en fazla 200 asker (`kalite=dusuk`: 100). Ses: `js/audio.js` (üretilen müzik ve efektler, Türkçe konuşma); araç çubuğundaki "Ses" düğmesiyle (OBS kipinde kendiliğinden) açılır, müzik/efekt kaydırıcıları yanındadır. Mehter marşı 1000+ elmasta çalar ve marşın tamamı duyulsun diye en az 21 sn sürer. Türkçe ses yoksa konuşma susar ve durum satırında yazar.

Yerleşim: %11-19 can/sayaç/çekişme çubuğu, %19-24 ipucu ve sıradaki rakip, %24-64 sahne (iki kale bu bantta tam görünür; kamera `fit()` ile hesaplar). Yazı boyları `--u` (ekran genişliğinin %1'i) ile verilir; 1080 px'te en küçük yazı 26 px'in üstündedir. Yatay ekranda (16:9) güvenli değerler otomatik küçülür ve kamera yandan bakar.

## Denge ayarı

Tüm sayılar `js/game.js` başındaki `TUNE` nesnesindedir: süreler, can (`hpBase`, `hpPerViewer`), hız, hasar (`dps`, `wallDps`), kademe eşikleri (`tierCav`, `tierCat`, `tierMehter`), intikam, kalkan, mehter. Kod içinde değiştirmeden denemek için `MF.game.create({tune:{...}})`.

## Test

```
node test/sim.js
```

Başsız olarak 20 maç koşturur: her maç biter, iki taraf da kazanabilir, yoğun hediye alan taraf kazanır, intikam/son 30 sn kuralları çalışır, kayıt yazılıp geri okunur, birlik sayısı 120'yi aşmaz. Görünüm için sayfayı açıp `MemleketFethi.info()` ile çizim çağrısı ve üçgen sayısına bakabilirsin (hedef ≤150 çağrı, ≤120 bin üçgen).

## Telaffuz

Rütbe sözcüğü tarayıcının Türkçe sesiyle okunur ve "Çavuş" bazı seslerde yanlış çıkabilir. Oyun artık Çavuş ve üstü rütbe atlamalarını düz cümleyle söyler ("Ali çavuş oldu."; Onbaşı sessiz, en fazla 4 sn'de bir). Ses motoruna giden metinde ayrıca bir sözlük (Çavuş, Onbaşı, Paşa, Vezir, Sultan, Bey, Fatih, mehter, kuşatma, kale, sur, topçu, süvari, derbi, intikam, hücum) sözcükleri küçük harfe çevirir ve "Çavuşoğlu" gibi adlara dokunmaz.

"Çavuş" için 6 yazım biçimi vardır (SSML yok; Chrome/Edge/OBS onu yok sayar):

1. `çavuş` (varsayılan, düz küçük harf)
2. `ça vuş` (hece bölme, boşluklu)
3. `çavvuş` (çift v, v'yi net ünsüz yapar)
4. `ça-vuş` (tireli hece sınırı)
5. `çavoş` ("avu" kümesini hiç üretmez)
6. `chavush` (Latin-fonetik yedek)

**Deneme:** araç çubuğundaki "Çavuş sesi N/6" düğmesine her basışta sıradaki biçim seslendirilir ("…, çavuş oldu."), seçim tarayıcıda (`mf2-pron`) saklanır. Ses kapalıysa düğme önce sesi açar. **Kalıcı yapma:** araç çubuğu OBS'te gizli olduğundan, normal tarayıcıda kulağınla doğru gelen numarayı bulup OBS adresine ekle, örneğin `http://localhost:8787/?obs=1&cavus=4`.

Dürüst not: doğru biçim makinendeki Türkçe sese (Google Türkçe, Microsoft vb.) bağlıdır; kodla önceden bilinemez, mutlaka kulakla seç.

## Dosyalar

```
memleket-fethi.html   sayfa parçası (server.js tam HTML belgesine sarar)
js/data.js            il verisi, renkler, plaka çözümleme, harita ızgarası
js/models.js          3B modeller (three.js r128)
js/game.js            oyun mantığı (DOM/THREE yok)
js/view.js            sahne, kamera, HUD, köprü bağlantısı
server.js             TikTok köprüsü + statik dosya sunucusu (/js/)
test/sim.js           başsız oyun testi
```
