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
} from 'react-native';
import { X, Zap, CheckCircle } from 'lucide-react-native';
import { Tenant } from '../../types';
import { useApp } from '../../context/AppContext';

interface LogInterestModalProps {
  visible: boolean;
  onClose: () => void;
  tenant: Tenant;
}

export const LogInterestModal: React.FC<LogInterestModalProps> = ({
  visible,
  onClose,
  tenant,
}) => {
  const { recordInterestCollection } = useApp();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<string>(currentYear.toString());
  const [amountCollected, setAmountCollected] = useState<string>('');
  const [collectedDate, setCollectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    const amount = parseFloat(amountCollected) || 0;
    if (amount <= 0) {
      alert('Please enter a valid interest amount collected.');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordInterestCollection({
        tenantId: tenant.id,
        year: parseInt(year, 10) || currentYear,
        amountCollected: amount,
        collectedDate,
        remarks: remarks.trim(),
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
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Zap size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.title}>Collect Deposit Interest</Text>
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
            {/* Owner Deposit Context Card */}
            <View style={styles.contextCard}>
              <Text style={styles.contextLabel}>Owner Electricity Deposit Given</Text>
              <Text style={styles.contextValue}>
                ₹{tenant.electricityDeposit.toLocaleString()}
              </Text>
              <Text style={styles.contextHint}>
                Board: {tenant.electricityLoad || 'Standard load'}
              </Text>
            </View>

            {/* Year */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Interest Year</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={year}
                onChangeText={setYear}
              />
            </View>

            {/* Interest Amount */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Rebate / Interest Amount Collected (₹) *</Text>
              <View style={styles.currencyRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.currencyInput}
                  keyboardType="numeric"
                  placeholder="e.g. 1950"
                  value={amountCollected}
                  onChangeText={setAmountCollected}
                />
              </View>
            </View>

            {/* Date */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Collection Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={collectedDate}
                onChangeText={setCollectedDate}
              />
            </View>

            {/* Remarks */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Remarks / Adjustment Notes</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={2}
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
                {isSubmitting ? 'Saving...' : 'Confirm Collected'}
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
    backgroundColor: '#FEF3C7',
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
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  contextLabel: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  contextValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 2,
  },
  contextHint: {
    fontSize: 11,
    color: '#B45309',
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
    backgroundColor: '#D97706',
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
