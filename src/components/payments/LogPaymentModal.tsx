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
  Alert,
} from 'react-native';
import {
  X,
  CheckCircle,
  Calculator,
  Wrench,
  Sparkles,
  Scale,
  Calendar,
  ArrowDown,
  Plus,
  ArrowRight,
  TrendingDown,
  IndianRupee,
} from 'lucide-react-native';
import { Tenant, PaymentMode } from '../../types';
import { useApp } from '../../context/AppContext';
import { calculateTenantRentSummary } from '../../utils/duesCalculator';

export type FlexibleEntryMode = 'combined' | 'declare_only' | 'pay_only';

interface LogPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  tenant: Tenant;
  initialMode?: FlexibleEntryMode;
}

export const LogPaymentModal: React.FC<LogPaymentModalProps> = ({
  visible,
  onClose,
  tenant,
  initialMode = 'combined',
}) => {
  const { logPayment, payments } = useApp();

  const now = new Date();
  const currentMonthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const todayStr = now.toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const isTenantFlexible = Boolean(tenant.isFlexiblePayer || tenant.paymentPlanType === 'flexible');
  const [isFlexibleMode, setIsFlexibleMode] = useState<boolean>(isTenantFlexible);
  const [entryMode, setEntryMode] = useState<FlexibleEntryMode>(initialMode);

  // Form states
  const [monthYear, setMonthYear] = useState<string>(currentMonthYear);
  const [declaredRent, setDeclaredRent] = useState<string>(tenant.rentAmount.toString());
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [isMaintenanceDeducted, setIsMaintenanceDeducted] = useState<boolean>(
    tenant.maintenanceWorkflow === 'variable_rent_deduction'
  );
  const [deductionAmount, setDeductionAmount] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Cumulative snapshot of previous payments prior to this entry
  const currentSummary = calculateTenantRentSummary(tenant, payments);
  const priorBalance = currentSummary.rentDifference; // > 0 = Due, < 0 = Advance, 0 = Settled

  // Step 1: Declared Rent Calculations
  const numDeclaredRent = entryMode === 'pay_only' ? 0 : parseFloat(declaredRent) || 0;
  const numDeduction = isMaintenanceDeducted ? parseFloat(deductionAmount) || 0 : 0;
  const netDeclaredRent = Math.max(0, numDeclaredRent - numDeduction);

  // Total Rent Pending BEFORE payment is applied
  const totalRentPending = priorBalance + netDeclaredRent;

  // Step 2: Payment Done
  const numPaid = entryMode === 'declare_only' ? 0 : parseFloat(amountPaid) || 0;

  // Step 3: Live Remaining Rent Difference AFTER payment is subtracted
  const remainingDifference = totalRentPending - numPaid;

  // Initialize or reset form values whenever modal opens or initialMode changes
  useEffect(() => {
    if (visible) {
      setIsFlexibleMode(isTenantFlexible);
      const chosenMode = isTenantFlexible ? (initialMode || 'combined') : 'combined';
      setEntryMode(chosenMode);

      setMonthYear(currentMonthYear);
      setPaymentDate(todayStr);
      setRemarks('');
      setIsMaintenanceDeducted(tenant.maintenanceWorkflow === 'variable_rent_deduction');
      setDeductionAmount('');

      if (chosenMode === 'pay_only') {
        setDeclaredRent('0');
        setAmountPaid('');
      } else if (chosenMode === 'declare_only') {
        setDeclaredRent(tenant.rentAmount.toString());
        setAmountPaid('0');
      } else {
        setDeclaredRent(tenant.rentAmount.toString());
        if (!isTenantFlexible) {
          const defaultNet = tenant.rentAmount - (tenant.maintenanceWorkflow === 'variable_rent_deduction' ? numDeduction : 0);
          setAmountPaid(defaultNet.toString());
        } else {
          setAmountPaid('');
        }
      }
    }
  }, [visible, isTenantFlexible, initialMode, tenant.rentAmount]);

  const handleModeChange = (newMode: FlexibleEntryMode) => {
    setEntryMode(newMode);
    if (newMode === 'pay_only') {
      setDeclaredRent('0');
      if (amountPaid === '0') setAmountPaid('');
    } else if (newMode === 'declare_only') {
      setDeclaredRent(tenant.rentAmount.toString());
      setAmountPaid('0');
    } else {
      setDeclaredRent(tenant.rentAmount.toString());
      if (amountPaid === '0') setAmountPaid('');
    }
  };

  const handleSubmit = async () => {
    if (numDeclaredRent <= 0 && numPaid <= 0) {
      Alert.alert(
        'Missing Details',
        'Please enter either a Declared Rent amount, a Payment Done amount, or both.'
      );
      return;
    }

    if (entryMode === 'declare_only' && numDeclaredRent <= 0) {
      Alert.alert('Missing Rent Amount', 'Please enter the declared rent amount to bill.');
      return;
    }

    if (entryMode === 'pay_only' && numPaid <= 0) {
      Alert.alert('Missing Payment', 'Please enter the payment amount received.');
      return;
    }

    if (numPaid > 0 && !paymentDate.trim()) {
      Alert.alert('Missing Date', 'Please specify the date this payment was made.');
      return;
    }

    setIsSubmitting(true);
    try {
      let defaultRemark = '';
      if (isFlexibleMode) {
        if (entryMode === 'declare_only') {
          defaultRemark = `Declared rent ₹${numDeclaredRent.toLocaleString()} (Total pending: ₹${totalRentPending.toLocaleString()})`;
        } else if (entryMode === 'pay_only') {
          defaultRemark = `Installment ₹${numPaid.toLocaleString()} paid on ${paymentDate} (${
            remainingDifference > 0 ? `₹${remainingDifference.toLocaleString()} due` : 'cleared'
          })`;
        } else {
          defaultRemark = `Declared ₹${numDeclaredRent.toLocaleString()}, paid ₹${numPaid.toLocaleString()} on ${paymentDate} (${
            remainingDifference > 0 ? `₹${remainingDifference.toLocaleString()} due` : 'cleared'
          })`;
        }
      } else if (isMaintenanceDeducted) {
        defaultRemark = `Variable maintenance ₹${numDeduction.toLocaleString()} deducted`;
      } else {
        defaultRemark = 'Regular monthly rent received';
      }

      await logPayment({
        tenantId: tenant.id,
        monthYear: monthYear.trim() || currentMonthYear,
        paymentDate: paymentDate.trim() || todayStr,
        expectedRent: numDeclaredRent,
        isMaintenanceDeducted,
        maintenanceDeductionAmount: isMaintenanceDeducted ? numDeduction : 0,
        netPayoutReceived: netDeclaredRent,
        amountPaid: numPaid,
        paymentMode,
        remarks: remarks.trim() || defaultRemark,
        status:
          numPaid >= netDeclaredRent && netDeclaredRent > 0
            ? 'paid'
            : numPaid > 0
            ? 'partial'
            : 'pending',
      });
      onClose();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save payment record.');
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
              <Text style={styles.title}>
                {isFlexibleMode ? 'Flexible Rent & Payment' : 'Log Monthly Payment'}
              </Text>
              <Text style={styles.subtitle}>
                {tenant.name} • {tenant.unitDesignation}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Flexible Payer Mode Selector */}
            {isFlexibleMode && (
              <View style={styles.entryModeTabs}>
                <TouchableOpacity
                  style={[
                    styles.entryModeTab,
                    entryMode === 'combined' && styles.entryModeTabActive,
                  ]}
                  onPress={() => handleModeChange('combined')}
                  activeOpacity={0.8}
                >
                  <Sparkles size={13} color={entryMode === 'combined' ? '#FFFFFF' : '#4F46E5'} />
                  <Text
                    style={[
                      styles.entryModeTabText,
                      entryMode === 'combined' && styles.entryModeTabTextActive,
                    ]}
                  >
                    Declare & Pay
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.entryModeTab,
                    entryMode === 'declare_only' && styles.entryModeTabActive,
                  ]}
                  onPress={() => handleModeChange('declare_only')}
                  activeOpacity={0.8}
                >
                  <Plus size={13} color={entryMode === 'declare_only' ? '#FFFFFF' : '#4F46E5'} />
                  <Text
                    style={[
                      styles.entryModeTabText,
                      entryMode === 'declare_only' && styles.entryModeTabTextActive,
                    ]}
                  >
                    Declare Rent Due
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.entryModeTab,
                    entryMode === 'pay_only' && styles.entryModeTabActive,
                  ]}
                  onPress={() => handleModeChange('pay_only')}
                  activeOpacity={0.8}
                >
                  <ArrowDown size={13} color={entryMode === 'pay_only' ? '#FFFFFF' : '#4F46E5'} />
                  <Text
                    style={[
                      styles.entryModeTabText,
                      entryMode === 'pay_only' && styles.entryModeTabTextActive,
                    ]}
                  >
                    Pay Existing Dues
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Period Selector Card */}
            <View style={styles.periodCard}>
              <View style={styles.periodRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.periodLabel}>Billing Period / Month</Text>
                  <TextInput
                    style={styles.periodInput}
                    value={monthYear}
                    onChangeText={setMonthYear}
                    placeholder="e.g. October 2026"
                  />
                </View>
                <View style={styles.baseRentInfo}>
                  <Text style={styles.baseRentLabel}>Standard Rent</Text>
                  <Text style={styles.baseRentVal}>₹{tenant.rentAmount.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {/* ========================================================= */}
            {/* STEP 1: DECLARE RENT AMOUNT & SHOW TOTAL RENT PENDING     */}
            {/* ========================================================= */}
            {entryMode !== 'pay_only' ? (
              <View style={styles.stepContainer}>
                <View style={styles.stepHeaderRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>STEP 1</Text>
                  </View>
                  <Text style={styles.stepTitle}>DECLARE RENT AMOUNT</Text>
                </View>

                {/* Declared Rent Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>
                    {isFlexibleMode ? 'Declared Rent Amount for this Period (₹) *' : 'Gross Rent Amount (₹)'}
                  </Text>
                  <View style={styles.currencyInputRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      keyboardType="numeric"
                      value={declaredRent}
                      onChangeText={setDeclaredRent}
                      placeholder={tenant.rentAmount.toString()}
                    />
                  </View>
                  <Text style={styles.fieldHint}>
                    {isFlexibleMode
                      ? 'You can declare standard monthly rent or any custom figure for this cycle.'
                      : 'Gross scheduled monthly rent for this property.'}
                  </Text>
                </View>

                {/* Maintenance Deduction Toggle */}
                <View style={styles.toggleCard}>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleTextContainer}>
                      <View style={styles.toggleHeaderRow}>
                        <Wrench size={16} color={isMaintenanceDeducted ? '#059669' : '#64748B'} />
                        <Text style={styles.toggleLabel}>Maintenance Deduction</Text>
                      </View>
                      <Text style={styles.toggleSubtext}>
                        Deduct maintenance directly from this period's rent
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
                      <Text style={styles.inputLabel}>Maintenance Amount (₹)</Text>
                      <View style={styles.currencyInputRow}>
                        <Text style={styles.currencySymbol}>₹</Text>
                        <TextInput
                          style={styles.currencyInput}
                          keyboardType="numeric"
                          placeholder="e.g. 3500"
                          value={deductionAmount}
                          onChangeText={setDeductionAmount}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              /* Pay Only Notice */
              <View style={styles.payOnlyNotice}>
                <Scale size={16} color="#4338CA" />
                <Text style={styles.payOnlyNoticeText}>
                  Recording payment directly towards existing pending balance. No new rent is declared for this entry.
                </Text>
              </View>
            )}

            {/* TOTAL RENT PENDING DISPLAY BOX (Hero Highlight) */}
            <View style={styles.pendingHeroCard}>
              <View style={styles.pendingHeroHeader}>
                <Scale size={16} color="#A5B4FC" />
                <Text style={styles.pendingHeroLabel}>TOTAL RENT PENDING CALCULATION</Text>
              </View>

              <View style={styles.pendingBreakdownGrid}>
                {/* Prior Balance */}
                <View style={styles.pendingBreakdownCol}>
                  <Text style={styles.breakdownSub}>Prior Balance</Text>
                  <Text
                    style={[
                      styles.breakdownVal,
                      priorBalance > 0
                        ? styles.textAmber
                        : priorBalance < 0
                        ? styles.textEmerald
                        : styles.textSlate,
                    ]}
                  >
                    {priorBalance > 0
                      ? `+₹${priorBalance.toLocaleString()} Due`
                      : priorBalance < 0
                      ? `-₹${Math.abs(priorBalance).toLocaleString()} Adv`
                      : '₹0 (Settled)'}
                  </Text>
                </View>

                {/* + Newly Declared Rent */}
                <View style={styles.pendingBreakdownCol}>
                  <Text style={styles.breakdownSub}>+ Declared Rent</Text>
                  <Text style={styles.breakdownVal}>
                    +₹{netDeclaredRent.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.pendingTotalRow}>
                <View>
                  <Text style={styles.pendingTotalTitle}>TOTAL RENT PENDING</Text>
                  <Text style={styles.pendingTotalSub}>
                    Total required from tenant before payment
                  </Text>
                </View>
                <Text style={styles.pendingTotalValue}>
                  ₹{totalRentPending.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* ========================================================= */}
            {/* STEP 2: RECORD PAYMENT DONE & PAYMENT DATE                */}
            {/* ========================================================= */}
            {entryMode !== 'declare_only' ? (
              <View style={styles.stepContainer}>
                <View style={styles.stepHeaderRow}>
                  <View style={[styles.stepBadge, styles.stepBadgeGreen]}>
                    <Text style={[styles.stepBadgeText, styles.stepBadgeTextGreen]}>
                      STEP 2
                    </Text>
                  </View>
                  <Text style={styles.stepTitle}>RECORD PAYMENT DONE WITH DATE</Text>
                </View>

                {/* Amount Paid Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>
                    Payment Done (Any Random Figure Paid) (₹) *
                  </Text>
                  <View style={styles.currencyInputRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      keyboardType="numeric"
                      placeholder="e.g. 5000"
                      value={amountPaid}
                      onChangeText={setAmountPaid}
                    />
                  </View>
                </View>

                {/* Date Input with Quick Date Chips */}
                <View style={styles.formGroup}>
                  <View style={styles.dateLabelRow}>
                    <Text style={styles.inputLabel}>Payment Date (YYYY-MM-DD) *</Text>
                    <View style={styles.dateChipsRow}>
                      <TouchableOpacity
                        style={[
                          styles.dateChip,
                          paymentDate === todayStr && styles.dateChipActive,
                        ]}
                        onPress={() => setPaymentDate(todayStr)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dateChipText,
                            paymentDate === todayStr && styles.dateChipTextActive,
                          ]}
                        >
                          Today
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.dateChip,
                          paymentDate === yesterdayStr && styles.dateChipActive,
                        ]}
                        onPress={() => setPaymentDate(yesterdayStr)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dateChipText,
                            paymentDate === yesterdayStr && styles.dateChipTextActive,
                          ]}
                        >
                          Yesterday
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.dateInputWrapper}>
                    <Calendar size={16} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.dateInput}
                      value={paymentDate}
                      onChangeText={setPaymentDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>

                {/* Payment Mode Selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Payment Mode</Text>
                  <View style={styles.modeButtonGroup}>
                    {(['UPI', 'NEFT', 'Cash'] as PaymentMode[]).map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.modeButton,
                          paymentMode === mode && styles.modeButtonActive,
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
              </View>
            ) : (
              /* Declare Only Notice */
              <View style={styles.declareOnlyNotice}>
                <Plus size={16} color="#059669" />
                <Text style={styles.declareOnlyNoticeText}>
                  Declaring rent due only. Payment will be recorded as ₹0. Tenant's pending balance will increase by ₹{netDeclaredRent.toLocaleString()}.
                </Text>
              </View>
            )}

            {/* ========================================================= */}
            {/* STEP 3: LIVE SUBTRACTION & RENT DIFFERENCE RESULT         */}
            {/* ========================================================= */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Calculator size={16} color="#4338CA" />
                <Text style={styles.resultHeaderTitle}>
                  LIVE RENT DIFFERENCE CALCULATION
                </Text>
              </View>

              {/* Subtraction Formula Strip */}
              <View style={styles.formulaStrip}>
                <View style={styles.formulaItem}>
                  <Text style={styles.formulaLabel}>Total Pending</Text>
                  <Text style={styles.formulaVal}>₹{totalRentPending.toLocaleString()}</Text>
                </View>

                <Text style={styles.formulaOperator}>−</Text>

                <View style={styles.formulaItem}>
                  <Text style={styles.formulaLabel}>Payment Done</Text>
                  <Text style={[styles.formulaVal, { color: '#059669' }]}>
                    ₹{numPaid.toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.formulaOperator}>=</Text>

                <View style={styles.formulaItem}>
                  <Text style={styles.formulaLabel}>Rent Difference</Text>
                  <Text
                    style={[
                      styles.formulaVal,
                      remainingDifference > 0
                        ? styles.textRed
                        : remainingDifference < 0
                        ? styles.textBlue
                        : styles.textEmerald,
                    ]}
                  >
                    {remainingDifference > 0
                      ? `₹${remainingDifference.toLocaleString()}`
                      : remainingDifference < 0
                      ? `₹${Math.abs(remainingDifference).toLocaleString()}`
                      : '₹0'}
                  </Text>
                </View>
              </View>

              {/* Dynamic Status Result Banner */}
              <View
                style={[
                  styles.statusBanner,
                  remainingDifference > 0
                    ? styles.statusBannerDue
                    : remainingDifference < 0
                    ? styles.statusBannerAdv
                    : styles.statusBannerSettled,
                ]}
              >
                <View style={styles.statusBannerLeft}>
                  {remainingDifference > 0 ? (
                    <ArrowRight size={16} color="#DC2626" />
                  ) : remainingDifference < 0 ? (
                    <TrendingDown size={16} color="#2563EB" />
                  ) : (
                    <CheckCircle size={16} color="#059669" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.statusBannerTitle,
                        remainingDifference > 0
                          ? { color: '#B91C1C' }
                          : remainingDifference < 0
                          ? { color: '#1D4ED8' }
                          : { color: '#047857' },
                      ]}
                    >
                      {remainingDifference > 0
                        ? `Remaining Pending Dues: ₹${remainingDifference.toLocaleString()}`
                        : remainingDifference < 0
                        ? `Advance Credit Balance: ₹${Math.abs(remainingDifference).toLocaleString()}`
                        : 'All Balance Cleared (Settled ₹0)'}
                    </Text>
                    <Text
                      style={[
                        styles.statusBannerSub,
                        remainingDifference > 0
                          ? { color: '#DC2626' }
                          : remainingDifference < 0
                          ? { color: '#2563EB' }
                          : { color: '#059669' },
                      ]}
                    >
                      {remainingDifference > 0
                        ? `Tenant still owes ₹${remainingDifference.toLocaleString()} after this payment.`
                        : remainingDifference < 0
                        ? `Payment exceeds total pending. ₹${Math.abs(remainingDifference).toLocaleString()} stored as advance credit.`
                        : 'Exact payment received! Tenant has zero remaining dues.'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Remarks Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Transaction Notes / Remarks (Optional)</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={2}
                placeholder="e.g. Paid via UPI ref #93821, remaining due to be cleared next week."
                value={remarks}
                onChangeText={setRemarks}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Footer Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <CheckCircle size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {isSubmitting
                  ? 'Saving...'
                  : entryMode === 'declare_only'
                  ? `Declare ₹${numDeclaredRent.toLocaleString()} Rent Due`
                  : entryMode === 'pay_only'
                  ? `Record ₹${numPaid.toLocaleString()} Payment`
                  : 'Record & Update Difference'}
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  entryModeTabs: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  entryModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  entryModeTabActive: {
    backgroundColor: '#4338CA',
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  entryModeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  entryModeTabTextActive: {
    color: '#FFFFFF',
  },
  periodCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  periodInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  baseRentInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  baseRentLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  baseRentVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 0.5,
  },
  stepBadgeTextGreen: {
    color: '#047857',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 10,
  },
  toggleCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  toggleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  deductionInputArea: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  payOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  payOnlyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#3730A3',
    fontWeight: '600',
  },
  declareOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  declareOnlyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  pendingHeroCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#4338CA',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  pendingHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pendingHeroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C7D2FE',
    letterSpacing: 0.8,
  },
  pendingBreakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  pendingBreakdownCol: {
    flex: 1,
  },
  breakdownSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  pendingTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 10,
  },
  pendingTotalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  pendingTotalSub: {
    fontSize: 10,
    color: '#A5B4FC',
    marginTop: 1,
  },
  pendingTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FDE047',
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dateChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modeButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modeButtonTextActive: {
    color: '#047857',
  },
  resultCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  resultHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 0.8,
  },
  formulaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  formulaItem: {
    flex: 1,
    alignItems: 'center',
  },
  formulaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  formulaVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  formulaOperator: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
    paddingHorizontal: 4,
  },
  statusBanner: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statusBannerDue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBannerAdv: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusBannerSettled: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 60,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  textRed: {
    color: '#DC2626',
  },
  textBlue: {
    color: '#2563EB',
  },
  textEmerald: {
    color: '#059669',
  },
  textAmber: {
    color: '#D97706',
  },
  textSlate: {
    color: '#64748B',
  },
});
