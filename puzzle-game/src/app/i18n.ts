const tr = {
  title: 'Lumo Match',
  tagline: 'Adil eşleştirme bulmacası',
  play: 'Oyna',
  level: 'Seviye',
  levels: 'Seviyeler',
  moves: 'Hamle',
  score: 'Puan',
  settings: 'Ayarlar',
  sound: 'Ses',
  haptics: 'Titreşim',
  assist: 'Zorlanınca ek hamle ver',
  assistNote: 'Aynı seviyede üst üste kaybedersen sonraki denemede birkaç ek hamle alırsın. Taşların düşme sırası asla değişmez.',
  language: 'Dil',
  reset: 'İlerlemeyi sıfırla',
  resetConfirm: 'Tüm ilerlemen ve güçlendiricilerin silinecek. Emin misin?',
  yes: 'Evet, sil',
  cancel: 'Vazgeç',
  privacy: 'Gizlilik',
  privacyText: 'Bu oyun hesap istemez, reklam göstermez, satın alma içermez ve cihazından hiçbir veri toplamaz. İlerlemen yalnızca bu cihazda saklanır.',
  privacyTextSync: 'Bu oyun reklam göstermez ve satın alma içermez. Kazandığın seviyelerin hamle listesi, rastgele üretilmiş anonim bir cihaz kimliğiyle birlikte puan doğrulaması için sunucuya gönderilir. Ad, e-posta veya konum toplanmaz.',
  fair: 'Adil oyun sözü',
  fairText: 'Her seviye, hiçbir güçlendirici kullanılmadan kazanılabildiği bilgisayarla kanıtlanmadan yayınlanmaz. Taşların düşme sırası seviyeye sabittir; ne kadar oynadığına ya da kazandığına göre değişmez. Can sistemi, süre baskısı, reklam ve satın alma yoktur. Güçlendiriciler yalnızca oynayarak kazanılır.',
  close: 'Kapat',
  resume: 'Devam et',
  restart: 'Yeniden başla',
  home: 'Ana menü',
  paused: 'Duraklatıldı',
  next: 'Sonraki seviye',
  retry: 'Tekrar dene',
  won: 'Seviye tamam!',
  lost: 'Hamle bitti',
  lostHint: 'Bu seviye güçlendirici olmadan kazanılabilir; kanıtı oyunun içinde saklı.',
  assistNext: 'Sonraki denemede +{n} ek hamle',
  assistNow: '+{n} ek hamle verildi',
  best: 'En iyi',
  newBest: 'Yeni rekor!',
  reward: 'Ödül',
  hammer: 'Çekiç',
  shuffle: 'Karıştır',
  hammerAim: 'Kırmak istediğin taşa dokun',
  noMoves: 'Hamle kalmadı — tahta karıştırıldı',
  allDone: 'Tüm seviyeleri bitirdin. Tebrikler!',
  goalScore: '{n} puan topla',
  goalColor: 'Taş topla',
  goalFrost: 'Buzları kır',
  goalCrate: 'Kasaları kır',
  howTo: 'Yan yana iki taşı kaydır, aynı türden 3 veya daha fazlasını yan yana getir. 4’lü çizgi, L/T bomba, 5’li gökkuşağı taşı verir.',
  stars: 'yıldız',
  locked: 'Kilitli',
  storageWarn: 'Bu cihaz ilerlemeyi kaydetmeye izin vermiyor; oyunu kapatınca ilerleme kaybolur.',
};

export type Key = keyof typeof tr;

const en: Record<Key, string> = {
  title: 'Lumo Match',
  tagline: 'The fair match puzzle',
  play: 'Play',
  level: 'Level',
  levels: 'Levels',
  moves: 'Moves',
  score: 'Score',
  settings: 'Settings',
  sound: 'Sound',
  haptics: 'Vibration',
  assist: 'Give extra moves when I struggle',
  assistNote: 'If you lose the same level several times in a row, your next try gets a few extra moves. The order tiles fall in never changes.',
  language: 'Language',
  reset: 'Reset progress',
  resetConfirm: 'All your progress and boosters will be deleted. Are you sure?',
  yes: 'Yes, delete',
  cancel: 'Cancel',
  privacy: 'Privacy',
  privacyText: 'This game needs no account, shows no ads, has no purchases and collects no data from your device. Your progress is stored on this device only.',
  privacyTextSync: 'This game shows no ads and has no purchases. The move list of each level you win is sent to the server with a random anonymous device ID so the score can be verified. No name, email or location is collected.',
  fair: 'Fair play promise',
  fairText: 'No level ships until a computer has proven it can be won without any booster. The order tiles fall in is fixed per level; it does not change with how long you play or how often you win. There are no lives, no timers, no ads and no purchases. Boosters are only earned by playing.',
  close: 'Close',
  resume: 'Resume',
  restart: 'Restart',
  home: 'Main menu',
  paused: 'Paused',
  next: 'Next level',
  retry: 'Try again',
  won: 'Level complete!',
  lost: 'Out of moves',
  lostHint: 'This level can be won without boosters; the proof ships inside the game.',
  assistNext: '+{n} extra moves on your next try',
  assistNow: '+{n} extra moves granted',
  best: 'Best',
  newBest: 'New best!',
  reward: 'Reward',
  hammer: 'Hammer',
  shuffle: 'Shuffle',
  hammerAim: 'Tap the tile you want to break',
  noMoves: 'No moves left — board shuffled',
  allDone: 'You finished every level. Congratulations!',
  goalScore: 'Reach {n} points',
  goalColor: 'Collect tiles',
  goalFrost: 'Break the ice',
  goalCrate: 'Break the crates',
  howTo: 'Swipe two neighbouring tiles to line up 3 or more of a kind. 4 in a row makes a line tile, an L or T makes a bomb, 5 in a row makes a rainbow tile.',
  stars: 'stars',
  locked: 'Locked',
  storageWarn: 'This device does not allow saving; progress is lost when you close the game.',
};

export type Lang = 'tr' | 'en';
const TABLES: Record<Lang, Record<Key, string>> = { tr, en };
let current: Lang = 'en';

export function detectLang(): Lang {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  return langs[0].toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export function setLang(l: Lang): void {
  current = l;
  document.documentElement.lang = l;
}

export const getLang = (): Lang => current;

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = TABLES[current][key];
  if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, String(vars[k]));
  return s;
}
