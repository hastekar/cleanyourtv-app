// Oyun ayarları – istediğin gibi değiştir, sayfayı yenile.
window.GAME_CONFIG = {
  title: 'CANLI TAVAF',
  joinHint: 'Yorum yaz, tavafa katıl',
  lapsPerTawaf: 7,          // bir tavaf = 7 şavt
  lapSeconds: 38,           // orta halkada bir turun süresi (sn)
  joinKeyword: '',          // boş = her yorum katılır. Örn. 'katıl' yazarsan sadece o kelimeyi içeren yorumlar katılır
  idleMinutes: 15,          // bu kadar süre etkileşim yoksa oyuncu meydandan ayrılır
  maxPlayers: 300,
  backgroundCrowd: 70,      // meydan boş görünmesin diye isimsiz kalabalık

  // Hediye kademeleri: gönderilen toplam jeton (coin) değerine göre en yüksek uyan kademe çalışır.
  // effect: gold | speed | inner | group | nur
  giftTiers: [
    { min: 1,   effect: 'gold',  seconds: 90,  icon: '🌹', label: 'Altın isim' },
    { min: 5,   effect: 'speed', seconds: 60,  icon: '⚡', label: 'Hızlan' },
    { min: 20,  effect: 'inner', seconds: 150, icon: '🕋', label: 'İç halka' },
    { min: 99,  effect: 'group', seconds: 240, icon: '👥', label: 'Kafilenle yürü' },
    { min: 500, effect: 'nur',   seconds: 45,  icon: '✨', label: 'Nur yağmuru' },
  ],
};
