import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X, ShieldPlus, CheckCircle } from 'lucide-react-native';
import { Tenant, PaymentMode } from '../../types';
import { useApp } from '../../context/AppContext';

interface LogAdditionalDepositModalProps {
  visible: boolean;
  onClose: () => void;
  tenant: Tenant;
}

export const LogAdditionalDepositModal: React.FC<LogAdditionalDepositModalProps> = ({
  visible,
  onClose,
  tenant,
}) => {
  const { addAdditionalDeposit } = useApp();

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const initialDeposit = tenant.securityDeposit || 0;
  const currentAdditional = (tenant.additionalDeposits || []).reduce((sum, d) => sum + d.amount, 0);
  const currentTotal = initialDeposit + currentAdditional;

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid additional deposit amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAdditionalDeposit(tenant.id, {
        amount: numAmount,
        date,
        paymentMode,
        remarks: remarks.trim(),
      });
      setAmount('');
      setRemarks('');
      onClose();
    } catch (err) {
      console.error('Error logging additional deposit:', err);
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
                <ShieldPlus size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.title}>Add Additional Deposit</Text>
                <Text style={styles.subtitle}>
                  {tenant.name} • {tenant.unitDesignation}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {/* Current Deposit Summary Card */}
            <View style={styles.contextCard}>
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Current Security Deposit Held</Text>
                <Text style={styles.contextValue}>₹{currentTotal.toLocaleString()}</Text>
              </View>
              <Text style={styles.contextSub}>
                Initial Deposit: ₹{initialDeposit.toLocaleString()} • Additional logged: ₹
                {currentAdditional.toLocaleString()}
              </Text>
            </View>

            {/* Amount Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Additional Deposit Amount (₹) *</Text>
              <View style={styles.currencyRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.currencyInput}
                  keyboardType="numeric"
                  placeholder="e.g. 15000"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* Date Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Deposit Received Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={date}
                onChangeText={setDate}
                placeholder="2026-09-23"
              />
            </View>

            {/* Mode of Payment (Mandatory: UPI, NEFT, Cash) */}
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

            {/* Remarks Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Remarks / Reason for Additional Deposit</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={2}
                placeholder="e.g. Additional 1 month security deposit upon rent escalation"
                value={remarks}
                onChangeText={setRemarks}
                textAlignVertical="top"
              />
            </View>
          </View>

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
                {isSubmitting ? 'Recording...' : 'Record Deposit'}
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
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
  contextCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  contextValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#047857',
  },
  contextSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 4,
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
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 60,
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
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
