# Canlı Tavaf – TikTok LIVE interaktif oyunu

İzleyiciler **yorum yazarak** meydana katılır, Kâbe'nin etrafında yürür ve şavtları (0/7) sayılır.
**Hediye** gönderenler jeton değerine göre efekt kazanır. 9:16 dikey (1080×1920) yayın için tasarlandı.

| Etkileşim | Sonuç |
|---|---|
| Yorum | Tavafa katılır |
| Beğeni | Kısa süreli hızlanma |
| Takip / paylaşım | 45 sn altın isim |
| 1+ jeton hediye | Altın isim |
| 5+ jeton | Hızlan (2×) |
| 20+ jeton | İç halka (Kâbe'ye yakın, turlar kısalır) |
| 99+ jeton | Kafilenle yürü (8 kişilik grup) |
| 500+ jeton | Nur yağmuru (tüm meydan + büyük duyuru) |

Kademeler, süreler, başlık ve katılım kelimesi `public/config.js` içinden değiştirilir.

## Kurulum

Node.js 18+ gerekir.

```bash
cd tiktok-live-game
npm install
node server.js TIKTOK_KULLANICI_ADIN     # yayın AÇIKKEN çalıştır
```

- Oyun: <http://localhost:3000/>
- Yayın olmadan deneme: <http://localhost:3000/?demo=1> (sahte izleyiciler)
- Test tuşları: `J` = katılım, `1`–`5` = hediye kademeleri

## Yayına ekleme

**TikTok LIVE Studio** veya **OBS**'te bir *Tarayıcı kaynağı / Browser Source* ekle:
URL `http://localhost:3000/`, boyut 1080×1920. Alt kısım TikTok sohbetinin altında kalacağı için boş bırakıldı.

## Notlar

- Bağlantı, resmî olmayan `tiktok-live-connector` kütüphanesi ile kurulur; TikTok tarafındaki değişiklikler bağlantıyı
  geçici olarak bozabilir. Yoğun kullanımda `EULER_API_KEY` ortam değişkeni ile eulerstream.com anahtarı verilebilir.
- Yayın kopar veya henüz açılmamışsa sunucu 30 sn'de bir yeniden dener.
- Hediye karşılığı katılım içeren yayınlarda TikTok'un LIVE ve hediye kurallarına uyulması yayıncının sorumluluğundadır.
