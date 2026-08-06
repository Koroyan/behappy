import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlanId = 'monthly' | 'quarterly' | 'yearly';

export interface Plan {
  id: PlanId;
  months: number;
  currency: string;
  regularPrice: number; // full price, for the whole period
  price: number; // launch (discounted) price actually charged, for the whole period
  regularPricePerMonth: number;
  pricePerMonth: number;
  discountPercent: number;
  badge?: 'popular' | 'best-value';
}

// Launch pricing: regular price is what it reverts to after the launch window;
// `price` is what's actually charged today. Tune all of this in one place.
export const LAUNCH_DISCOUNT_PERCENT = 35;

export const PLANS: Plan[] = [
  { id: 'monthly', months: 1, currency: 'GEL', regularPrice: 79, price: 51, regularPricePerMonth: 79, pricePerMonth: 51, discountPercent: 35 },
  { id: 'quarterly', months: 3, currency: 'GEL', regularPrice: 219, price: 142, regularPricePerMonth: 73, pricePerMonth: 47.33, discountPercent: 35, badge: 'popular' },
  { id: 'yearly', months: 12, currency: 'GEL', regularPrice: 799, price: 519, regularPricePerMonth: 66.58, pricePerMonth: 43.25, discountPercent: 35, badge: 'best-value' },
];

export const getPlanById = (id: string): Plan | undefined => PLANS.find((p) => p.id === id);

// Daily allowances for Premium subscribers (cost-control + pacing).
export const ART_THERAPY_DAILY_CAP = 1;
export const CARDS_DAILY_CAP = 1;
export const JOURNAL_DAILY_CAP = 1; // applies to everyone, premium or not
export const AI_CHAT_FREE_MESSAGES = 15; // lifetime, before Premium is required
export const AI_CHAT_DAILY_MESSAGE_CAP = 20; // premium proxy for ~$0.50/day of API cost

const DAY_MS = 24 * 60 * 60 * 1000;
const todayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const KEYS = {
  activePlanId: 'subscription:activePlanId',
  expiresAt: 'subscription:expiresAt',
  artTherapyFreeUsed: 'quota:artTherapyFreeUsed',
  aiChatFreeMessageCount: 'quota:aiChatFreeMessageCount',
  dailyDate: 'quota:dailyDate',
  dailyArtTherapy: 'quota:dailyArtTherapy',
  dailyCards: 'quota:dailyCards',
  dailyJournal: 'quota:dailyJournal',
  dailyAiChat: 'quota:dailyAiChat',
};

export type GateReason = 'need-premium' | 'daily-limit-reached';
export interface GateResult {
  allowed: boolean;
  reason?: GateReason;
}

interface DailyUsage {
  artTherapy: number;
  cards: number;
  journal: number;
  aiChat: number;
}

class SubscriptionService {
  // ---------- Premium status ----------

  async isPremiumActive(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(KEYS.expiresAt);
    if (!raw) return false;
    return Number(raw) > Date.now();
  }

  async getActivePlanId(): Promise<PlanId | null> {
    if (!(await this.isPremiumActive())) return null;
    return (await AsyncStorage.getItem(KEYS.activePlanId)) as PlanId | null;
  }

  async getExpiresAt(): Promise<number | null> {
    if (!(await this.isPremiumActive())) return null;
    const raw = await AsyncStorage.getItem(KEYS.expiresAt);
    return raw ? Number(raw) : null;
  }

  /** Activates a plan starting now (or extending from the current expiry if still active). */
  async activatePlan(planId: PlanId): Promise<void> {
    const plan = getPlanById(planId);
    if (!plan) throw new Error(`Unknown plan: ${planId}`);
    const currentExpiry = await this.getExpiresAt();
    const base = currentExpiry && currentExpiry > Date.now() ? currentExpiry : Date.now();
    const newExpiry = base + plan.months * 30 * DAY_MS;
    await AsyncStorage.multiSet([
      [KEYS.activePlanId, planId],
      [KEYS.expiresAt, String(newExpiry)],
    ]);
  }

  // ---------- Daily usage bookkeeping ----------

  private async getDailyUsage(): Promise<DailyUsage> {
    const storedDate = await AsyncStorage.getItem(KEYS.dailyDate);
    const today = todayKey();
    if (storedDate !== today) {
      await AsyncStorage.multiSet([
        [KEYS.dailyDate, today],
        [KEYS.dailyArtTherapy, '0'],
        [KEYS.dailyCards, '0'],
        [KEYS.dailyJournal, '0'],
        [KEYS.dailyAiChat, '0'],
      ]);
      return { artTherapy: 0, cards: 0, journal: 0, aiChat: 0 };
    }
    const [artTherapy, cards, journal, aiChat] = await Promise.all([
      AsyncStorage.getItem(KEYS.dailyArtTherapy),
      AsyncStorage.getItem(KEYS.dailyCards),
      AsyncStorage.getItem(KEYS.dailyJournal),
      AsyncStorage.getItem(KEYS.dailyAiChat),
    ]);
    return {
      artTherapy: Number(artTherapy || 0),
      cards: Number(cards || 0),
      journal: Number(journal || 0),
      aiChat: Number(aiChat || 0),
    };
  }

  // ---------- Art Therapy: 1 free session ever, then Premium (1/day) ----------

  async canStartArtTherapySession(): Promise<GateResult> {
    const freeUsed = (await AsyncStorage.getItem(KEYS.artTherapyFreeUsed)) === 'true';
    if (!freeUsed) return { allowed: true };
    if (!(await this.isPremiumActive())) return { allowed: false, reason: 'need-premium' };
    const usage = await this.getDailyUsage();
    if (usage.artTherapy >= ART_THERAPY_DAILY_CAP) return { allowed: false, reason: 'daily-limit-reached' };
    return { allowed: true };
  }

  async recordArtTherapySessionStart(): Promise<void> {
    const freeUsed = (await AsyncStorage.getItem(KEYS.artTherapyFreeUsed)) === 'true';
    if (!freeUsed) {
      await AsyncStorage.setItem(KEYS.artTherapyFreeUsed, 'true');
      return;
    }
    const usage = await this.getDailyUsage();
    await AsyncStorage.setItem(KEYS.dailyArtTherapy, String(usage.artTherapy + 1));
  }

  async hasUsedArtTherapyFreeSession(): Promise<boolean> {
    return (await AsyncStorage.getItem(KEYS.artTherapyFreeUsed)) === 'true';
  }

  // ---------- Cards Therapy: Premium only, from the first use (1/day) ----------

  async canStartCardsSession(): Promise<GateResult> {
    if (!(await this.isPremiumActive())) return { allowed: false, reason: 'need-premium' };
    const usage = await this.getDailyUsage();
    if (usage.cards >= CARDS_DAILY_CAP) return { allowed: false, reason: 'daily-limit-reached' };
    return { allowed: true };
  }

  async recordCardsSessionStart(): Promise<void> {
    const usage = await this.getDailyUsage();
    await AsyncStorage.setItem(KEYS.dailyCards, String(usage.cards + 1));
  }

  // ---------- Journal: free forever, 1 entry/day for everyone ----------

  async canWriteJournalToday(): Promise<boolean> {
    const usage = await this.getDailyUsage();
    return usage.journal < JOURNAL_DAILY_CAP;
  }

  async recordJournalEntry(): Promise<void> {
    const usage = await this.getDailyUsage();
    await AsyncStorage.setItem(KEYS.dailyJournal, String(usage.journal + 1));
  }

  // ---------- AI Chat: 15 free messages ever, then Premium (~20/day) ----------

  async getAiChatFreeMessagesUsed(): Promise<number> {
    return Number((await AsyncStorage.getItem(KEYS.aiChatFreeMessageCount)) || 0);
  }

  async getAiChatFreeRemaining(): Promise<number> {
    return Math.max(0, AI_CHAT_FREE_MESSAGES - (await this.getAiChatFreeMessagesUsed()));
  }

  async canSendAiChatMessage(): Promise<GateResult> {
    if (!(await this.isPremiumActive())) {
      const used = await this.getAiChatFreeMessagesUsed();
      if (used >= AI_CHAT_FREE_MESSAGES) return { allowed: false, reason: 'need-premium' };
      return { allowed: true };
    }
    const usage = await this.getDailyUsage();
    if (usage.aiChat >= AI_CHAT_DAILY_MESSAGE_CAP) return { allowed: false, reason: 'daily-limit-reached' };
    return { allowed: true };
  }

  async recordAiChatMessage(): Promise<void> {
    if (!(await this.isPremiumActive())) {
      const used = await this.getAiChatFreeMessagesUsed();
      await AsyncStorage.setItem(KEYS.aiChatFreeMessageCount, String(used + 1));
      return;
    }
    const usage = await this.getDailyUsage();
    await AsyncStorage.setItem(KEYS.dailyAiChat, String(usage.aiChat + 1));
  }

  // ---------- Testing / support ----------

  async reset(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  }
}

export default new SubscriptionService();
