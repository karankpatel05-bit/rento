import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { Tenant, PaymentRecord, InterestCollectionRecord } from '../types';

export const PdfGenerator = {
  /**
   * Generates and downloads/shares a professional Rent Payment Ledger Statement PDF
   */
  async generateRentLedgerPDF(
    tenant: Tenant,
    payments: PaymentRecord[]
  ): Promise<string | null> {
    try {
      const initialDeposit = tenant.securityDeposit || 0;
      const additionalDeposits = tenant.additionalDeposits || [];
      const totalAdditional = additionalDeposits.reduce((sum, d) => sum + d.amount, 0);
      const totalSecurityDeposit = initialDeposit + totalAdditional;

      const isFlexiblePayer = Boolean(
        tenant.isFlexiblePayer || tenant.paymentPlanType === 'flexible'
      );
      const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
      const totalDeductions = payments.reduce(
        (sum, p) => sum + (p.isMaintenanceDeducted ? p.maintenanceDeductionAmount : 0),
        0
      );
      const totalNetCalculated = payments.reduce(
        (sum, p) =>
          sum + (p.isMaintenanceDeducted ? p.netPayoutReceived : p.expectedRent),
        0
      );
      const rentDifference = totalNetCalculated - totalCollected;

      const paymentsRowsHtml = payments
        .map(
          (p, idx) => {
            const netExpected = p.isMaintenanceDeducted
              ? p.netPayoutReceived
              : p.expectedRent;
            const diff = p.amountPaid - netExpected;
            const diffHtml =
              diff === 0
                ? `<span style="color: #047857; font-weight: bold;">₹0 (Settled)</span>`
                : diff > 0
                ? `<span style="color: #1D4ED8; font-weight: bold;">+₹${diff.toLocaleString()} (Adv)</span>`
                : `<span style="color: #DC2626; font-weight: bold;">-₹${Math.abs(diff).toLocaleString()} (Due)</span>`;

            return `
          <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
            <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: 600;">${p.monthYear}</td>
            <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; color: #475569;">${p.paymentDate}</td>
            <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background-color: ${
                p.paymentMode === 'UPI' ? '#EEF2FF' : p.paymentMode === 'NEFT' ? '#EFF6FF' : '#ECFDF5'
              }; color: ${
                p.paymentMode === 'UPI' ? '#4338CA' : p.paymentMode === 'NEFT' ? '#1D4ED8' : '#047857'
              };">${p.paymentMode || 'Cash'}</span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹${p.expectedRent.toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right; color: ${
              p.isMaintenanceDeducted ? '#DC2626' : '#94A3B8'
            };">
              ${p.isMaintenanceDeducted ? `-₹${p.maintenanceDeductionAmount.toLocaleString()}` : '—'}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: bold; color: #047857;">
              ₹${p.amountPaid.toLocaleString()}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 11px;">
              ${diffHtml}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-size: 11px; color: #475569;">
              ${p.remarks || '—'}
            </td>
          </tr>
        `;
          }
        )
        .join('');

      const additionalDepositsHtml =
        additionalDeposits.length > 0
          ? additionalDeposits
              .map(
                (ad) => `
            <tr>
              <td style="padding: 6px 10px; border-bottom: 1px solid #E2E8F0;">${ad.date}</td>
              <td style="padding: 6px 10px; border-bottom: 1px solid #E2E8F0; font-weight: bold;">₹${ad.amount.toLocaleString()}</td>
              <td style="padding: 6px 10px; border-bottom: 1px solid #E2E8F0;">${ad.paymentMode}</td>
              <td style="padding: 6px 10px; border-bottom: 1px solid #E2E8F0; color: #64748B;">${ad.remarks || '—'}</td>
            </tr>
          `
              )
              .join('')
          : '<tr><td colspan="4" style="padding: 8px 10px; color: #94A3B8; font-style: italic;">No additional deposits recorded.</td></tr>';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Rent Payment Statement - ${tenant.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 30px; color: #0F172A; }
            .header-table { width: 100%; margin-bottom: 24px; border-bottom: 2px solid #059669; padding-bottom: 16px; }
            .badge { background-color: #ECFDF5; color: #047857; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px; }
            .badge-purple { background-color: #EDE9FE; color: #6D28D9; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px; }
            .info-grid { display: flex; width: 100%; margin-bottom: 20px; }
            .info-col { flex: 1; background: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0; margin-right: 12px; }
            .info-col:last-child { margin-right: 0; }
            .info-label { font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: bold; margin-bottom: 4px; }
            .info-value { font-size: 16px; font-weight: bold; color: #0F172A; }
            .info-sub { font-size: 12px; color: #64748B; margin-top: 2px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
            table.data-table th { background-color: #0F172A; color: #FFFFFF; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
            .summary-box { background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 16px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
            .footer-note { margin-top: 30px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #F1F5F9; padding-top: 12px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 24px; color: #0F172A;">Rent Payment Statement</h1>
                <p style="margin: 4px 0 0 0; color: #64748B; font-size: 13px;">Official Tenant Ledger & Statement of Account</p>
              </td>
              <td style="text-align: right;">
                <span class="${isFlexiblePayer ? 'badge-purple' : 'badge'}">${
                  isFlexiblePayer ? 'FLEXIBLE PAYER' : 'FIXED PAYER'
                }</span>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748B;">Generated: ${new Date().toLocaleDateString('en-GB')}</p>
              </td>
            </tr>
          </table>

          <div class="info-grid">
            <div class="info-col">
              <div class="info-label">Tenant Details</div>
              <div class="info-value">${tenant.name}</div>
              <div class="info-sub">${tenant.unitDesignation}</div>
              <div class="info-sub">${tenant.propertyAddress}</div>
              <div class="info-sub">Phone: ${tenant.phone || '—'}</div>
            </div>

            <div class="info-col">
              <div class="info-label">Rent & Escalation</div>
              <div class="info-value">₹${tenant.rentAmount.toLocaleString()} / mo</div>
              <div class="info-sub">Plan: ${
                isFlexiblePayer
                  ? 'Flexible (Custom / Irregular Dues)'
                  : 'Fixed (Standard Recurring)'
              }</div>
              <div class="info-sub">Escalation: +${tenant.rentIncrement.value}${
                tenant.rentIncrement.type === 'percentage' ? '%' : '₹'
              } / yr</div>
              <div class="info-sub">Lease Start: ${tenant.leaseStartDate || '—'}</div>
              <div class="info-sub">Maint. Mode: ${
                tenant.maintenanceWorkflow === 'variable_rent_deduction'
                  ? 'Variable Rent Deduction'
                  : 'Standard Maint.'
              }</div>
            </div>

            <div class="info-col" style="background-color: #FFFBEB; border-color: #FDE68A;">
              <div class="info-label" style="color: #92400E;">Total Security Deposit</div>
              <div class="info-value" style="color: #B45309; font-size: 20px;">₹${totalSecurityDeposit.toLocaleString()}</div>
              <div class="info-sub" style="color: #B45309;">Initial: ₹${initialDeposit.toLocaleString()}</div>
              <div class="info-sub" style="color: #B45309;">Additional: ₹${totalAdditional.toLocaleString()} (${additionalDeposits.length} logs)</div>
            </div>
          </div>

          <!-- Additional Security Deposits Breakdown Table -->
          ${
            additionalDeposits.length > 0
              ? `
            <div style="margin-top: 14px; margin-bottom: 20px;">
              <h3 style="font-size: 14px; margin-bottom: 6px; color: #0F172A;">Security Deposit History</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px;">
                <thead>
                  <tr style="background: #F1F5F9; color: #475569; text-align: left;">
                    <th style="padding: 6px 10px; border-bottom: 1px solid #CBD5E1;">Date</th>
                    <th style="padding: 6px 10px; border-bottom: 1px solid #CBD5E1;">Amount</th>
                    <th style="padding: 6px 10px; border-bottom: 1px solid #CBD5E1;">Mode</th>
                    <th style="padding: 6px 10px; border-bottom: 1px solid #CBD5E1;">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${additionalDepositsHtml}
                </tbody>
              </table>
            </div>
          `
              : ''
          }

          <!-- Monthly Payment Ledger Table -->
          <h3 style="font-size: 15px; margin-top: 20px; margin-bottom: 8px; color: #0F172A;">
            Monthly Rent Payment History (${payments.length} Payments)
          </h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Billing Period</th>
                <th>Paid Date</th>
                <th>Mode</th>
                <th style="text-align: right;">Gross Rent</th>
                <th style="text-align: right;">Maint. Deducted</th>
                <th style="text-align: right;">Amount Paid</th>
                <th style="text-align: right;">Diff / Bal</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${
                payments.length > 0
                  ? paymentsRowsHtml
                  : '<tr><td colspan="8" style="padding: 20px; text-align: center; color: #94A3B8;">No payment records recorded yet.</td></tr>'
              }
            </tbody>
          </table>

          <!-- Summary Box -->
          <div class="summary-box">
            <div>
              <span style="font-size: 11px; color: #4338CA; font-weight: bold;">TOTAL CALCULATED RENT</span>
              <div style="font-size: 20px; font-weight: 800; color: #3730A3;">₹${totalNetCalculated.toLocaleString()}</div>
            </div>
            <div>
              <span style="font-size: 11px; color: #065F46; font-weight: bold;">TOTAL RENT COLLECTED</span>
              <div style="font-size: 20px; font-weight: 800; color: #047857;">₹${totalCollected.toLocaleString()}</div>
            </div>
            <div>
              <span style="font-size: 11px; color: ${
                rentDifference > 0 ? '#991B1B' : rentDifference < 0 ? '#1E40AF' : '#065F46'
              }; font-weight: bold;">RENT DIFFERENCE</span>
              <div style="font-size: 20px; font-weight: 800; color: ${
                rentDifference > 0 ? '#DC2626' : rentDifference < 0 ? '#2563EB' : '#059669'
              };">
                ${
                  rentDifference > 0
                    ? `Due: ₹${rentDifference.toLocaleString()}`
                    : rentDifference < 0
                    ? `Adv: ₹${Math.abs(rentDifference).toLocaleString()}`
                    : '₹0 (Settled)'
                }
              </div>
            </div>
            <div>
              <span style="font-size: 11px; color: #92400E; font-weight: bold;">SECURITY DEPOSIT</span>
              <div style="font-size: 20px; font-weight: 800; color: #B45309;">₹${totalSecurityDeposit.toLocaleString()}</div>
            </div>
          </div>

          <div class="footer-note">
            <p>This is a computer-generated statement from Rento Property Management. For queries, contact the property owner.</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Rent Statement - ${tenant.name}`,
      });
      return uri;
    } catch (err) {
      console.error('Error generating Rent Ledger PDF:', err);
      Alert.alert('PDF Error', 'Could not generate rent statement PDF.');
      return null;
    }
  },

  /**
   * Generates and downloads/shares an Electricity Board & Deposit Statement PDF
   */
  async generateElectricityStatementPDF(
    tenant: Tenant,
    interestRecords: InterestCollectionRecord[]
  ): Promise<string | null> {
    try {
      const totalRebatesCollected = interestRecords.reduce((sum, r) => sum + r.amountCollected, 0);

      const interestRowsHtml = interestRecords
        .map(
          (r, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FFFBEB'};">
            <td style="padding: 10px; border-bottom: 1px solid #FDE68A; font-weight: bold; color: #92400E;">${r.year}</td>
            <td style="padding: 10px; border-bottom: 1px solid #FDE68A; color: #475569;">${r.collectedDate}</td>
            <td style="padding: 10px; border-bottom: 1px solid #FDE68A; font-weight: bold; color: #047857; text-align: right;">
              ₹${r.amountCollected.toLocaleString()}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #FDE68A; color: #475569; font-size: 12px;">
              ${r.remarks || 'Annual rebate adjusted'}
            </td>
          </tr>
        `
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Electricity Board & Deposit Statement - ${tenant.unitDesignation}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 30px; color: #0F172A; }
            .header-table { width: 100%; margin-bottom: 24px; border-bottom: 2px solid #D97706; padding-bottom: 16px; }
            .badge { background-color: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px; }
            .info-grid { display: flex; width: 100%; margin-bottom: 24px; }
            .info-col { flex: 1; background: #F8FAFC; padding: 16px; border-radius: 8px; border: 1px solid #E2E8F0; margin-right: 12px; }
            .info-col:last-child { margin-right: 0; }
            .info-label { font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: bold; margin-bottom: 4px; }
            .info-value { font-size: 18px; font-weight: bold; color: #0F172A; }
            .info-sub { font-size: 12px; color: #64748B; margin-top: 3px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
            table.data-table th { background-color: #D97706; color: #FFFFFF; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
            .summary-box { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
            .footer-note { margin-top: 30px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #F1F5F9; padding-top: 12px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 24px; color: #0F172A;">Electricity Board & Deposit Statement</h1>
                <p style="margin: 4px 0 0 0; color: #64748B; font-size: 13px;">Security Deposit & Annual May Rebate Accounting</p>
              </td>
              <td style="text-align: right;">
                <span class="badge">ELECTRICITY RECORD</span>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748B;">Date: ${new Date().toLocaleDateString('en-GB')}</p>
              </td>
            </tr>
          </table>

          <div class="info-grid">
            <div class="info-col">
              <div class="info-label">Property & Meter Info</div>
              <div class="info-value">${tenant.unitDesignation}</div>
              <div class="info-sub">${tenant.propertyAddress}</div>
              <div class="info-sub" style="margin-top: 6px; font-weight: bold; color: #0F172A;">
                Load / Board: ${tenant.electricityLoad || 'Standard load'}
              </div>
              <div class="info-sub">Tenant in occupation: ${tenant.name}</div>
            </div>

            <div class="info-col" style="background-color: #FFFBEB; border-color: #FDE68A;">
              <div class="info-label" style="color: #92400E;">Owner Electricity Deposit Given</div>
              <div class="info-value" style="color: #B45309; font-size: 24px;">₹${tenant.electricityDeposit.toLocaleString()}</div>
              <div class="info-sub" style="color: #92400E; margin-top: 6px;">
                Deposited with electricity board. Generates annual interest/rebates in tenant summer billing.
              </div>
            </div>
          </div>

          <h3 style="font-size: 15px; margin-top: 10px; margin-bottom: 8px; color: #0F172A;">
            Annual May Interest / Rebate History (${interestRecords.length} Years)
          </h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Rebate Year</th>
                <th>Collection / Settlement Date</th>
                <th style="text-align: right;">Rebate Amount</th>
                <th>Remarks / Adjustment Details</th>
              </tr>
            </thead>
            <tbody>
              ${
                interestRecords.length > 0
                  ? interestRowsHtml
                  : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #94A3B8;">No rebate records collected yet.</td></tr>'
              }
            </tbody>
          </table>

          <div class="summary-box">
            <div>
              <span style="font-size: 12px; color: #92400E; font-weight: bold;">OWNER ELECTRICITY DEPOSIT</span>
              <div style="font-size: 20px; font-weight: 800; color: #B45309;">₹${tenant.electricityDeposit.toLocaleString()}</div>
            </div>
            <div>
              <span style="font-size: 12px; color: #065F46; font-weight: bold;">TOTAL REBATES RECONCILED</span>
              <div style="font-size: 20px; font-weight: 800; color: #047857;">₹${totalRebatesCollected.toLocaleString()}</div>
            </div>
          </div>

          <div class="footer-note">
            <p>Official statement generated via Rento Landlord App. Retain for tax & accounting records.</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Electricity Statement - ${tenant.unitDesignation}`,
      });
      return uri;
    } catch (err) {
      console.error('Error generating Electricity PDF:', err);
      Alert.alert('PDF Error', 'Could not generate electricity statement PDF.');
      return null;
    }
  },
};
