import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  artTherapyUnlocked: 'purchase:artTherapyUnlocked',
};

export type PurchaseProduct = 'art-therapy';

export interface PurchaseParams {
  product: PurchaseProduct;
  amount: number; // in GEL
  currency?: string; // default GEL
}

class PurchaseService {
  async isUnlocked(product: PurchaseProduct): Promise<boolean> {
    if (product === 'art-therapy') {
      const val = await AsyncStorage.getItem(KEYS.artTherapyUnlocked);
      return val === 'true';
    }
    return false;
  }

  async markUnlocked(product: PurchaseProduct): Promise<void> {
    if (product === 'art-therapy') {
      await AsyncStorage.setItem(KEYS.artTherapyUnlocked, 'true');
    }
  }

  async reset(product: PurchaseProduct): Promise<void> {
    if (product === 'art-therapy') {
      await AsyncStorage.removeItem(KEYS.artTherapyUnlocked);
    }
  }
}

export default new PurchaseService();
