# Memleket Fethi v4 — Asker Tasarımı (1915 Çanakkale dönemi)

TASARIM-v3.md'nin A ve B bölümlerinin (çizgi film şövalyeler) yerini alır. C bölümündeki ordu API'si, tip adları ve D bölümündeki savaş alanı aynen kalır.

Referans: kullanıcının gönderdiği yedi görsel (basılabilir minyatür heykeller). Ortak özellikler: gerçekçi-kahraman oranlar, uzun kaput, bel kayışı ve fişeklikler, çapraz omuz kayışı, dolaklı baldır, bot, miğfer/kalpak/fes, bıyıklı yüzler, süngülü tüfek, hareketli duruşlar (koşan, nişan alan, diz çöken, düdük çalan subay, sancak taşıyan, makineli ve havan mürettebatı).

## A. Görsel dil
- **Oran:** gerçekçi-kahraman. Boy 1.0 birim = yaklaşık 6,5 kafa. Kafa 0.15, omuz genişliği 0.30, kaput eteği dize kadar ve aşağı doğru açılır. Önceki iri kafalı çizgi film oranı kaldırılır.
- **Yüzey:** düz çizgi film bantları yerine yumuşak gölgelendirme (iki kademeli yumuşak geçiş), köşe renklerine pişirilmiş kıvrım ve gölge: kaput eteğinde dikey kıvrım çizgileri, kayış ve kemer altlarında koyuluk, alt kısımlar koyu.
- **Renk:** haki-zeytin kaput (0x8a8460), koyu haki pantolon (0x5d5a44), keten dolak (0xb7ab8a), siyah-kahve bot (0x2e2620), deri kayış ve fişeklik (0x6b4226), tüfek ahşabı (0x6a4326) ve namlu çeliği (0x3a3f45), ten (0xd9a57a), bıyık/saç (0x2a1c14), pirinç düğme (0xd6b25a).
- **Takım rengi:** iki taraf da aynı ordunun üniformasını giyer, bu yüzden ayrım şöyle yapılır: kaput rengi takım rengine %40 kaydırılır; pazubent, yaka kırmızısı yerine takım rengi yaka ve omuz apoleti, kabalak şeridi, kalpak tepesi, sancak ve flamalar tam takım rengindedir. Uzaktan iki ordu renk tonundan ayrılmalı, yakından üniforma olarak okunmalı.
- **Ayrıntı önceliği (uzaktan görünenler):** başlık silüeti, kaput eteği, çapraz kayış, bel kemeri + iki fişeklik, dolak bantları, süngülü tüfek, bıyık. Yüz: kaş gölgesi, burun, bıyık; göz ayrıntısı yok.

## B. Birlikler (tip adları değişmez)

| Tip | Yeni kimlik | Görünüm |
| --- | --- | --- |
| `milis` | Kuvayı Milliye neferi | kalpak ya da fes (askerden askere değişir), kısa ceket, şalvarımsı bol pantolon, çapraz çift fişeklik, tüfek; sırt çantası yok |
| `piyade` | Piyade neferi | kabalak (enveriye) miğfer, uzun kaput, bel kemeri + fişeklikler, çapraz ekmek torbası kayışı, sırtta sarılı battaniye, dolak, süngülü Mauser |
| `komutan` | Subay (izleyicinin karakteri) | kalpak, bıyık, bele oturan subay kaputu, çapraz kayış (Sam Browne), tabanca kılıfı, bir elde tabanca, diğer el havada ileri işareti / ağızda düdük; çizme; 1.12 kat boy; ayak altında takım rengi halka |
| `suvari` | Süvari | kalpaklı süvari, çıplak kılıç omuzda, sırtta karabina; sade koşumlu at, eyer altında takım rengi belleme |
| `topcu` | Sahra topu | 75 mm sahra topu: kalkanlı, ince uzun namlu, iki büyük parmaklı tekerlek, kundak kuyruğu, yanında mermi sandığı |
| `topcuEr` | Topçu neferi | kabalak, ceket, diz çökmüş doldurucu / ayakta nişancı |
| `davulcu` | Mehter davulcusu | kalpak, kaput, boyunda büyük davul, tokmak |
| `sancaktar` | Sancaktar | kabalak, kaput, iki elle tutulan uzun direkte dalgalanan büyük takım rengi sancak (referanstaki bayraklı asker gibi) |

Çeşitlilik: aynı tipte askerler `phase` değerine göre küçük farklar gösterir (boy ±%4, bıyıklı/bıyıksız/sakallı, milis için kalpak/fes) ki ordu kopya gibi durmasın. Bu, tip başına 2–3 kafa parçası çeşidi ile yapılır.

## C. Duruş ve canlandırma
| Durum | Yaya | Süvari | Top |
| --- | --- | --- | --- |
| `walk` | tüfek göğüs hizasında çapraz (port arms), koşar adım: bacaklar ±38°, gövde öne 8° eğik, kaput eteği sallanır | dörtnal, kılıç omuzda | tekerlekler döner, mürettebat iter |
| `fight` | **ateş**: ayakta ya da diz çökmüş nişan (phase'e göre), ~1,6 sn'de bir geri tepme + namlu alevi; arada mekanizma kurma hareketi. Çok yakın temasta süngü hamlesi | kılıç savurma, at şaha kalkar | — |
| `fire` (k) | topçu neferi mermi sürer, kulak kapatır | — | namlu geri teper, kundak sarsılır, namlu alevi ve duman |
| `die` (k) | dizlerinin üstüne çöker, yana devrilir, tüfek düşer | at yıkılır | top devrilir |
| `idle` | hazır ol, hafif nefes | at baş sallar | — |

Namlu alevi `units.js` içinde ayrı bir örneklemeli katman olarak çizilir (ateş anında kısa parlak alev); görünümün ayrıca bir şey yapması gerekmez.

## D. Bütçe
Asker başına üçgen: milis ≤ 520, piyade ≤ 640, komutan ≤ 820, süvari ≤ 1250, top ≤ 1000, topçu neferi ≤ 520, davulcu ve sancaktar ≤ 720. Kapasite 280 asker (`kalite=dusuk`: 140). Yoğun karede ordu ≤ 60 çizim çağrısı, ≤ 190 bin üçgen.

## E. Sınır
Referanslar milyonlarca üçgenli heykel modeller; oyun bunları tarayıcıda, telefonda, yüzlercesini aynı anda çizmek zorunda. Hedef aynı **karakteri ve silüeti** düşük üçgenle vermek: yakından bakıldığında heykel ayrıntısı (yüz hatları, kumaş kırışıkları) olmayacak, yayındaki boyutta üniforma ve duruş olarak okunacak.
