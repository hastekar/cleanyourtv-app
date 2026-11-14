/**
 * Real-money coin packs through the platform store (Google Play Billing / StoreKit), using
 * the cordova-plugin-purchase global that Capacitor loads in the native apps.
 *
 * NOT YET TESTED AGAINST A STORE. It compiles and is wired to the shop, but it must be run
 * with sandbox/test accounts on both platforms before release. In a browser there is no
 * store: packs are listed without a price and cannot be bought, and no coins are ever granted.
 */
import { COIN_PACKS } from './economy';

interface CdvOffer {
  pricingPhases: { price: string }[];
  order(): Promise<{ isError?: boolean; code?: number; message?: string } | undefined>;
}
interface CdvProduct {
  id: string;
  getOffer(): CdvOffer | undefined;
}
interface CdvTransaction {
  transactionId: string;
  products: { id: string }[];
  finish(): Promise<void>;
}
interface CdvStore {
  register(products: { id: string; type: string; platform: string }[]): void;
  when(): { approved(cb: (tx: CdvTransaction) => void): ReturnType<CdvStore['when']>; productUpdated(cb: () => void): ReturnType<CdvStore['when']> };
  initialize(platforms: string[]): Promise<unknown>;
  get(id: string): CdvProduct | undefined;
  defaultPlatform(): string;
}
interface Cdv {
  store: CdvStore;
  ProductType: { CONSUMABLE: string };
  ErrorCode: { PAYMENT_CANCELLED: number };
}

const cdv = (): Cdv | null => (window as unknown as { CdvPurchase?: Cdv }).CdvPurchase ?? null;

export type BuyResult = 'ordered' | 'cancelled' | 'unavailable' | 'error';

let ready = false;

export const billing = {
  /** True once the store answered and purchases can be made. */
  get available(): boolean {
    return ready;
  },

  /** Localised price string from the store, or null while unknown. */
  price(id: string): string | null {
    if (!ready) return null;
    return cdv()?.store.get(id)?.getOffer()?.pricingPhases[0]?.price ?? null;
  },

  /**
   * Connects to the store. `onPaid` is called for every approved transaction and must return
   * true once the coins are safely saved; only then is the transaction finished (consumed).
   */
  async init(onPaid: (transactionId: string, coins: number) => boolean, onChange: () => void): Promise<void> {
    const c = cdv();
    if (!c) return;
    try {
      const platform = c.store.defaultPlatform();
      c.store.register(COIN_PACKS.map((p) => ({ id: p.id, type: c.ProductType.CONSUMABLE, platform })));
      c.store
        .when()
        .approved((tx) => {
          let coins = 0;
          for (const p of tx.products) coins += COIN_PACKS.find((x) => x.id === p.id)?.coins ?? 0;
          if (coins > 0 && tx.transactionId) onPaid(tx.transactionId, coins);
          void tx.finish();
          onChange();
        })
        .productUpdated(onChange);
      await c.store.initialize([platform]);
      ready = true;
      onChange();
    } catch {
      ready = false;
    }
  },

  async buy(id: string): Promise<BuyResult> {
    const c = cdv();
    const offer = ready ? c?.store.get(id)?.getOffer() : undefined;
    if (!c || !offer) return 'unavailable';
    try {
      const res = await offer.order();
      if (res?.isError) return res.code === c.ErrorCode.PAYMENT_CANCELLED ? 'cancelled' : 'error';
      return 'ordered';
    } catch {
      return 'error';
    }
  },
};
