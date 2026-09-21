import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tenant, PaymentRecord, InterestCollectionRecord } from '../types';

const STORAGE_KEYS = {
  TENANTS: '@rento_tenants',
  PAYMENTS: '@rento_payments',
  INTEREST_COLLECTIONS: '@rento_interest_collections',
  INITIALIZED: '@rento_initialized_v1',
};

const SEED_TENANTS: Tenant[] = [
  {
    id: 't-101',
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    propertyAddress: 'Emerald Heights, MG Road',
    unitDesignation: 'Apt 4B (3 BHK)',
    rentAmount: 35000,
    rentIncrement: {
      type: 'percentage',
      value: 7,
      notes: '7% increase every year on 1st November',
    },
    electricityLoad: '5 kW Three-Phase (Meter #BES-8849)',
    electricityDeposit: 30000,
    maintenanceWorkflow: 'variable_rent_deduction',
    leaseStartDate: '2025-11-01',
    active: true,
    notes: 'Maintenance is deducted twice a year directly from rent payout.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't-102',
    name: 'Priya Verma',
    phone: '+91 98111 22334',
    propertyAddress: 'Silver Oak Enclave, Sector 45',
    unitDesignation: 'Flat 202',
    rentAmount: 26000,
    rentIncrement: {
      type: 'fixed',
      value: 2000,
      notes: 'Fixed ₹2,000 increase annually on 1st April',
    },
    electricityLoad: '4 kW Single-Phase (Meter #BES-1922)',
    electricityDeposit: 20000,
    maintenanceWorkflow: 'standard',
    leaseStartDate: '2025-04-01',
    active: true,
    notes: 'Pays society maintenance directly to RWA.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't-103',
    name: 'Vikram Mehta',
    phone: '+91 97234 56789',
    propertyAddress: 'Skyline Palms, Outer Ring Rd',
    unitDesignation: 'Suite 9A',
    rentAmount: 42000,
    rentIncrement: {
      type: 'percentage',
      value: 5,
      notes: '5% annual escalation',
    },
    electricityLoad: '6 kW Three-Phase (Meter #BES-4401)',
    electricityDeposit: 45000,
    maintenanceWorkflow: 'variable_rent_deduction',
    leaseStartDate: '2025-08-01',
    active: true,
    notes: 'Variable maintenance billed in April and October.',
    createdAt: new Date().toISOString(),
  },
];

const SEED_PAYMENTS: PaymentRecord[] = [
  {
    id: 'p-201',
    tenantId: 't-101',
    monthYear: 'August 2026',
    paymentDate: '2026-08-05',
    expectedRent: 35000,
    isMaintenanceDeducted: true,
    maintenanceDeductionAmount: 4500,
    netPayoutReceived: 30500,
    amountPaid: 30500,
    remarks: 'Deducted semi-annual society painting & plumbing charge (₹4,500). Net rent received via UPI.',
    status: 'paid',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-202',
    tenantId: 't-101',
    monthYear: 'July 2026',
    paymentDate: '2026-07-03',
    expectedRent: 35000,
    isMaintenanceDeducted: false,
    maintenanceDeductionAmount: 0,
    netPayoutReceived: 35000,
    amountPaid: 35000,
    remarks: 'Full rent received on time via NEFT.',
    status: 'paid',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-203',
    tenantId: 't-102',
    monthYear: 'August 2026',
    paymentDate: '2026-08-02',
    expectedRent: 26000,
    isMaintenanceDeducted: false,
    maintenanceDeductionAmount: 0,
    netPayoutReceived: 26000,
    amountPaid: 26000,
    remarks: 'Regular monthly payment. RWA maintenance paid separately by tenant.',
    status: 'paid',
    createdAt: new Date().toISOString(),
  },
];

export const StorageService = {
  async init(): Promise<void> {
    const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!initialized) {
      await AsyncStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(SEED_TENANTS));
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(SEED_PAYMENTS));
      await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_COLLECTIONS, JSON.stringify([]));
      await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
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

  async getInterestCollections(): Promise<InterestCollectionRecord[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.INTEREST_COLLECTIONS);
    return data ? JSON.parse(data) : [];
  },

  async saveInterestCollection(record: InterestCollectionRecord): Promise<void> {
    const list = await this.getInterestCollections();
    list.unshift(record);
    await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_COLLECTIONS, JSON.stringify(list));
  },

  async resetToSeedData(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(SEED_TENANTS));
    await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(SEED_PAYMENTS));
    await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_COLLECTIONS, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
};
