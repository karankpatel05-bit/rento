import React, { useState } from 'react';
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
} from 'react-native';
import {
  X,
  User,
  Home,
  IndianRupee,
  Zap,
  TrendingUp,
  Wrench,
  Check,
  Camera,
  FileSpreadsheet,
} from 'lucide-react-native';
import { MaintenanceWorkflow, Tenant, PaymentRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { LedgerScannerModal } from '../ocr/LedgerScannerModal';

interface TenantOnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TenantOnboardingModal: React.FC<TenantOnboardingModalProps> = ({
  visible,
  onClose,
}) => {
  const { addTenant } = useApp();

  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [propertyAddress, setPropertyAddress] = useState<string>('');
  const [unitDesignation, setUnitDesignation] = useState<string>('');
  const [rentAmount, setRentAmount] = useState<string>('');
  const [incrementType, setIncrementType] = useState<'percentage' | 'fixed'>('percentage');
  const [incrementValue, setIncrementValue] = useState<string>('');
  const [incrementNotes, setIncrementNotes] = useState<string>('');
  const [electricityLoad, setElectricityLoad] = useState<string>('');
  const [electricityDeposit, setElectricityDeposit] = useState<string>('');
  const [maintenanceWorkflow, setMaintenanceWorkflow] = useState<MaintenanceWorkflow>(
    'variable_rent_deduction'
  );
  const [historicalPayments, setHistoricalPayments] = useState<
    Omit<PaymentRecord, 'id' | 'createdAt' | 'tenantId'>[]
  >([]);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleResetAndClose = () => {
    setStep(1);
    setName('');
    setPhone('');
    setPropertyAddress('');
    setUnitDesignation('');
    setRentAmount('');
    setIncrementValue('');
    setIncrementNotes('');
    setElectricityLoad('');
    setElectricityDeposit('');
    setMaintenanceWorkflow('variable_rent_deduction');
    setHistoricalPayments([]);
    setIsScannerOpen(false);
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim() || !propertyAddress.trim() || !rentAmount.trim()) {
      alert('Please fill in tenant name, property address, and rent amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTenant(
        {
          name: name.trim(),
          phone: phone.trim() || '+91 90000 00000',
          propertyAddress: propertyAddress.trim(),
          unitDesignation: unitDesignation.trim() || 'Unit 1',
          rentAmount: parseFloat(rentAmount) || 0,
          rentIncrement: {
            type: incrementType,
            value: parseFloat(incrementValue) || 0,
            notes: incrementNotes,
          },
          electricityLoad: electricityLoad.trim(),
          electricityDeposit: parseFloat(electricityDeposit) || 0,
          maintenanceWorkflow,
          leaseStartDate: new Date().toISOString().split('T')[0],
          active: true,
        },
        historicalPayments
      );
      handleResetAndClose();
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
              <Text style={styles.title}>New Tenant Registration</Text>
              <Text style={styles.stepIndicator}>Step {step} of 2</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleResetAndClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: step === 1 ? '50%' : '100%' },
              ]}
            />
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {step === 1 ? (
              /* Step 1: Tenant & Property & Rent */
              <View>
                <View style={styles.sectionHeader}>
                  <User size={18} color="#059669" />
                  <Text style={styles.sectionTitle}>Tenant & Property Details</Text>
                </View>

                {/* Tenant Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Tenant Full Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Ramesh Kulkarni"
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                {/* Phone */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Contact Phone Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                {/* Property Address */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Property Address / Building *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Prestige Lakeview, Whitefield"
                    value={propertyAddress}
                    onChangeText={setPropertyAddress}
                  />
                </View>

                {/* Unit Designation */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Unit / Flat / Office Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Flat 304 (2 BHK)"
                    value={unitDesignation}
                    onChangeText={setUnitDesignation}
                  />
                </View>

                {/* Base Rent */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Monthly Rent Amount (₹) *</Text>
                  <View style={styles.currencyRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      placeholder="e.g. 30000"
                      keyboardType="numeric"
                      value={rentAmount}
                      onChangeText={setRentAmount}
                    />
                  </View>
                </View>

                {/* Smart Notebook Ledger Import via Camera */}
                <View style={styles.ocrSection}>
                  <View style={styles.ocrHeaderRow}>
                    <View style={styles.ocrTitleRow}>
                      <Camera size={16} color="#059669" />
                      <Text style={styles.ocrSectionTitle}>Physical Ledger Records</Text>
                    </View>
                    {historicalPayments.length > 0 && (
                      <View style={styles.scannedBadge}>
                        <Check size={12} color="#047857" />
                        <Text style={styles.scannedBadgeText}>
                          {historicalPayments.length} records ready
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.ocrSectionDesc}>
                    Digitize past rent entries from physical notebooks instantly with camera pattern recognition.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.scanPastRecordsBtn,
                      historicalPayments.length > 0 && styles.scanPastRecordsBtnActive,
                    ]}
                    onPress={() => setIsScannerOpen(true)}
                  >
                    <Camera
                      size={16}
                      color={historicalPayments.length > 0 ? '#047857' : '#059669'}
                    />
                    <Text
                      style={[
                        styles.scanPastRecordsText,
                        historicalPayments.length > 0 && styles.scanPastRecordsTextActive,
                      ]}
                    >
                      {historicalPayments.length > 0
                        ? `Edit Scanned Records (${historicalPayments.length})`
                        : 'Scan Past Records (Camera / OCR)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Step 2: Rent Increment, Electricity & Maintenance Workflow */
              <View>
                {/* Rent Increment Conditions */}
                <View style={styles.sectionHeader}>
                  <TrendingUp size={18} color="#059669" />
                  <Text style={styles.sectionTitle}>Rent Increment Conditions</Text>
                </View>

                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      incrementType === 'percentage' && styles.segmentBtnActive,
                    ]}
                    onPress={() => setIncrementType('percentage')}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        incrementType === 'percentage' && styles.segmentBtnTextActive,
                      ]}
                    >
                      Percentage (%)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      incrementType === 'fixed' && styles.segmentBtnActive,
                    ]}
                    onPress={() => setIncrementType('fixed')}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        incrementType === 'fixed' && styles.segmentBtnTextActive,
                      ]}
                    >
                      Fixed Amount (₹)
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>
                    Annual Increase ({incrementType === 'percentage' ? '%' : '₹'})
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={incrementType === 'percentage' ? '5' : '2000'}
                    keyboardType="numeric"
                    value={incrementValue}
                    onChangeText={setIncrementValue}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Increment Terms / Notes</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 5% escalation every 11 months"
                    value={incrementNotes}
                    onChangeText={setIncrementNotes}
                  />
                </View>

                {/* Electricity Details */}
                <View style={[styles.sectionHeader, { marginTop: 12 }]}>
                  <Zap size={18} color="#D97706" />
                  <Text style={styles.sectionTitle}>Electricity Board & Deposit</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Electricity Board Load Details</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 5 kW Three-Phase / Meter #BES-9921"
                    value={electricityLoad}
                    onChangeText={setElectricityLoad}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>
                    Electricity Deposit Given by Owner (₹)
                  </Text>
                  <View style={styles.currencyRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      placeholder="e.g. 25000"
                      keyboardType="numeric"
                      value={electricityDeposit}
                      onChangeText={setElectricityDeposit}
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Used for scheduling the annual May 1st interest rebate reminder.
                  </Text>
                </View>

                {/* Maintenance Workflow System */}
                <View style={[styles.sectionHeader, { marginTop: 12 }]}>
                  <Wrench size={18} color="#059669" />
                  <Text style={styles.sectionTitle}>Maintenance Workflow</Text>
                </View>

                {/* Option 1: Variable Rent Deduction */}
                <TouchableOpacity
                  style={[
                    styles.workflowCard,
                    maintenanceWorkflow === 'variable_rent_deduction' &&
                      styles.workflowCardActive,
                  ]}
                  onPress={() => setMaintenanceWorkflow('variable_rent_deduction')}
                >
                  <View style={styles.workflowCardContent}>
                    <Text style={styles.workflowCardTitle}>
                      Variable Rent Deduction (Twice / Year)
                    </Text>
                    <Text style={styles.workflowCardDesc}>
                      Deducted directly from rent payout twice a year (varying amounts & months).
                    </Text>
                  </View>
                  {maintenanceWorkflow === 'variable_rent_deduction' && (
                    <View style={styles.checkIcon}>
                      <Check size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Option 2: Standard */}
                <TouchableOpacity
                  style={[
                    styles.workflowCard,
                    maintenanceWorkflow === 'standard' && styles.workflowCardActive,
                  ]}
                  onPress={() => setMaintenanceWorkflow('standard')}
                >
                  <View style={styles.workflowCardContent}>
                    <Text style={styles.workflowCardTitle}>Standard Maintenance</Text>
                    <Text style={styles.workflowCardDesc}>
                      Tenant pays maintenance separately to society / RWA.
                    </Text>
                  </View>
                  {maintenanceWorkflow === 'standard' && (
                    <View style={styles.checkIcon}>
                      <Check size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footer}>
            {step === 2 ? (
              <>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSave}
                  disabled={isSubmitting}
                >
                  <Text style={styles.primaryBtnText}>
                    {isSubmitting ? 'Saving...' : 'Complete Onboarding'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  if (!name.trim() || !propertyAddress.trim() || !rentAmount.trim()) {
                    alert('Please fill in Name, Address, and Rent amount.');
                    return;
                  }
                  setStep(2);
                }}
              >
                <Text style={styles.primaryBtnText}>Continue to Step 2</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Ledger Scanner Modal for Headerless Physical Notebook OCR */}
      <LedgerScannerModal
        visible={isScannerOpen}
        rentAmount={parseFloat(rentAmount) || 0}
        onClose={() => setIsScannerOpen(false)}
        onConfirmImport={(records) => {
          setHistoricalPayments(records);
        }}
      />
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
    maxHeight: '92%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepIndicator: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
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
  progressBarBg: {
    height: 3,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#059669',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  currencyRow: {
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
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  workflowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  workflowCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  workflowCardContent: {
    flex: 1,
  },
  workflowCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  workflowCardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  backBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  primaryBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ocrSection: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    marginBottom: 14,
  },
  ocrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ocrTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ocrSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  scannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scannedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  ocrSectionDesc: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
    marginBottom: 10,
  },
  scanPastRecordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
  },
  scanPastRecordsBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  scanPastRecordsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  scanPastRecordsTextActive: {
    color: '#047857',
  },
});
