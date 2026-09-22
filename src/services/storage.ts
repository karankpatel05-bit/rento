import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tenant, PaymentRecord, InterestCollectionRecord } from '../types';

const STORAGE_KEYS = {
  TENANTS: '@rento_tenants_v2',
  PAYMENTS: '@rento_payments_v2',
  INTEREST_COLLECTIONS: '@rento_interest_collections_v2',
  CLEAN_INITIALIZED: '@rento_clean_v2',
};

export const StorageService = {
  async init(): Promise<void> {
    const initialized = await AsyncStorage.getItem(STORAGE_KEYS.CLEAN_INITIALIZED);
    if (!initialized) {
      // Clear any legacy demo keys and start 100% clean
      await AsyncStorage.multiRemove([
        '@rento_tenants',
        '@rento_payments',
        '@rento_interest_collections',
        '@rento_initialized_v1',
      ]);
      await AsyncStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify([]));
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
      await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_COLLECTIONS, JSON.stringify([]));
      await AsyncStorage.setItem(STORAGE_KEYS.CLEAN_INITIALIZED, 'true');
    }
  },

  async getTenants(): Promise<Tenant[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TENANTS);
    return data ? JSON.parse(data) : [];
  },

  async saveTenant(tenant: Tenant): Promise<void> {
    const tenants = await this.getTenants();
    const existingIndex = tenants.findIndex((t) => t.id === tenant.id);
    if (existingIndex >= 0) {
      tenants[existingIndex] = tenant;
    } else {
      tenants.unshift(tenant);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
  },

  async deleteTenant(id: string): Promise<void> {
    const tenants = await this.getTenants();
    const filtered = tenants.filter((t) => t.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(filtered));

    // Also remove associated payments & interest records
    const payments = await this.getPayments();
    const remainingPayments = payments.filter((p) => p.tenantId !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(remainingPayments));

    const interests = await this.getInterestCollections();
    const remainingInterests = interests.filter((i) => i.tenantId !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_COLLECTIONS, JSON.stringify(remainingInterests));
  },

  async getPayments(): Promise<PaymentRecord[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return data ? JSON.parse(data) : [];
  },

  async savePayment(payment: PaymentRecord): Promise<void> {
    const payments = await this.getPayments();
    payments.unshift(payment);
    await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  },

  async saveMultiplePayments(newPayments: PaymentRecord[]): Promise<void> {
    const payments = await this.getPayments();
    // Add all new historical records
    const updated = [...newPayments, ...payments];
    await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updated));
  },

  async getInterestCollections(): Promise<InterestCollectionRecord[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.INTEREST_COLLECTIONS);
    return data ? JSON.parse(data) : [];
  },

  async saveInterestCollection(record: InterestCollectionRecord): Promise<void> {
    const list = await this.getInterestCollections();
    list.unshift(record);
    await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_COLLECTIONS, JSON.stringify(list));
  },

  async clearAllData(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_COLLECTIONS, JSON.stringify([]));
  }
};
