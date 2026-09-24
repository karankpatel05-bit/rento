import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tenant, PaymentRecord, InterestCollectionRecord, AdditionalDepositRecord } from '../types';

const STORAGE_KEYS = {
  TENANTS: '@rento_tenants_v2',
  PAYMENTS: '@rento_payments_v2',
  INTEREST_COLLECTIONS: '@rento_interest_collections_v2',
  CLEAN_INITIALIZED: '@rento_clean_v2',
  SECURITY_PIN: '@rento_security_pin',
  PIN_ENABLED: '@rento_pin_enabled',
  ADMIN_EMAIL: '@rento_admin_email',
  SMTP_CONFIG: '@rento_smtp_config',
};

export const DEFAULT_ADMIN_EMAIL = 'karankpatel05@gmail.com';

export const StorageService = {
  async init(): Promise<void> {
    // Migration & safety check: NEVER wipe existing user data!
    // If v2 keys already exist, they are preserved 100%.
    // If legacy keys exist from earlier versions, migrate them forward.
    const v2Tenants = await AsyncStorage.getItem(STORAGE_KEYS.TENANTS);
    if (!v2Tenants) {
      const legacyTenants = await AsyncStorage.getItem('@rento_tenants');
      if (legacyTenants) {
        await AsyncStorage.setItem(STORAGE_KEYS.TENANTS, legacyTenants);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify([]));
      }
    }

    const v2Payments = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!v2Payments) {
      const legacyPayments = await AsyncStorage.getItem('@rento_payments');
      if (legacyPayments) {
        await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, legacyPayments);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
      }
    }

    const v2Interests = await AsyncStorage.getItem(STORAGE_KEYS.INTEREST_COLLECTIONS);
    if (!v2Interests) {
      const legacyInterests = await AsyncStorage.getItem('@rento_interest_collections');
      if (legacyInterests) {
        await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_COLLECTIONS, legacyInterests);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_COLLECTIONS, JSON.stringify([]));
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.CLEAN_INITIALIZED, 'true');
  },

  async getTenants(): Promise<Tenant[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TENANTS);
    if (!data) return [];
    const list: Tenant[] = JSON.parse(data);
    return list.map((t) => ({
      ...t,
      isFlexiblePayer: t.isFlexiblePayer ?? (t.paymentPlanType === 'flexible'),
      paymentPlanType: t.paymentPlanType ?? (t.isFlexiblePayer ? 'flexible' : 'fixed'),
    }));
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

  async addAdditionalDeposit(tenantId: string, deposit: AdditionalDepositRecord): Promise<void> {
    const tenants = await this.getTenants();
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      if (!tenant.additionalDeposits) {
        tenant.additionalDeposits = [];
      }
      tenant.additionalDeposits.unshift(deposit);
      await AsyncStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    }
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
  },

  async getSecurityPin(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.SECURITY_PIN);
  },

  async saveSecurityPin(pin: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SECURITY_PIN, pin);
    await AsyncStorage.setItem(STORAGE_KEYS.PIN_ENABLED, 'true');
  },

  async isPinEnabled(): Promise<boolean> {
    const pin = await AsyncStorage.getItem(STORAGE_KEYS.SECURITY_PIN);
    if (!pin) return false;
    const enabled = await AsyncStorage.getItem(STORAGE_KEYS.PIN_ENABLED);
    return enabled !== 'false'; // defaults to true once PIN is set
  },

  async setPinEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PIN_ENABLED, enabled ? 'true' : 'false');
  },

  async removeSecurityPin(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.SECURITY_PIN);
    await AsyncStorage.setItem(STORAGE_KEYS.PIN_ENABLED, 'false');
  },

  async getAdminEmail(): Promise<string> {
    const email = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_EMAIL);
    return (email && email.trim()) ? email.trim().toLowerCase() : DEFAULT_ADMIN_EMAIL;
  },

  async saveAdminEmail(email: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_EMAIL, email.trim().toLowerCase());
  },

  async getSmtpConfig(): Promise<{ host?: string; port?: number; user?: string; pass?: string; service?: string } | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SMTP_CONFIG);
    return data ? JSON.parse(data) : null;
  },

  async saveSmtpConfig(config: { host?: string; port?: number; user?: string; pass?: string; service?: string }): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SMTP_CONFIG, JSON.stringify(config));
  },
};
