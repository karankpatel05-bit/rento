import { Tenant, PaymentRecord } from '../types';

export interface UnbilledMonthInfo {
  monthYear: string;
  expectedRent: number;
}

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
  unbilledAutoMonths: UnbilledMonthInfo[];
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

export const AUTO_BILLING_START_YEAR = 2026;
export const AUTO_BILLING_START_MONTH = 9; // October (0-indexed in JS Date)

/**
 * Returns an array of Month-Year strings (e.g. ['October 2026', 'November 2026'])
 * between October 2026 and referenceDate.
 * Months up to September 2026 are manually recorded and never auto-accrued.
 */
export function getAutomatedBillingMonths(
  leaseStartDateStr?: string,
  referenceDate?: Date
): string[] {
  const now = referenceDate || new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // If current date is prior to October 2026, no automated months accrue
  if (
    currentYear < AUTO_BILLING_START_YEAR ||
    (currentYear === AUTO_BILLING_START_YEAR && currentMonth < AUTO_BILLING_START_MONTH)
  ) {
    return [];
  }

  let startYear = AUTO_BILLING_START_YEAR;
  let startMonth = AUTO_BILLING_START_MONTH;

  // Don't accrue before tenant's lease start date if later than October 2026
  if (leaseStartDateStr) {
    const parsed = new Date(leaseStartDateStr);
    if (!isNaN(parsed.getTime())) {
      const leaseYear = parsed.getFullYear();
      const leaseMonth = parsed.getMonth();
      if (
        leaseYear > startYear ||
        (leaseYear === startYear && leaseMonth > startMonth)
      ) {
        startYear = leaseYear;
        startMonth = leaseMonth;
      }
    }
  }

  const months: string[] = [];
  let curY = startYear;
  let curM = startMonth;

  while (
    curY < currentYear ||
    (curY === currentYear && curM <= currentMonth)
  ) {
    const d = new Date(curY, curM, 1);
    const mStr = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    months.push(mStr);

    curM++;
    if (curM > 11) {
      curM = 0;
      curY++;
    }
  }

  return months;
}

/**
 * Calculates cumulative rent totals, total paid, and net rent difference for a tenant.
 * Starting October 2026, automatically accrues unbilled monthly rent cycles for active tenants.
 */
export function calculateTenantRentSummary(
  tenant: Tenant,
  payments: PaymentRecord[],
  referenceDate?: Date,
  excludeMonthYear?: string
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

  // Automatic dues accrual from October 2026 onwards for active tenants
  const unbilledAutoMonths: UnbilledMonthInfo[] = [];
  if (tenant.active) {
    const autoMonths = getAutomatedBillingMonths(tenant.leaseStartDate, referenceDate);
    const normalizedExclude = excludeMonthYear ? excludeMonthYear.trim().toLowerCase() : null;

    for (const mStr of autoMonths) {
      if (normalizedExclude && mStr.trim().toLowerCase() === normalizedExclude) {
        continue;
      }

      const isAlreadyRecorded = tenantPayments.some(
        (p) => p.monthYear.trim().toLowerCase() === mStr.trim().toLowerCase()
      );

      if (!isAlreadyRecorded) {
        const monthlyRent = Number(tenant.rentAmount) || 0;
        totalExpectedRent += monthlyRent;
        totalNetExpected += monthlyRent;
        unbilledAutoMonths.push({
          monthYear: mStr,
          expectedRent: monthlyRent,
        });
      }
    }
  }

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
    unbilledAutoMonths,
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
