export type MaintenanceWorkflow = 'standard' | 'variable_rent_deduction';

export type PaymentMode = 'UPI' | 'NEFT' | 'Cash';

export interface RentIncrementCondition {
  type: 'percentage' | 'fixed';
  value: number; // e.g., 5 for 5%, or 1000 for ₹1000
  effectiveDate?: string;
  notes?: string;
}

export interface AdditionalDepositRecord {
  id: string;
  tenantId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  remarks: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  propertyAddress: string;
  unitDesignation: string;
  rentAmount: number;
  securityDeposit: number; // Initial / Existing deposit taken from tenant
  additionalDeposits?: AdditionalDepositRecord[]; // Any additional deposits taken later
  rentIncrement: RentIncrementCondition;
  electricityLoad: string; // e.g., "5 kW" or "3-phase 7 kW"
  electricityDeposit: number; // Deposit given by owner to electricity board
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
  paymentDate: string; // YYYY-MM-DD
  expectedRent: number;
  isMaintenanceDeducted: boolean;
  maintenanceDeductionAmount: number;
  netPayoutReceived: number; // expectedRent - maintenanceDeductionAmount
  amountPaid: number;
  paymentMode: PaymentMode; // Strictly 'UPI' | 'NEFT' | 'Cash'
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

export interface ExtractedLedgerRow {
  id: string;
  date: string; // formatted YYYY-MM-DD
  monthYear: string; // e.g. "May 2025"
  amount: number;
  paymentMode: PaymentMode;
  remarks: string;
  rawText: string;
  confidence: number;
}
