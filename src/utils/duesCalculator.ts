import { Tenant, PaymentRecord } from '../types';

export interface TenantRentSummary {
  totalExpectedRent: number;
  totalNetExpected: number;
  totalPaid: number;
  totalDeductions: number;
  rentDifference: number; // Positive = Pending Dues, Negative = Advance Credit, 0 = Settled
  status: 'due' | 'advance' | 'settled';
  dueAmount: number;
  advanceAmount: number;
  isFlexiblePayer: boolean;
}

export interface PropertyOverviewSummary {
  totalExpectedMonthly: number;
  totalCalculatedRent: number;
  totalCollected: number;
  totalOutstandingDues: number;
  totalAdvanceCredit: number;
  totalFlexibleTenants: number;
  totalFixedTenants: number;
}

/**
 * Calculates cumulative rent totals, total paid, and net rent difference for a tenant.
 */
export function calculateTenantRentSummary(
  tenant: Tenant,
  payments: PaymentRecord[]
): TenantRentSummary {
  const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);

  let totalExpectedRent = 0;
  let totalDeductions = 0;
  let totalNetExpected = 0;
  let totalPaid = 0;

  for (const p of tenantPayments) {
    const expected = Number(p.expectedRent) || 0;
    const deduction = p.isMaintenanceDeducted ? Number(p.maintenanceDeductionAmount) || 0 : 0;
    const netExpected = Number(p.netPayoutReceived) || Math.max(0, expected - deduction);
    const paid = Number(p.amountPaid) || 0;

    totalExpectedRent += expected;
    totalDeductions += deduction;
    totalNetExpected += netExpected;
    totalPaid += paid;
  }

  // If no payments logged yet, the base expected is 0 until months are logged or active
  const rentDifference = totalNetExpected - totalPaid;

  let status: 'due' | 'advance' | 'settled' = 'settled';
  if (rentDifference > 0) {
    status = 'due';
  } else if (rentDifference < 0) {
    status = 'advance';
  }

  const isFlexiblePayer = Boolean(
    tenant.isFlexiblePayer || tenant.paymentPlanType === 'flexible'
  );

  return {
    totalExpectedRent,
    totalNetExpected,
    totalPaid,
    totalDeductions,
    rentDifference,
    status,
    dueAmount: Math.max(0, rentDifference),
    advanceAmount: Math.max(0, -rentDifference),
    isFlexiblePayer,
  };
}

/**
 * Calculates overall landlord portfolio overview across all properties.
 */
export function calculatePropertyOverviewSummary(
  tenants: Tenant[],
  payments: PaymentRecord[]
): PropertyOverviewSummary {
  let totalExpectedMonthly = 0;
  let totalCalculatedRent = 0;
  let totalCollected = 0;
  let totalOutstandingDues = 0;
  let totalAdvanceCredit = 0;
  let totalFlexibleTenants = 0;
  let totalFixedTenants = 0;

  for (const tenant of tenants) {
    if (tenant.active) {
      totalExpectedMonthly += tenant.rentAmount || 0;
    }

    const summary = calculateTenantRentSummary(tenant, payments);
    totalCalculatedRent += summary.totalNetExpected;
    totalCollected += summary.totalPaid;

    if (summary.rentDifference > 0) {
      totalOutstandingDues += summary.rentDifference;
    } else if (summary.rentDifference < 0) {
      totalAdvanceCredit += Math.abs(summary.rentDifference);
    }

    if (summary.isFlexiblePayer) {
      totalFlexibleTenants += 1;
    } else {
      totalFixedTenants += 1;
    }
  }

  return {
    totalExpectedMonthly,
    totalCalculatedRent,
    totalCollected,
    totalOutstandingDues,
    totalAdvanceCredit,
    totalFlexibleTenants,
    totalFixedTenants,
  };
}

/**
 * Automatically calculates newer dues before and after a newly proposed payment.
 */
export function calculateNewerDues(
  currentOutstandingDue: number,
  newExpectedAmount: number,
  newAmountPaid: number
) {
  const priorDue = Number(currentOutstandingDue) || 0;
  const periodExpected = Number(newExpectedAmount) || 0;
  const totalDueBeforePayment = priorDue + periodExpected;
  const amountPaid = Number(newAmountPaid) || 0;
  const newerRemainingDue = totalDueBeforePayment - amountPaid;

  let status: 'due' | 'advance' | 'settled' = 'settled';
  if (newerRemainingDue > 0) {
    status = 'due';
  } else if (newerRemainingDue < 0) {
    status = 'advance';
  }

  return {
    priorDue,
    periodExpected,
    totalDueBeforePayment,
    amountPaid,
    newerRemainingDue,
    status,
    newerDueAmount: Math.max(0, newerRemainingDue),
    newerAdvanceAmount: Math.max(0, -newerRemainingDue),
  };
}
