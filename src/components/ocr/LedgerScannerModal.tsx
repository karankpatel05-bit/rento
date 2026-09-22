import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Image as ImageIcon,
  X,
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  Edit3,
} from 'lucide-react-native';
import { ExtractedLedgerRow, PaymentMode, PaymentRecord } from '../../types';
import { parseHeaderlessNotebookText } from '../../services/ocrParser';

interface LedgerScannerModalProps {
  visible: boolean;
  onClose: () => void;
  rentAmount?: number;
  onConfirmImport: (records: Omit<PaymentRecord, 'id' | 'createdAt' | 'tenantId'>[]) => void;
}

export const LedgerScannerModal: React.FC<LedgerScannerModalProps> = ({
  visible,
  onClose,
  rentAmount = 0,
  onConfirmImport,
}) => {
  const [activeStep, setActiveStep] = useState<'capture' | 'review'>('capture');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [extractedRows, setExtractedRows] = useState<ExtractedLedgerRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera access to scan your physical ledger notebook.'
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPerm = await requestCameraPermission();
    if (!hasPerm) return;

    try {
      setIsProcessing(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSelectedImageUri(uri);
        processScannedImage(uri);
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      Alert.alert('Camera Error', 'Could not open camera on this device.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setIsProcessing(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSelectedImageUri(uri);
        processScannedImage(uri);
      }
    } catch (err) {
      console.error('Gallery pick error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const processScannedImage = (imageUri: string) => {
    // If user has already entered text, parse it; otherwise open review screen cleanly
    if (rawText.trim()) {
      const parsed = parseHeaderlessNotebookText(rawText);
      setExtractedRows(parsed);
    }
    setActiveStep('review');
  };

  const handleParseRawText = () => {
    if (!rawText.trim()) {
      Alert.alert('Empty Input', 'Please enter or paste lines from your physical notebook.');
      return;
    }
    const parsed = parseHeaderlessNotebookText(rawText);
    if (parsed.length === 0) {
      Alert.alert(
        'No Rows Recognized',
        'Could not identify rows with Date, Amount, and Mode (UPI/NEFT/Cash). Please verify your text format.'
      );
      return;
    }
    setExtractedRows(parsed);
    setActiveStep('review');
  };

  const handleUpdateRow = (id: string, updates: Partial<ExtractedLedgerRow>) => {
    setExtractedRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
  };

  const handleDeleteRow = (id: string) => {
    setExtractedRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleAddManualRow = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const monthYear = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const newRow: ExtractedLedgerRow = {
      id: `manual-row-${Date.now()}`,
      date: formattedDate,
      monthYear,
      amount: rentAmount > 0 ? rentAmount : 0,
      paymentMode: 'Cash',
      remarks: '',
      rawText: '',
      confidence: 1.0,
    };
    setExtractedRows((prev) => [newRow, ...prev]);
  };

  const handleConfirm = () => {
    if (extractedRows.length === 0) {
      Alert.alert('No Records', 'Please extract or add at least one payment row.');
      return;
    }

    const records: Omit<PaymentRecord, 'id' | 'createdAt' | 'tenantId'>[] = extractedRows.map((r) => ({
      monthYear: r.monthYear,
      paymentDate: r.date,
      expectedRent: rentAmount > 0 ? rentAmount : r.amount,
      isMaintenanceDeducted: false,
      maintenanceDeductionAmount: 0,
      netPayoutReceived: r.amount,
      amountPaid: r.amount,
      paymentMode: r.paymentMode,
      remarks: r.remarks ? `[Notebook OCR] ${r.remarks}` : '[Notebook OCR historical entry]',
      status: 'paid',
    }));

    onConfirmImport(records);
    onClose();
  };

  const totalImportedAmount = extractedRows.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <FileSpreadsheet size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.title}>Smart Ledger Import</Text>
                <Text style={styles.subtitle}>
                  Headerless physical notebook OCR & pattern extraction
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Stepper Switcher */}
          <View style={styles.stepperBar}>
            <TouchableOpacity
              style={[styles.stepItem, activeStep === 'capture' && styles.stepItemActive]}
              onPress={() => setActiveStep('capture')}
            >
              <Camera size={15} color={activeStep === 'capture' ? '#059669' : '#64748B'} />
              <Text style={[styles.stepText, activeStep === 'capture' && styles.stepTextActive]}>
                1. Capture Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepItem, activeStep === 'review' && styles.stepItemActive]}
              onPress={() => {
                if (extractedRows.length > 0) setActiveStep('review');
                else handleParseRawText();
              }}
            >
              <Edit3 size={15} color={activeStep === 'review' ? '#059669' : '#64748B'} />
              <Text style={[styles.stepText, activeStep === 'review' && styles.stepTextActive]}>
                2. Review ({extractedRows.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {activeStep === 'capture' ? (
              /* Step 1: Capture & Raw Input */
              <View>
                {/* Photo Capture Buttons */}
                <View style={styles.actionCardsRow}>
                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={handleTakePhoto}
                    disabled={isProcessing}
                  >
                    <View style={styles.actionCardIcon}>
                      <Camera size={26} color="#059669" />
                    </View>
                    <Text style={styles.actionCardTitle}>Camera</Text>
                    <Text style={styles.actionCardSub}>Take photo of notebook</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={handlePickImage}
                    disabled={isProcessing}
                  >
                    <View style={[styles.actionCardIcon, { backgroundColor: '#EFF6FF' }]}>
                      <ImageIcon size={26} color="#2563EB" />
                    </View>
                    <Text style={styles.actionCardTitle}>Gallery</Text>
                    <Text style={styles.actionCardSub}>Pick ledger image</Text>
                  </TouchableOpacity>
                </View>

                {/* Selected Image Preview (if any) */}
                {selectedImageUri && (
                  <View style={styles.imagePreviewBox}>
                    <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
                    <View style={styles.imageBadge}>
                      <Sparkles size={12} color="#059669" />
                      <Text style={styles.imageBadgeText}>Photo Attached</Text>
                    </View>
                  </View>
                )}

                {/* Headerless Pattern Recognition Info */}
                <View style={styles.patternInfoCard}>
                  <View style={styles.patternHeader}>
                    <Sparkles size={16} color="#D97706" />
                    <Text style={styles.patternTitle}>Headerless Notebook Recognition</Text>
                  </View>
                  <Text style={styles.patternBody}>
                    Your notebook has no column titles. The parser scans every line and automatically detects:
                  </Text>
                  <View style={styles.patternTags}>
                    <View style={styles.ptag}><Text style={styles.ptagText}>📅 Date (DD/MM/YY)</Text></View>
                    <View style={styles.ptag}><Text style={styles.ptagText}>💰 Rent Amount</Text></View>
                    <View style={styles.ptag}><Text style={styles.ptagText}>⚡ UPI / NEFT / Cash</Text></View>
                    <View style={styles.ptag}><Text style={styles.ptagText}>📝 Remarks / Notes</Text></View>
                  </View>
                </View>

                {/* Raw OCR Text Area (allows paste or direct typing) */}
                <View style={styles.textAreaGroup}>
                  <View style={styles.textAreaHeader}>
                    <Text style={styles.inputLabel}>Scanned Lines / Physical Notebook Text</Text>
                  </View>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={6}
                    placeholder="Type or paste notebook lines here..."
                    value={rawText}
                    onChangeText={setRawText}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={styles.parseBtn}
                  onPress={handleParseRawText}
                >
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={styles.parseBtnText}>Run Headerless Pattern Parser</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Step 2: Editable Review Table */
              <View>
                <View style={styles.reviewBanner}>
                  <View>
                    <Text style={styles.reviewBannerTitle}>
                      {extractedRows.length} Historical Records Detected
                    </Text>
                    <Text style={styles.reviewBannerSub}>
                      Total Rent: ₹{totalImportedAmount.toLocaleString()} • Verify or edit each field below
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addManualBtn}
                    onPress={handleAddManualRow}
                  >
                    <Plus size={14} color="#059669" />
                    <Text style={styles.addManualBtnText}>Add Row</Text>
                  </TouchableOpacity>
                </View>

                {extractedRows.length === 0 ? (
                  <View style={styles.emptyReview}>
                    <AlertCircle size={32} color="#94A3B8" />
                    <Text style={styles.emptyReviewTitle}>No rows recognized</Text>
                    <Text style={styles.emptyReviewSub}>
                      Switch to Step 1 and capture photo or paste your lines.
                    </Text>
                  </View>
                ) : (
                  extractedRows.map((row, idx) => (
                    <View key={row.id} style={styles.rowCard}>
                      <View style={styles.rowCardTop}>
                        <View style={styles.rowIndexBadge}>
                          <Text style={styles.rowIndexText}>#{idx + 1}</Text>
                          <Text style={styles.rowMonthText}>{row.monthYear}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteRowBtn}
                          onPress={() => handleDeleteRow(row.id)}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      {/* Date & Amount Inputs */}
                      <View style={styles.rowInputsGrid}>
                        <View style={styles.rowCol}>
                          <Text style={styles.smallLabel}>Date (YYYY-MM-DD)</Text>
                          <TextInput
                            style={styles.rowInput}
                            value={row.date}
                            onChangeText={(val) => handleUpdateRow(row.id, { date: val })}
                          />
                        </View>

                        <View style={styles.rowCol}>
                          <Text style={styles.smallLabel}>Amount (₹)</Text>
                          <TextInput
                            style={[styles.rowInput, styles.rowInputBold]}
                            keyboardType="numeric"
                            value={row.amount.toString()}
                            onChangeText={(val) =>
                              handleUpdateRow(row.id, { amount: parseFloat(val) || 0 })
                            }
                          />
                        </View>
                      </View>

                      {/* Payment Mode (Mandatory Selection: UPI | NEFT | Cash) */}
                      <View style={styles.modeSection}>
                        <Text style={styles.smallLabel}>Mode of Payment *</Text>
                        <View style={styles.modeChipsRow}>
                          {(['UPI', 'NEFT', 'Cash'] as PaymentMode[]).map((mode) => (
                            <TouchableOpacity
                              key={mode}
                              style={[
                                styles.modeChip,
                                row.paymentMode === mode && styles.modeChipActive,
                                mode === 'UPI' && row.paymentMode === 'UPI' && styles.modeChipUPI,
                                mode === 'NEFT' && row.paymentMode === 'NEFT' && styles.modeChipNEFT,
                                mode === 'Cash' && row.paymentMode === 'Cash' && styles.modeChipCash,
                              ]}
                              onPress={() => handleUpdateRow(row.id, { paymentMode: mode })}
                            >
                              <Text
                                style={[
                                  styles.modeChipText,
                                  row.paymentMode === mode && styles.modeChipTextActive,
                                ]}
                              >
                                {mode}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Remarks */}
                      <View style={styles.remarksSection}>
                        <Text style={styles.smallLabel}>Remarks / Notes</Text>
                        <TextInput
                          style={styles.remarksInput}
                          placeholder="e.g. Paid via UPI ref #3829"
                          value={row.remarks}
                          onChangeText={(val) => handleUpdateRow(row.id, { remarks: val })}
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            {activeStep === 'capture' ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleParseRawText}
              >
                <Text style={styles.primaryBtnText}>Review Extracted Rows</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  extractedRows.length === 0 && { opacity: 0.5 },
                ]}
                onPress={handleConfirm}
                disabled={extractedRows.length === 0}
              >
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>
                  Import {extractedRows.length} Records
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
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
  stepperBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
  },
  stepItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stepItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  stepTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  imagePreviewBox: {
    position: 'relative',
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  patternInfoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 16,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  patternTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  patternBody: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  patternTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  ptag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ptagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  textAreaGroup: {
    marginBottom: 16,
  },
  textAreaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  sampleLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 100,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  parseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  parseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  reviewBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  reviewBannerSub: {
    fontSize: 11,
    color: '#065F46',
    marginTop: 2,
  },
  addManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addManualBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  emptyReview: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyReviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
  },
  emptyReviewSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  rowCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowIndexBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rowMonthText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  deleteRowBtn: {
    padding: 4,
  },
  rowInputsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  rowCol: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  rowInput: {
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  rowInputBold: {
    fontWeight: '700',
    color: '#059669',
  },
  modeSection: {
    marginBottom: 10,
  },
  modeChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeChipUPI: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  modeChipNEFT: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  modeChipCash: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeChipTextActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
  remarksSection: {},
  remarksInput: {
    height: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#0F172A',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  primaryBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
