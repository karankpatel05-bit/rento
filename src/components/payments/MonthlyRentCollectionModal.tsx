import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  CheckCircle2,
  Calendar,
  Wrench,
  Sparkles,
  Building2,
  Check,
  Scale,
  CreditCard,
  IndianRupee,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { Tenant, PaymentMode, PaymentRecord } from '../../types';
import { useApp } from '../../context/AppContext';

interface MonthlyRentCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  targetMonthYear?: string | null;
}

interface TenantFormState {
  deductionAmount: string;
  amountPaid: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  remarks: string;
  isExpanded: boolean;
}

export const MonthlyRentCollectionModal: React.FC<MonthlyRentCollectionModalProps> = ({
  visible,
  onClose,
  targetMonthYear,
}) => {
  const { tenants, payments, logPayment } = useApp();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Default to target month if provided, otherwise current actual month
  const computedMonthYear =
    targetMonthYear || now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const [activeMonthYear, setActiveMonthYear] = useState<string>(computedMonthYear);

  useEffect(() => {
    if (targetMonthYear) {
      setActiveMonthYear(targetMonthYear);
    }
  }, [targetMonthYear]);
  const [submittingTenantId, setSubmittingTenantId] = useState<string | null>(null);

  // Form states keyed by tenantId
  const [formsState, setFormsState] = useState<Record<string, TenantFormState>>({});

  const activeTenants = tenants.filter((t) => t.active);

  // Helper to get or initialize form state for a tenant
  const getForm = (tenant: Tenant): TenantFormState => {
    if (formsState[tenant.id]) {
      return formsState[tenant.id];
    }
    const defaultPaid = tenant.rentAmount.toString();
    return {
      deductionAmount: '',
      amountPaid: defaultPaid,
      paymentDate: todayStr,
      paymentMode: 'UPI',
      remarks: '',
      isExpanded: true,
    };
  };

  const updateForm = (tenantId: string, updates: Partial<TenantFormState>) => {
    setFormsState((prev) => {
      const current = prev[tenantId] || {
        deductionAmount: '',
        amountPaid: '',
        paymentDate: todayStr,
        paymentMode: 'UPI',
        remarks: '',
        isExpanded: true,
      };
      return {
        ...prev,
        [tenantId]: { ...current, ...updates },
      };
    });
  };

  // Find existing payment for a tenant in this month
  const getExistingPayment = (tenantId: string): PaymentRecord | undefined => {
    return payments.find(
      (p) =>
        p.tenantId === tenantId &&
        p.monthYear.trim().toLowerCase() === activeMonthYear.trim().toLowerCase()
    );
  };

  // Progress metrics
  const totalProperties = activeTenants.length;
  const collectedCount = activeTenants.filter((t) => Boolean(getExistingPayment(t.id))).length;
  const pendingCount = totalProperties - collectedCount;
  const progressPercent = totalProperties > 0 ? (collectedCount / totalProperties) * 100 : 0;

  const handleRecordPayment = async (tenant: Tenant) => {
    const form = getForm(tenant);
    const grossRent = tenant.rentAmount;
    const isVariableMaint = tenant.maintenanceWorkflow === 'variable_rent_deduction';
    const numDeduction = isVariableMaint ? parseFloat(form.deductionAmount) || 0 : 0;
    const netRent = Math.max(0, grossRent - numDeduction);
    const numPaid = parseFloat(form.amountPaid);

    if (isNaN(numPaid) || numPaid < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid rent amount paid.');
      return;
    }

    if (!form.paymentDate.trim()) {
      Alert.alert('Missing Date', 'Please enter the payment date.');
      return;
    }

    setSubmittingTenantId(tenant.id);
    try {
      let remark = form.remarks.trim();
      if (!remark) {
        if (numDeduction > 0) {
          remark = `Gross rent ₹${grossRent.toLocaleString()} - Maint ₹${numDeduction.toLocaleString()} deducted = Net ₹${numPaid.toLocaleString()} collected`;
        } else {
          remark = `Monthly rent collection for ${activeMonthYear}`;
        }
      }

      await logPayment({
        tenantId: tenant.id,
        monthYear: activeMonthYear,
        paymentDate: form.paymentDate.trim(),
        expectedRent: grossRent,
        isMaintenanceDeducted: numDeduction > 0,
        maintenanceDeductionAmount: numDeduction,
        netPayoutReceived: netRent,
        amountPaid: numPaid,
        paymentMode: form.paymentMode,
        remarks: remark,
        status: numPaid >= netRent && netRent > 0 ? 'paid' : numPaid > 0 ? 'partial' : 'pending',
      });

      // Collapse the card upon success
      updateForm(tenant.id, { isExpanded: false });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save payment record.');
    } finally {
      setSubmittingTenantId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerBadgeRow}>
                <View style={styles.autoBadge}>
                  <Sparkles size={11} color="#4F46E5" />
                  <Text style={styles.autoBadgeText}>AUTOMATED RENT COLLECTION</Text>
                </View>
                <Text style={styles.headerMonth}>{activeMonthYear}</Text>
              </View>
              <Text style={styles.headerTitle}>Collect Property Rents</Text>
              <Text style={styles.headerSub}>
                Monthly collection prompt for all active properties
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Progress Strip */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>
                {collectedCount} of {totalProperties} Properties Collected
              </Text>
              <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Body: List of Properties */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {activeTenants.length === 0 ? (
              <View style={styles.emptyState}>
                <Building2 size={36} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No active properties found</Text>
                <Text style={styles.emptyDesc}>Add active tenants to collect monthly rent.</Text>
              </View>
            ) : (
              activeTenants.map((tenant) => {
                const existing = getExistingPayment(tenant.id);
                const form = getForm(tenant);
                const isVariableMaint = tenant.maintenanceWorkflow === 'variable_rent_deduction';
                const grossRent = tenant.rentAmount;
                const numDeduction = isVariableMaint ? parseFloat(form.deductionAmount) || 0 : 0;
                const netRent = Math.max(0, grossRent - numDeduction);
                const isSubmitting = submittingTenantId === tenant.id;

                if (existing) {
                  // Property ALREADY COLLECTED
                  return (
                    <View key={tenant.id} style={styles.collectedCard}>
                      <View style={styles.collectedCardLeft}>
                        <View style={styles.checkIconCircle}>
                          <Check size={16} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.unitNameRow}>
                            <Text style={styles.cardUnitText}>{tenant.unitDesignation}</Text>
                            <Text style={styles.cardTenantName}>{tenant.name}</Text>
                          </View>
                          <Text style={styles.cardAddress}>{tenant.propertyAddress}</Text>

                          <View style={styles.collectedDetailsRow}>
                            <Text style={styles.collectedAmountText}>
                              ✓ Paid ₹{existing.amountPaid.toLocaleString()}
                            </Text>
                            <Text style={styles.collectedMetaText}>
                              on {existing.paymentDate} • {existing.paymentMode}
                            </Text>
                          </View>

                          {existing.isMaintenanceDeducted && (
                            <View style={styles.maintDeductedMiniTag}>
                              <Wrench size={10} color="#B45309" />
                              <Text style={styles.maintDeductedMiniText}>
                                Maint. -₹{existing.maintenanceDeductionAmount.toLocaleString()} deducted (Gross: ₹{existing.expectedRent.toLocaleString()})
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.collectedStatusPill}>
                        <Text style={styles.collectedStatusPillText}>
                          {existing.status === 'paid' ? 'Settled' : 'Partial'}
                        </Text>
                      </View>
                    </View>
                  );
                }

                // Property PENDING COLLECTION
                return (
                  <View key={tenant.id} style={styles.pendingCard}>
                    {/* Card Header */}
                    <View style={styles.pendingCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.unitNameRow}>
                          <View style={styles.pendingUnitBadge}>
                            <Text style={styles.pendingUnitText}>{tenant.unitDesignation}</Text>
                          </View>
                          <Text style={styles.pendingTenantName}>{tenant.name}</Text>
                        </View>
                        <Text style={styles.cardAddress}>{tenant.propertyAddress}</Text>
                      </View>

                      <View style={styles.rentBadgeContainer}>
                        <Text style={styles.rentBadgeLabel}>Rent Due</Text>
                        <Text style={styles.rentBadgeAmount}>₹{grossRent.toLocaleString()}</Text>
                      </View>
                    </View>

                    {/* Quick Collection Form */}
                    <View style={styles.quickFormContainer}>
                      {/* Variable Maintenance Deduction (if applicable) */}
                      {isVariableMaint && (
                        <View style={styles.maintSection}>
                          <View style={styles.maintHeaderRow}>
                            <Wrench size={14} color="#B45309" />
                            <Text style={styles.maintTitle}>Variable Maintenance Deduction</Text>
                          </View>
                          <Text style={styles.maintDesc}>
                            Mention maintenance to deduct (e.g. ₹12,000 from ₹{grossRent.toLocaleString()})
                          </Text>

                          <View style={styles.maintInputRow}>
                            <Text style={styles.maintCurrency}>₹</Text>
                            <TextInput
                              style={styles.maintInput}
                              keyboardType="numeric"
                              placeholder="e.g. 12000"
                              value={form.deductionAmount}
                              onChangeText={(val) => {
                                const newDeduction = parseFloat(val) || 0;
                                const newNet = Math.max(0, grossRent - newDeduction);
                                updateForm(tenant.id, {
                                  deductionAmount: val,
                                  amountPaid: newNet.toString(),
                                });
                              }}
                            />
                            {numDeduction > 0 && (
                              <TouchableOpacity
                                style={styles.clearDeductionBtn}
                                onPress={() => {
                                  updateForm(tenant.id, {
                                    deductionAmount: '',
                                    amountPaid: grossRent.toString(),
                                  });
                                }}
                              >
                                <X size={14} color="#94A3B8" />
                              </TouchableOpacity>
                            )}
                          </View>

                          {numDeduction > 0 && (
                            <View style={styles.maintEquationBox}>
                              <Text style={styles.maintEquationText}>
                                Gross ₹{grossRent.toLocaleString()} - Maint ₹{numDeduction.toLocaleString()} ={' '}
                                <Text style={styles.maintEquationHighlight}>
                                  Net Payable: ₹{netRent.toLocaleString()}
                                </Text>
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Rent Amount Paid Input */}
                      <View style={styles.fieldGroup}>
                        <View style={styles.fieldLabelRow}>
                          <Text style={styles.fieldLabel}>Rent Amount Paid (₹) *</Text>
                          {numDeduction > 0 && (
                            <TouchableOpacity
                              onPress={() => updateForm(tenant.id, { amountPaid: netRent.toString() })}
                            >
                              <Text style={styles.fieldActionText}>
                                Use Net (₹{netRent.toLocaleString()})
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.amountInputRow}>
                          <Text style={styles.amountCurrency}>₹</Text>
                          <TextInput
                            style={styles.amountInput}
                            keyboardType="numeric"
                            value={form.amountPaid}
                            onChangeText={(val) => updateForm(tenant.id, { amountPaid: val })}
                            placeholder={netRent.toString()}
                          />
                        </View>
                      </View>

                      {/* Date & Mode in 2 Columns */}
                      <View style={styles.twoColRow}>
                        {/* Payment Date */}
                        <View style={styles.colHalf}>
                          <View style={styles.dateLabelRow}>
                            <Text style={styles.fieldLabel}>Payment Date</Text>
                            <View style={styles.dateQuickChips}>
                              <TouchableOpacity
                                style={[
                                  styles.miniChip,
                                  form.paymentDate === todayStr && styles.miniChipActive,
                                ]}
                                onPress={() => updateForm(tenant.id, { paymentDate: todayStr })}
                              >
                                <Text
                                  style={[
                                    styles.miniChipText,
                                    form.paymentDate === todayStr && styles.miniChipTextActive,
                                  ]}
                                >
                                  Today
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.miniChip,
                                  form.paymentDate === yesterdayStr && styles.miniChipActive,
                                ]}
                                onPress={() => updateForm(tenant.id, { paymentDate: yesterdayStr })}
                              >
                                <Text
                                  style={[
                                    styles.miniChipText,
                                    form.paymentDate === yesterdayStr && styles.miniChipTextActive,
                                  ]}
                                >
                                  Yest
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <TextInput
                            style={styles.compactInput}
                            value={form.paymentDate}
                            onChangeText={(val) => updateForm(tenant.id, { paymentDate: val })}
                            placeholder="YYYY-MM-DD"
                          />
                        </View>

                        {/* Transaction Mode */}
                        <View style={styles.colHalf}>
                          <Text style={styles.fieldLabel}>Type of Transaction</Text>
                          <View style={styles.modeButtonGroup}>
                            {(['UPI', 'NEFT', 'Cash'] as PaymentMode[]).map((mode) => (
                              <TouchableOpacity
                                key={mode}
                                style={[
                                  styles.modeButton,
                                  form.paymentMode === mode && styles.modeButtonActive,
                                ]}
                                onPress={() => updateForm(tenant.id, { paymentMode: mode })}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.modeButtonText,
                                    form.paymentMode === mode && styles.modeButtonTextActive,
                                  ]}
                                >
                                  {mode}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>

                      {/* Action Button: Record Payment */}
                      <TouchableOpacity
                        style={styles.recordPaymentBtn}
                        onPress={() => handleRecordPayment(tenant)}
                        disabled={isSubmitting}
                        activeOpacity={0.85}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Check size={16} color="#FFFFFF" />
                            <Text style={styles.recordPaymentBtnText}>
                              Record ₹{(parseFloat(form.amountPaid) || netRent).toLocaleString()} for {tenant.unitDesignation}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>
                {pendingCount === 0 ? 'All Completed • Close' : 'Done for Now'}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  headerMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
  },
  collectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  collectedCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  checkIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  unitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardUnitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cardTenantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  collectedDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  collectedAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },
  collectedMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  maintDeductedMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  maintDeductedMiniText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B45309',
  },
  collectedStatusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  collectedStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  pendingUnitBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingUnitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  pendingTenantName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  rentBadgeContainer: {
    alignItems: 'flex-end',
  },
  rentBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  rentBadgeAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickFormContainer: {
    gap: 10,
  },
  maintSection: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
  },
  maintHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  maintTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  maintDesc: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  maintInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  maintCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    marginRight: 4,
  },
  maintInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 6,
  },
  clearDeductionBtn: {
    padding: 4,
  },
  maintEquationBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  maintEquationText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  maintEquationHighlight: {
    fontWeight: '800',
    color: '#B45309',
  },
  fieldGroup: {},
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
  },
  amountCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 8,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  dateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateQuickChips: {
    flexDirection: 'row',
    gap: 4,
  },
  miniChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  miniChipTextActive: {
    color: '#FFFFFF',
  },
  compactInput: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  modeButtonGroup: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  modeButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modeButtonTextActive: {
    color: '#047857',
  },
  recordPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  recordPaymentBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
