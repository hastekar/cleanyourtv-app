// Oyun ayarları – istediğin gibi değiştir, sayfayı yenile.
window.GAME_CONFIG = {
  title: 'CANLI TAVAF',
  // Katılım şekli: 'gift' = yalnızca hediye gönderen meydana girer, 'comment' = yorum yazan da girer
  joinMode: 'gift',
  lapsPerTawaf: 7,          // bir tavaf = 7 şavt
  lapSeconds: 58,           // orta halkada bir turun süresi (sn)
  joinKeyword: '',          // yalnızca joinMode 'comment' iken: boş = her yorum katılır, 'katıl' = o kelimeyi içerenler
  idleMinutes: 15,          // bu kadar süre etkileşim yoksa oyuncu meydandan ayrılır
  maxPlayers: 200,
  backgroundCrowd: 70,      // meydan boş görünmesin diye isimsiz kalabalık
  shadows: true,            // yavaş bilgisayarda false yap
  renderScale: 1,           // 3B çözünürlük çarpanı; kasarsa 0.75 yap
  closeShotEvery: 18,       // kaç saniyede bir yakın çekim (0 = hep geniş açı)

  // Hediye kademeleri: gönderilen toplam jeton (coin) değerine göre en yüksek uyan kademe çalışır.
  // effect: gold | speed | inner | group | nur
  giftTiers: [
    { min: 1,   effect: 'gold',  seconds: 90,  icon: '🌹', label: 'Tavafa katıl' },
    { min: 5,   effect: 'speed', seconds: 60,  icon: '⚡', label: 'Hızlan' },
    { min: 20,  effect: 'inner', seconds: 150, icon: '🕋', label: 'İç halka' },
    { min: 99,  effect: 'group', seconds: 240, icon: '👥', label: 'Kafilenle yürü' },
    { min: 500, effect: 'nur',   seconds: 45,  icon: '✨', label: 'Nur yağmuru' },
  ],
};
