import React, { useState } from 'react';
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
  Alert,
} from 'react-native';
import { X, Calendar, Calculator, Wrench, History, Check, Sparkles, Scale } from 'lucide-react-native';
import { Tenant, PaymentMode } from '../../types';
import { useApp } from '../../context/AppContext';
import { calculateTenantRentSummary, calculateNewerDues } from '../../utils/duesCalculator';

interface LogPastRentModalProps {
  visible: boolean;
  onClose: () => void;
  tenant: Tenant;
}

export const LogPastRentModal: React.FC<LogPastRentModalProps> = ({
  visible,
  onClose,
  tenant,
}) => {
  const { logPayment, payments } = useApp();

  const isTenantFlexible = Boolean(tenant.isFlexiblePayer || tenant.paymentPlanType === 'flexible');
  const [isFlexibleMode, setIsFlexibleMode] = useState<boolean>(isTenantFlexible);

  // Initialize fields for past rent logging
  const [monthYear, setMonthYear] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [pastExpectedRent, setPastExpectedRent] = useState<string>(tenant.rentAmount.toString());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('NEFT');
  const [isMaintenanceDeducted, setIsMaintenanceDeducted] = useState<boolean>(false);
  const [deductionAmount, setDeductionAmount] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const numExpected = parseFloat(pastExpectedRent) || 0;
  const numDeduction = parseFloat(deductionAmount) || 0;
  const netExpectedPayout = Math.max(0, numExpected - (isMaintenanceDeducted ? numDeduction : 0));

  // Cumulative snapshot prior to this past payment
  const currentSummary = calculateTenantRentSummary(tenant, payments);

  // Live calculation of newer dues after this payment
  const numPaid = parseFloat(amountPaid) || 0;
  const newerDues = calculateNewerDues(
    currentSummary.rentDifference,
    netExpectedPayout,
    numPaid
  );

  const handleReset = () => {
    setMonthYear('');
    setPaymentDate('');
    setPastExpectedRent(tenant.rentAmount.toString());
    setPaymentMode('NEFT');
    setIsMaintenanceDeducted(false);
    setDeductionAmount('');
    setAmountPaid('');
    setRemarks('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!monthYear.trim()) {
      Alert.alert('Missing Month/Year', 'Please enter the past billing period (e.g. September 2025).');
      return;
    }

    const paid = parseFloat(amountPaid) || 0;
    if (paid <= 0) {
      Alert.alert('Missing Amount', 'Please enter the amount paid for this past month.');
      return;
    }

    if (!paymentDate.trim()) {
      Alert.alert('Missing Date', 'Please enter the payment date (e.g. 2025-09-19 or 19/09/2025).');
      return;
    }

    // Normalize date format if user typed DD/MM/YYYY
    let formattedDate = paymentDate.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(formattedDate)) {
      const [d, m, y] = formattedDate.split('/');
      formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    setIsSubmitting(true);
    try {
      await logPayment({
        tenantId: tenant.id,
        monthYear: monthYear.trim(),
        paymentDate: formattedDate,
        expectedRent: numExpected > 0 ? numExpected : paid,
        isMaintenanceDeducted,
        maintenanceDeductionAmount: isMaintenanceDeducted ? numDeduction : 0,
        netPayoutReceived: netExpectedPayout > 0 ? netExpectedPayout : paid,
        amountPaid: paid,
        paymentMode,
        remarks: remarks.trim() || (
          isFlexibleMode
            ? `Flexible past log of ₹${paid.toLocaleString()} (${newerDues.newerRemainingDue > 0 ? `₹${newerDues.newerRemainingDue.toLocaleString()} due` : 'cleared'})`
            : 'Historical past month log'
        ),
        status: paid >= netExpectedPayout ? 'paid' : (paid > 0 ? 'partial' : 'pending'),
      });
      handleClose();
    } catch (err) {
      console.error('Error logging past rent:', err);
      Alert.alert('Error', 'Failed to save past rent payment.');
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
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <History size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.title}>Log Past Months Rent</Text>
                <Text style={styles.subtitle}>
                  {tenant.name} • {tenant.unitDesignation}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Info notice */}
            <View style={styles.noticeCard}>
              <Text style={styles.noticeText}>
                Use this to manually digitalize rent records from past months, physical notebook entries, or earlier bank statements.
              </Text>
            </View>

            {/* Flexible Mode Switcher */}
            <View style={styles.flexibleToggleRow}>
              <TouchableOpacity
                style={[
                  styles.flexibleModeChip,
                  isFlexibleMode ? styles.flexibleModeChipActive : styles.flexibleModeChipInactive,
                ]}
                onPress={() => setIsFlexibleMode(!isFlexibleMode)}
                activeOpacity={0.8}
              >
                <Sparkles size={14} color={isFlexibleMode ? '#FFFFFF' : '#7C3AED'} />
                <Text
                  style={[
                    styles.flexibleModeText,
                    isFlexibleMode ? styles.flexibleModeTextActive : styles.flexibleModeTextInactive,
                  ]}
                >
                  {isFlexibleMode ? 'Flexible Past Payment (Random Figure)' : 'Standard Past Month'}
                </Text>
              </TouchableOpacity>
            </View>

            {isFlexibleMode && (
              <View style={styles.flexibleNoticeBanner}>
                <Text style={styles.flexibleNoticeText}>
                  💡 <Text style={{ fontWeight: '700' }}>Flexible Old Payment:</Text> Log any random past figure given by the tenant. Cumulative dues will be recomputed automatically.
                </Text>
              </View>
            )}

            {/* Billing Period Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Past Billing Period (Month & Year) *</Text>
              <TextInput
                style={styles.textInput}
                value={monthYear}
                onChangeText={setMonthYear}
                placeholder="e.g. September 2025"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Historical Payment Date */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Payment Date (YYYY-MM-DD or DD/MM/YYYY) *</Text>
              <TextInput
                style={styles.textInput}
                value={paymentDate}
                onChangeText={setPaymentDate}
                placeholder="e.g. 2025-09-19 or 19/09/2025"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Amount Actually Paid */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Amount Paid (₹) *</Text>
              <View style={styles.currencyInputRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.currencyInput}
                  keyboardType="numeric"
                  placeholder="e.g. 40517"
                  placeholderTextColor="#94A3B8"
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                />
              </View>
            </View>

            {/* Past Expected Rent (Editable in case it was different before escalation) */}
            <View style={styles.formGroup}>
              <View style={styles.labelWithHint}>
                <Text style={styles.inputLabel}>Expected Gross Rent at that time (₹)</Text>
                <Text style={styles.hintBadge}>Default is current rent</Text>
              </View>
              <View style={styles.currencyInputRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.currencyInput}
                  keyboardType="numeric"
                  placeholder="e.g. 40517"
                  placeholderTextColor="#94A3B8"
                  value={pastExpectedRent}
                  onChangeText={setPastExpectedRent}
                />
              </View>
            </View>

            {/* Live Cumulative Dues Impact Box */}
            <View style={styles.duesPreviewCard}>
              <View style={styles.duesHeader}>
                <Scale size={16} color="#4338CA" />
                <Text style={styles.duesHeaderTitle}>Cumulative Dues & Rent Difference</Text>
              </View>

              <View style={styles.duesGrid}>
                <View style={styles.duesCol}>
                  <Text style={styles.duesLabel}>Current Balance</Text>
                  <Text
                    style={[
                      styles.duesValue,
                      currentSummary.rentDifference > 0
                        ? styles.textRed
                        : currentSummary.rentDifference < 0
                        ? styles.textEmerald
                        : styles.textSlate,
                    ]}
                  >
                    {currentSummary.rentDifference > 0
                      ? `+₹${currentSummary.rentDifference.toLocaleString()}`
                      : currentSummary.rentDifference < 0
                      ? `-₹${Math.abs(currentSummary.rentDifference).toLocaleString()}`
                      : '₹0'}
                  </Text>
                </View>

                <View style={styles.duesCol}>
                  <Text style={styles.duesLabel}>Expected</Text>
                  <Text style={styles.duesValue}>+₹{netExpectedPayout.toLocaleString()}</Text>
                </View>

                <View style={styles.duesCol}>
                  <Text style={styles.duesLabel}>Past Paid</Text>
                  <Text style={[styles.duesValue, { color: '#047857' }]}>
                    -₹{numPaid.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.duesResultRow}>
                <Text style={styles.duesResultLabel}>➔ Newer Balance After This Log:</Text>
                <View
                  style={[
                    styles.duesBadge,
                    newerDues.newerRemainingDue > 0 && styles.duesBadgeDue,
                    newerDues.newerRemainingDue < 0 && styles.duesBadgeAdvance,
                    newerDues.newerRemainingDue === 0 && styles.duesBadgeSettled,
                  ]}
                >
                  <Text
                    style={[
                      styles.duesBadgeText,
                      newerDues.newerRemainingDue > 0 && styles.duesBadgeTextDue,
                      newerDues.newerRemainingDue < 0 && styles.duesBadgeTextAdvance,
                      newerDues.newerRemainingDue === 0 && styles.duesBadgeTextSettled,
                    ]}
                  >
                    {newerDues.newerRemainingDue > 0
                      ? `Pending Due: ₹${newerDues.newerDueAmount.toLocaleString()}`
                      : newerDues.newerRemainingDue < 0
                      ? `Advance Credit: ₹${newerDues.newerAdvanceAmount.toLocaleString()}`
                      : 'All Cleared (₹0)'}
                  </Text>
                </View>
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

            {/* Maintenance Deduction Toggle */}
            <View style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <View style={styles.toggleHeaderRow}>
                    <Wrench size={18} color={isMaintenanceDeducted ? '#059669' : '#64748B'} />
                    <Text style={styles.toggleLabel}>Maintenance Deduction</Text>
                  </View>
                  <Text style={styles.toggleSubtext}>
                    Was maintenance deducted from this past month's rent?
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

              {isMaintenanceDeducted && (
                <View style={styles.deductionInputArea}>
                  <Text style={styles.inputLabel}>Maintenance Amount Deducted (₹)</Text>
                  <View style={styles.currencyInputRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      keyboardType="numeric"
                      placeholder="e.g. 2500"
                      placeholderTextColor="#94A3B8"
                      value={deductionAmount}
                      onChangeText={setDeductionAmount}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Remarks / Reference */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Remarks / Notebook Reference (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="e.g. Notebook page 4 / Bank ref #1234"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Saving...' : 'Save Past Month Rent'}
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  noticeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  labelWithHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  hintBadge: {
    fontSize: 11,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  modeButtonActive: {
    elevation: 1,
  },
  modeButtonUPI: {
    borderColor: '#4338CA',
    backgroundColor: '#EEF2FF',
  },
  modeButtonNEFT: {
    borderColor: '#1D4ED8',
    backgroundColor: '#EFF6FF',
  },
  modeButtonCash: {
    borderColor: '#047857',
    backgroundColor: '#ECFDF5',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modeButtonTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  toggleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleSubtext: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  deductionInputArea: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  flexibleToggleRow: {
    marginBottom: 12,
  },
  flexibleModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  flexibleModeChipActive: {
    backgroundColor: '#7C3AED',
  },
  flexibleModeChipInactive: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  flexibleModeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  flexibleModeTextActive: {
    color: '#FFFFFF',
  },
  flexibleModeTextInactive: {
    color: '#7C3AED',
  },
  flexibleNoticeBanner: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  flexibleNoticeText: {
    fontSize: 12,
    color: '#6B21A8',
    lineHeight: 18,
  },
  duesPreviewCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    padding: 14,
    marginBottom: 18,
  },
  duesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  duesHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
  },
  duesGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  duesCol: {
    flex: 1,
    alignItems: 'center',
  },
  duesLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  duesValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  duesResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
  },
  duesResultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#312E81',
  },
  duesBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  duesBadgeDue: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  duesBadgeAdvance: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  duesBadgeSettled: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  duesBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  duesBadgeTextDue: {
    color: '#DC2626',
  },
  duesBadgeTextAdvance: {
    color: '#059669',
  },
  duesBadgeTextSettled: {
    color: '#16A34A',
  },
  textRed: {
    color: '#DC2626',
  },
  textEmerald: {
    color: '#059669',
  },
  textSlate: {
    color: '#475569',
  },
});
