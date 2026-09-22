import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, CheckCircle, Calculator, Wrench, IndianRupee } from 'lucide-react-native';
import { Tenant, PaymentMode } from '../../types';
import { useApp } from '../../context/AppContext';

interface LogPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  tenant: Tenant;
}

export const LogPaymentModal: React.FC<LogPaymentModalProps> = ({
  visible,
  onClose,
  tenant,
}) => {
  const { logPayment } = useApp();

  const now = new Date();
  const currentMonthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const [monthYear, setMonthYear] = useState<string>(currentMonthYear);
  const [paymentDate, setPaymentDate] = useState<string>(
    now.toISOString().split('T')[0]
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [isMaintenanceDeducted, setIsMaintenanceDeducted] = useState<boolean>(
    tenant.maintenanceWorkflow === 'variable_rent_deduction'
  );
  const [deductionAmount, setDeductionAmount] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const rentAmount = tenant.rentAmount;
  const numDeduction = parseFloat(deductionAmount) || 0;
  const netExpectedPayout = Math.max(0, rentAmount - (isMaintenanceDeducted ? numDeduction : 0));

  // Pre-fill amount paid to net expected payout if user hasn't explicitly entered a custom partial amount
  useEffect(() => {
    if (visible) {
      const defaultNet = rentAmount - (isMaintenanceDeducted ? numDeduction : 0);
      setAmountPaid(defaultNet.toString());
    }
  }, [visible, isMaintenanceDeducted, deductionAmount, rentAmount]);

  const handleSubmit = async () => {
    const paid = parseFloat(amountPaid) || 0;
    if (paid <= 0 && netExpectedPayout > 0) {
      alert('Please enter a valid amount paid.');
      return;
    }

    setIsSubmitting(true);
    try {
      await logPayment({
        tenantId: tenant.id,
        monthYear,
        paymentDate,
        expectedRent: rentAmount,
        isMaintenanceDeducted,
        maintenanceDeductionAmount: isMaintenanceDeducted ? numDeduction : 0,
        netPayoutReceived: netExpectedPayout,
        amountPaid: paid,
        paymentMode,
        remarks: remarks.trim() || (isMaintenanceDeducted ? `Variable maintenance ₹${numDeduction} deducted` : 'Regular rent received'),
        status: paid >= netExpectedPayout ? 'paid' : 'partial',
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Log Monthly Payment</Text>
              <Text style={styles.subtitle}>
                {tenant.name} • {tenant.unitDesignation}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Month & Base Rent Display */}
            <View style={styles.rentInfoCard}>
              <View style={styles.rentInfoRow}>
                <Text style={styles.rentInfoLabel}>Base Monthly Rent</Text>
                <Text style={styles.rentInfoValue}>₹{rentAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.rentInfoDivider} />
              <View style={styles.rentInfoRow}>
                <Text style={styles.rentInfoSub}>Billing Period</Text>
                <TextInput
                  style={styles.periodInput}
                  value={monthYear}
                  onChangeText={setMonthYear}
                  placeholder="e.g. September 2026"
                />
              </View>
            </View>

            {/* Maintenance Workflow Notice */}
            {tenant.maintenanceWorkflow === 'variable_rent_deduction' && (
              <View style={styles.workflowHint}>
                <Wrench size={16} color="#D97706" />
                <Text style={styles.workflowHintText}>
                  This property is configured for <Text style={{ fontWeight: '700' }}>Variable Rent Deductions</Text> twice a year.
                </Text>
              </View>
            )}

            {/* MAINTENANCE DEDUCTION TOGGLE (Prominent UI Switch) */}
            <View style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <View style={styles.toggleHeaderRow}>
                    <Wrench size={18} color={isMaintenanceDeducted ? '#059669' : '#64748B'} />
                    <Text style={styles.toggleLabel}>Maintenance Deduction</Text>
                  </View>
                  <Text style={styles.toggleSubtext}>
                    Deduct variable maintenance directly from this month's rent payout
                  </Text>
                </View>
                <Switch
                  value={isMaintenanceDeducted}
                  onValueChange={(val) => {
                    setIsMaintenanceDeducted(val);
                    if (!val) setDeductionAmount('');
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={isMaintenanceDeducted ? '#059669' : '#FFFFFF'}
                />
              </View>

              {/* Conditional Deduction Input */}
              {isMaintenanceDeducted && (
                <View style={styles.deductionInputArea}>
                  <Text style={styles.inputLabel}>Maintenance Amount Deducted (₹)</Text>
                  <View style={styles.currencyInputRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      keyboardType="numeric"
                      placeholder="e.g. 4500"
                      value={deductionAmount}
                      onChangeText={setDeductionAmount}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Auto-calculated Net Payout Summary */}
            <View style={styles.calculationCard}>
              <View style={styles.calcHeader}>
                <Calculator size={16} color="#059669" />
                <Text style={styles.calcTitle}>Net Payout Auto-Calculation</Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcText}>Gross Rent</Text>
                <Text style={styles.calcText}>₹{rentAmount.toLocaleString()}</Text>
              </View>
              {isMaintenanceDeducted && (
                <View style={styles.calcRow}>
                  <Text style={[styles.calcText, { color: '#EF4444' }]}>
                    - Maintenance Deduction
                  </Text>
                  <Text style={[styles.calcText, { color: '#EF4444', fontWeight: '600' }]}>
                    - ₹{numDeduction.toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={styles.calcTotalRow}>
                <Text style={styles.calcTotalLabel}>Net Payout Receivable</Text>
                <Text style={styles.calcTotalValue}>
                  ₹{netExpectedPayout.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Amount Paid Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Amount Actually Paid (₹) *</Text>
              <View style={styles.currencyInputRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.currencyInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                />
              </View>
            </View>

            {/* Mode of Payment (Mandatory Selection: UPI, NEFT, or Cash) */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Mode of Payment *</Text>
              <View style={styles.modeSelector}>
                {(['UPI', 'NEFT', 'Cash'] as PaymentMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeButton,
                      paymentMode === mode && styles.modeButtonActive,
                      paymentMode === mode && mode === 'UPI' && styles.modeButtonUPI,
                      paymentMode === mode && mode === 'NEFT' && styles.modeButtonNEFT,
                      paymentMode === mode && mode === 'Cash' && styles.modeButtonCash,
                    ]}
                    onPress={() => setPaymentMode(mode)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        paymentMode === mode && styles.modeButtonTextActive,
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Payment Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={paymentDate}
                onChangeText={setPaymentDate}
                placeholder="2026-09-21"
              />
            </View>

            {/* Remarks Input (Multi-line text area) */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Remarks / Transaction Notes</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                placeholder="e.g. Paid via UPI ref #93821. Maintenance deduction approved for lift repair."
                value={remarks}
                onChangeText={setRemarks}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <CheckCircle size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  rentInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  rentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rentInfoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  rentInfoValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  rentInfoDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  rentInfoSub: {
    fontSize: 12,
    color: '#64748B',
  },
  periodInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'right',
    padding: 0,
  },
  workflowHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  workflowHintText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  toggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  toggleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  toggleSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  deductionInputArea: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  calculationCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  calcText: {
    fontSize: 13,
    color: '#334155',
  },
  calcTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  calcTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  calcTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  textInput: {
    height: 46,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 76,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  modeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonUPI: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  modeButtonNEFT: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  modeButtonCash: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeButtonTextActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
});
