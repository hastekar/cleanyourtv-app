# Memleket Fethi

TikTok LIVE için izleyici etkileşimli 81 il fetih oyunu.

- `memleket-fethi.html` — oyunun kendisi (three.js, tek dosya). Demo izleyicilerle kendi başına çalışır.
- `server.js` — TikTok LIVE olaylarını oyuna aktaran köprü sunucusu.

## Canlı yayında kullanım

```
npm install
node server.js <tiktok_kullanici_adi>
```

OBS'te tarayıcı kaynağı ekle: `http://localhost:8787/?obs=1` (1080×1920). `h` tuşu araç çubuğunu açıp kapatır.
Tur süresi için `&tur=300` (saniye).

## Olay eşlemesi

| Olay | Oyundaki etkisi |
| --- | --- |
| Yorum: plaka ya da il adı | Klana katılır, klan yoksa kurar |
| Beğeni | Şehre asker, 100 beğenide Hücum |
| 1–9 elmas | Piyade bölüğü |
| 10–99 elmas | Sipahi (iki kat hızlı) |
| 100–999 elmas | Topçu (kaleye çift hasar) |
| 1000+ elmas | Mehter (tüm klan hücuma kalkar) |
| Takip | Şehre 20 sn kalkan |
| Paylaşım | +10 asker |

Hediye gücü `4 × elmas^0.75` ile hesaplanır; küçük hediyeler de işe yarar, büyük hediye turu tek başına bitirmez.
