import type { Lang } from './store';

const tr = {
  tagline: 'Sarayın en görkemli eşleştirme oyunu',
  loading: 'Saray hazırlanıyor…',
  play: 'Oyna',
  level: 'Seviye',
  levels: 'Seviyeler',
  moves: 'Hamle',
  score: 'Puan',
  shop: 'Hazine',
  settings: 'Ayarlar',
  sound: 'Ses',
  haptics: 'Titreşim',
  language: 'Dil',
  reset: 'İlerlemeyi sıfırla',
  resetConfirm: 'Tüm ilerlemen, altınların ve güçlendiricilerin silinecek. Satın aldığın altınlar da geri gelmez. Emin misin?',
  yes: 'Evet, sil',
  cancel: 'Vazgeç',
  close: 'Kapat',
  resume: 'Devam et',
  restart: 'Yeniden başla',
  home: 'Saraya dön',
  paused: 'Mola',
  next: 'Sonraki seviye',
  retry: 'Tekrar dene',
  won: 'Muhteşem!',
  lost: 'Bu sefer olmadı',
  outOfMoves: 'Hamlen bitti!',
  continueFor: '+5 hamle ile devam et',
  giveUp: 'Bırak',
  best: 'En iyi',
  newBest: 'Yeni rekor!',
  earned: 'Kazandığın altın',
  chest: 'Hazine odası ödülü dahil!',
  allDone: 'Bütün sarayı fethettin. Tebrikler!',
  goalScore: '{n} puan topla',
  goalColor: 'Taş topla',
  goalFrost: 'Halıları topla',
  goalCrate: 'Sandıkları aç',
  howTo: 'Yan yana iki taşı kaydır, aynısından 3 veya daha fazlasını yan yana getir. 4’lü Ok, L veya T Barut, 5’li Padişah Mücevheri verir.',
  pick: 'Güçlendirici seç (isteğe bağlı)',
  vizierGoal: 'Padişahım, bugünkü hedefimiz:',
  vizierShop: 'Hazine emrinizde, Padişahım.',
  jesterLose: ['Üzülme Padişahım, taşlar bugün huysuzdu!', 'Bir daha deneyelim, bu sefer ben de üflerim!', 'Az kaldıydı! Bir tur daha?'],
  jesterOut: 'Tam da bitiyordu! Beş hamle daha yeter mi dersin?',
  sultanWin: ['Aferin! Saray seninle gurur duyuyor.', 'İşte buna muhteşem denir!', 'Hazinem senin sayende büyüyor.'],
  coins: 'Altın',
  boosters: 'Güçlendiriciler',
  beforeLevel: 'Seviye öncesi',
  inLevel: 'Seviye içinde',
  buy: 'Satın al',
  notEnough: 'Yeterli altının yok',
  bought: 'Satın alındı!',
  storeOff: 'Altın satın alma yalnızca mağazadan indirilen uygulamada açılır.',
  storeWait: 'Mağazaya bağlanılıyor…',
  buyError: 'Satın alma tamamlanamadı. Senden ücret alınmadı.',
  thanks: 'Altınlar hazinene eklendi. Teşekkürler!',
  fair: 'Adil oyun sözü',
  fairText: 'Her seviye, tek altın harcamadan ve güçlendirici kullanmadan kazanılabildiği bilgisayarla kanıtlanmadan yayınlanmaz. Taşların düşme sırası seviyeye sabittir; ne kadar harcadığına, ne kadar oynadığına ya da kazandığına göre değişmez. Altın yalnızca kolaylık satın alır: ek hamle ve güçlendirici. Can sistemi, süre baskısı ve reklam yoktur.',
  hammerAim: 'Kırmak istediğin taşa dokun',
  crossAim: 'Satırını ve sütununu temizlemek istediğin kareye dokun',
  noMoves: 'Hamle kalmadı — Soytarı tahtayı karıştırdı!',
  b_rocket: 'Ok',
  b_bomb: 'Barut',
  b_rainbow: 'Padişah Mücevheri',
  b_hammer: 'Tokmak',
  b_shuffle: 'Karıştır',
  b_cross: 'Çifte Ok',
  d_rocket: 'Tahtaya bir Ok taşıyla başla',
  d_bomb: 'Tahtaya bir Barut taşıyla başla',
  d_rainbow: 'Tahtaya bir Padişah Mücevheriyle başla',
  d_hammer: 'Hamle harcamadan tek taşı kırar',
  d_shuffle: 'Hamle harcamadan tahtayı karıştırır',
  d_cross: 'Hamle harcamadan bir satırı ve sütunu temizler',
  stars: 'yıldız',
  locked: 'Kilitli',
  storageWarn: 'Bu cihaz kayıt yapmaya izin vermiyor; oyunu kapatınca ilerleme kaybolur.',
  restore: 'Satın alımlar bu cihazda saklanır.',
};

export type Key = keyof typeof tr;
type Table = { [K in Key]: (typeof tr)[K] extends string[] ? string[] : string };

const en: Table = {
  tagline: 'The grandest match in the palace',
  loading: 'Preparing the palace…',
  play: 'Play',
  level: 'Level',
  levels: 'Levels',
  moves: 'Moves',
  score: 'Score',
  shop: 'Treasury',
  settings: 'Settings',
  sound: 'Sound',
  haptics: 'Vibration',
  language: 'Language',
  reset: 'Reset progress',
  resetConfirm: 'All your progress, coins and boosters will be deleted. Coins you bought will not come back. Are you sure?',
  yes: 'Yes, delete',
  cancel: 'Cancel',
  close: 'Close',
  resume: 'Resume',
  restart: 'Restart',
  home: 'Back to the palace',
  paused: 'Paused',
  next: 'Next level',
  retry: 'Try again',
  won: 'Magnificent!',
  lost: 'Not this time',
  outOfMoves: 'Out of moves!',
  continueFor: 'Continue with +5 moves',
  giveUp: 'Give up',
  best: 'Best',
  newBest: 'New best!',
  earned: 'Coins earned',
  chest: 'Includes the treasure room reward!',
  allDone: 'You conquered the whole palace. Congratulations!',
  goalScore: 'Reach {n} points',
  goalColor: 'Collect pieces',
  goalFrost: 'Collect the carpets',
  goalCrate: 'Open the chests',
  howTo: 'Swipe two neighbouring pieces to line up 3 or more of a kind. 4 in a row makes an Arrow, an L or T makes Gunpowder, 5 in a row makes the Sultan’s Jewel.',
  pick: 'Pick boosters (optional)',
  vizierGoal: 'My Sultan, today’s goal:',
  vizierShop: 'The treasury is at your command, my Sultan.',
  jesterLose: ['Cheer up, my Sultan — the pieces were grumpy today!', 'Once more! This time I will blow on them for luck.', 'So close! One more round?'],
  jesterOut: 'It was nearly done! Would five more moves do it?',
  sultanWin: ['Well done! The palace is proud of you.', 'Now that is what I call magnificent!', 'My treasury grows thanks to you.'],
  coins: 'Coins',
  boosters: 'Boosters',
  beforeLevel: 'Before a level',
  inLevel: 'During a level',
  buy: 'Buy',
  notEnough: 'Not enough coins',
  bought: 'Purchased!',
  storeOff: 'Buying coins only works in the app installed from the store.',
  storeWait: 'Connecting to the store…',
  buyError: 'The purchase could not be completed. You were not charged.',
  thanks: 'The coins are in your treasury. Thank you!',
  fair: 'Fair play promise',
  fairText: 'No level ships until a computer has proven it can be won without spending a single coin or using any booster. The order pieces fall in is fixed per level; it does not change with how much you spend, how long you play or how often you win. Coins only buy convenience: extra moves and boosters. There are no lives, no timers and no ads.',
  hammerAim: 'Tap the piece you want to break',
  crossAim: 'Tap the square whose row and column you want to clear',
  noMoves: 'No moves left — the Jester shuffled the board!',
  b_rocket: 'Arrow',
  b_bomb: 'Gunpowder',
  b_rainbow: 'Sultan’s Jewel',
  b_hammer: 'Mallet',
  b_shuffle: 'Shuffle',
  b_cross: 'Twin Arrows',
  d_rocket: 'Start with an Arrow piece on the board',
  d_bomb: 'Start with a Gunpowder piece on the board',
  d_rainbow: 'Start with a Sultan’s Jewel on the board',
  d_hammer: 'Breaks one piece without spending a move',
  d_shuffle: 'Shuffles the board without spending a move',
  d_cross: 'Clears a row and a column without spending a move',
  stars: 'stars',
  locked: 'Locked',
  storageWarn: 'This device does not allow saving; progress is lost when you close the game.',
  restore: 'Purchases are stored on this device.',
};

const TABLES: Record<Lang, Table> = { tr, en };
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

type TextKey = { [K in Key]: (typeof tr)[K] extends string ? K : never }[Key];
type ListKey = Exclude<Key, TextKey>;

export function t(key: TextKey, vars?: Record<string, string | number>): string {
  let s = TABLES[current][key] as string;
  if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, String(vars[k]));
  return s;
}

/** One line from a list of alternatives, chosen by `n`. */
export const line = (key: ListKey, n: number): string => {
  const list = TABLES[current][key] as string[];
  return list[Math.abs(n) % list.length];
};

export const num = (n: number): string => n.toLocaleString(current === 'tr' ? 'tr-TR' : 'en-US');
