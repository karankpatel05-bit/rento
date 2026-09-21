export type MaintenanceWorkflow = 'standard' | 'variable_rent_deduction';

export interface RentIncrementCondition {
  type: 'percentage' | 'fixed';
  value: number; // e.g., 5 for 5%, or 1000 for ₹1000
  effectiveDate?: string;
  notes?: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  propertyAddress: string;
  unitDesignation: string;
  rentAmount: number;
  rentIncrement: RentIncrementCondition;
  electricityLoad: string; // e.g., "5 kW" or "3-phase 7 kW"
  electricityDeposit: number; // Deposit given by owner
  maintenanceWorkflow: MaintenanceWorkflow;
  leaseStartDate: string;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  monthYear: string; // e.g. "May 2026"
  paymentDate: string; // ISO string
  expectedRent: number;
  isMaintenanceDeducted: boolean;
  maintenanceDeductionAmount: number;
  netPayoutReceived: number; // expectedRent - maintenanceDeductionAmount
  amountPaid: number;
  remarks: string;
  status: 'paid' | 'partial' | 'pending';
  createdAt: string;
}

export interface InterestCollectionRecord {
  id: string;
  tenantId: string;
  year: number; // e.g., 2026
  amountCollected: number;
  collectedDate: string;
  remarks: string;
}

export interface AppAlert {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyAddress: string;
  depositAmount: number;
  title: string;
  message: string;
  dueMonth: string; // "May"
  year: number;
  isResolved: boolean;
  resolvedAt?: string;
}
