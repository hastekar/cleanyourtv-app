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

## Kişisel karakter

Her izleyicinin haritada adı ve profil fotoğrafıyla yaşayan bir karakteri vardır. Beğeni ve hediyeler o karakterin askerine dönüşür, saldırıyı karakter kendisi yapar ve fethettiği ilin üstünde izleyicinin adı yazar.

| Olay | Oyundaki etkisi |
| --- | --- |
| Yorum: plaka ya da il adı | Karakter o ilin kalesinde doğar, klan yoksa kurulur |
| Yorum: serbest metin | Karakterin üstünde konuşma balonu |
| Yorum: `ben` | İzleyicinin rütbe kartı ekrana gelir |
| Beğeni | Karakter askerle saldırır, 100 beğenide klan Hücum'a geçer |
| 1–9 elmas | Piyade bölüğüyle saldırı |
| 10–99 elmas | Karakter sipahi olur (iki kat hızlı) |
| 100–999 elmas | Karakter top çeker (kaleye çift hasar) |
| 1000+ elmas | Mehter (tüm klan hücuma kalkar) |
| Takip | Karakterin bulunduğu ile 20 sn kalkan |
| Paylaşım | +10 asker |

Rütbeler toplam puana göre: Er, Onbaşı (50), Çavuş (200), Bey (600), Paşa (2000), Vezir (6000), Sultan (20000). Bey ve üstü ata biner.
Puan, fetih sayısı ve klan tarayıcıda saklanır; izleyici sonraki yayında rütbesiyle geri döner.

Hediye gücü `4 × elmas^0.75` ile hesaplanır; küçük hediyeler de işe yarar, büyük hediye turu tek başına bitirmez.
