import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Tenant,
  PaymentRecord,
  InterestCollectionRecord,
  AppAlert,
  AdditionalDepositRecord,
} from '../types';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';

interface AppContextType {
  tenants: Tenant[];
  payments: PaymentRecord[];
  interestCollections: InterestCollectionRecord[];
  alerts: AppAlert[];
  isLoading: boolean;
  selectedTenantId: string | null;
  setSelectedTenantId: (id: string | null) => void;
  addTenant: (
    tenant: Omit<Tenant, 'id' | 'createdAt'>,
    historicalPayments?: Omit<PaymentRecord, 'id' | 'createdAt' | 'tenantId'>[]
  ) => Promise<void>;
  updateTenant: (tenant: Tenant) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  addAdditionalDeposit: (
    tenantId: string,
    deposit: Omit<AdditionalDepositRecord, 'id' | 'createdAt' | 'tenantId'>
  ) => Promise<void>;
  logPayment: (payment: Omit<PaymentRecord, 'id' | 'createdAt'>) => Promise<void>;
  batchLogPayments: (payments: Omit<PaymentRecord, 'id' | 'createdAt'>[]) => Promise<void>;
  recordInterestCollection: (record: Omit<InterestCollectionRecord, 'id'>) => Promise<void>;
  triggerTestMayNotification: (tenant: Tenant) => Promise<void>;
  clearAllData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [interestCollections, setInterestCollections] = useState<InterestCollectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      await StorageService.init();
      const loadedTenants = await StorageService.getTenants();
      const loadedPayments = await StorageService.getPayments();
      const loadedInterests = await StorageService.getInterestCollections();

      setTenants(loadedTenants);
      setPayments(loadedPayments);
      setInterestCollections(loadedInterests);
    } catch (err) {
      console.error('Error loading app data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    NotificationService.requestPermissionsAsync();
  }, []);

  const addTenant = async (
    tenantData: Omit<Tenant, 'id' | 'createdAt'>,
    historicalPayments?: Omit<PaymentRecord, 'id' | 'createdAt' | 'tenantId'>[]
  ) => {
    const tenantId = `t-${Date.now()}`;
    const newTenant: Tenant = {
      ...tenantData,
      id: tenantId,
      createdAt: new Date().toISOString(),
    };
    await StorageService.saveTenant(newTenant);
    await NotificationService.scheduleMayDepositReminder(newTenant);

    if (historicalPayments && historicalPayments.length > 0) {
      const recordsToSave: PaymentRecord[] = historicalPayments.map((p, idx) => ({
        ...p,
        id: `p-${Date.now()}-${idx}`,
        tenantId,
        createdAt: new Date().toISOString(),
      }));
      await StorageService.saveMultiplePayments(recordsToSave);
    }

    await loadAll();
  };

  const updateTenant = async (tenant: Tenant) => {
    await StorageService.saveTenant(tenant);
    await NotificationService.scheduleMayDepositReminder(tenant);
    await loadAll();
  };

  const deleteTenant = async (id: string) => {
    await StorageService.deleteTenant(id);
    if (selectedTenantId === id) {
      setSelectedTenantId(null);
    }
    await loadAll();
  };

  const addAdditionalDeposit = async (
    tenantId: string,
    depositData: Omit<AdditionalDepositRecord, 'id' | 'createdAt' | 'tenantId'>
  ) => {
    const deposit: AdditionalDepositRecord = {
      ...depositData,
      id: `dep-${Date.now()}`,
      tenantId,
      createdAt: new Date().toISOString(),
    };
    await StorageService.addAdditionalDeposit(tenantId, deposit);
    await loadAll();
  };

  const logPayment = async (paymentData: Omit<PaymentRecord, 'id' | 'createdAt'>) => {
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: `p-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await StorageService.savePayment(newPayment);
    await loadAll();
  };

  const batchLogPayments = async (paymentsData: Omit<PaymentRecord, 'id' | 'createdAt'>[]) => {
    if (paymentsData.length === 0) return;
    const recordsToSave: PaymentRecord[] = paymentsData.map((p, idx) => ({
      ...p,
      id: `p-${Date.now()}-${idx}`,
      createdAt: new Date().toISOString(),
    }));
    await StorageService.saveMultiplePayments(recordsToSave);
    await loadAll();
  };

  const recordInterestCollection = async (recordData: Omit<InterestCollectionRecord, 'id'>) => {
    const record: InterestCollectionRecord = {
      ...recordData,
      id: `ic-${Date.now()}`,
    };
    await StorageService.saveInterestCollection(record);
    await loadAll();
  };

  const triggerTestMayNotification = async (tenant: Tenant) => {
    await NotificationService.triggerTestReminder(tenant);
  };

  const clearAllData = async () => {
    await StorageService.clearAllData();
    await loadAll();
  };

  // Generate May alerts for all active tenants with electricity deposit
  const currentYear = new Date().getFullYear();
  const alerts: AppAlert[] = useMemo(() => {
    return tenants
      .filter((t) => t.active && t.electricityDeposit > 0)
      .map((t) => {
        const isCollected = interestCollections.some(
          (ic) => ic.tenantId === t.id && ic.year === currentYear
        );
        return {
          id: `alert-may-${t.id}-${currentYear}`,
          tenantId: t.id,
          tenantName: t.name,
          propertyAddress: `${t.unitDesignation}, ${t.propertyAddress}`,
          depositAmount: t.electricityDeposit,
          title: `Annual Electricity Rebate (${currentYear})`,
          message: `Collect electricity deposit interest rebate from ${t.name}. Owner deposit: ₹${t.electricityDeposit.toLocaleString()}`,
          dueMonth: 'May',
          year: currentYear,
          isResolved: isCollected,
        };
      });
  }, [tenants, interestCollections, currentYear]);

  return (
    <AppContext.Provider
      value={{
        tenants,
        payments,
        interestCollections,
        alerts,
        isLoading,
        selectedTenantId,
        setSelectedTenantId,
        addTenant,
        updateTenant,
        deleteTenant,
        addAdditionalDeposit,
        logPayment,
        batchLogPayments,
        recordInterestCollection,
        triggerTestMayNotification,
        clearAllData,
        refreshData: loadAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
