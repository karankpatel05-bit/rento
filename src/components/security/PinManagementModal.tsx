import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import * as Updates from 'expo-updates';
import {
  ShieldCheck,
  X,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Delete,
  RotateCcw,
  Trash2,
  Sparkles,
  RefreshCw,
  Mail,
} from 'lucide-react-native';
import { useApp } from '../../context/AppContext';

interface PinManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PinManagementModal: React.FC<PinManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    isPinSet,
    isPinEnabled,
    adminEmail,
    setupPin,
    changePin,
    togglePinEnabled,
    resetPinEmergency,
    clearAllData,
    lockApp,
  } = useApp();

  // Workflow steps: 'menu' | 'setup_pin' | 'confirm_pin' | 'verify_old' | 'enter_new' | 'confirm_new' | 'remove_verify_old'
  const [mode, setMode] = useState<
    'menu' | 'setup_pin' | 'confirm_pin' | 'verify_old' | 'enter_new' | 'confirm_new' | 'remove_verify_old'
  >('menu');

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [firstEnteredPin, setFirstEnteredPin] = useState<string>('');
  const [oldVerifiedPin, setOldVerifiedPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);

  const resetFlow = () => {
    setMode('menu');
    setEnteredPin('');
    setFirstEnteredPin('');
    setOldVerifiedPin('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetFlow();
    onClose();
  };

  const handleDigitPress = (digit: string) => {
    if (enteredPin.length >= 4) return;
    setErrorMessage(null);
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    if (nextPin.length === 4) {
      setTimeout(() => {
        handleFourDigitsEntered(nextPin);
      }, 100);
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setErrorMessage(null);
      setEnteredPin(enteredPin.slice(0, -1));
    }
  };

  const handleFourDigitsEntered = async (pin: string) => {
    if (mode === 'setup_pin') {
      setFirstEnteredPin(pin);
      setEnteredPin('');
      setMode('confirm_pin');
    } else if (mode === 'confirm_pin') {
      if (pin === firstEnteredPin) {
        await setupPin(pin);
        Alert.alert(
          'PIN Enabled',
          'Your 4-digit security PIN is active. Rento will now require this PIN whenever opened.'
        );
        resetFlow();
      } else {
        setErrorMessage('PINs do not match. Please try again.');
        setEnteredPin('');
      }
    } else if (mode === 'verify_old') {
      // Test old PIN by trying to change with dummy next
      // We will verify old PIN
      setOldVerifiedPin(pin);
      setEnteredPin('');
      setMode('enter_new');
    } else if (mode === 'enter_new') {
      setFirstEnteredPin(pin);
      setEnteredPin('');
      setMode('confirm_new');
    } else if (mode === 'confirm_new') {
      if (pin === firstEnteredPin) {
        const success = await changePin(oldVerifiedPin, pin);
        if (success) {
          Alert.alert('PIN Changed', 'Your security PIN has been updated successfully.');
          resetFlow();
        } else {
          setErrorMessage('Current PIN was incorrect. Please start over.');
          setEnteredPin('');
          setMode('verify_old');
        }
      } else {
        setErrorMessage('New PINs do not match. Try again.');
        setEnteredPin('');
      }
    } else if (mode === 'remove_verify_old') {
      const success = await changePin(pin, pin);
      if (success) {
        await resetPinEmergency();
        Alert.alert('PIN Removed', 'Security PIN protection has been disabled.');
        resetFlow();
      } else {
        Vibration.vibrate(Platform.OS === 'android' ? 100 : [0, 100]);
        setErrorMessage('Current PIN was incorrect. Please try again.');
        setEnteredPin('');
      }
    }
  };

  const handleToggleSwitch = async (val: boolean) => {
    if (val && !isPinSet) {
      // Must set up PIN first
      setMode('setup_pin');
      setEnteredPin('');
      return;
    }
    await togglePinEnabled(val);
  };

  const handleStartSetup = () => {
    setMode('setup_pin');
    setEnteredPin('');
    setFirstEnteredPin('');
    setErrorMessage(null);
  };

  const handleStartChange = () => {
    setMode('verify_old');
    setEnteredPin('');
    setFirstEnteredPin('');
    setOldVerifiedPin('');
    setErrorMessage(null);
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove Security PIN',
      `To remove your PIN protection, enter your current 4-digit PIN for authorization.\n\nIf you have forgotten your PIN, use the "Forgot PIN? Reset via Admin Email OTP" option on the lock screen (sent to ${adminEmail}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enter Current PIN',
          onPress: () => {
            setMode('remove_verify_old');
            setEnteredPin('');
            setErrorMessage(null);
          },
        },
      ]
    );
  };

  const handleResetAllData = () => {
    Alert.alert(
      '⚠️ Reset All App Data?',
      'WARNING: This will permanently delete ALL properties, tenants, payments, security deposits, and history on this device.\n\nThis cannot be undone. Are you sure you want to reset everything?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete All Data',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Reset Complete', 'All property and tenant data has been reset.');
            handleClose();
          },
        },
      ]
    );
  };

  const handleLockNow = () => {
    handleClose();
    setTimeout(() => {
      lockApp();
    }, 150);
  };

  const handleCheckAppUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      if (__DEV__ || !Updates.isEnabled) {
        Alert.alert(
          'Standalone Feature',
          'OTA updates apply on installed release APK builds. In development mode, changes reload immediately via Metro.'
        );
        return;
      }
      const check = await Updates.checkForUpdateAsync();
      if (check.isAvailable) {
        Alert.alert(
          'Update Found!',
          'A new update is available. Do you want to download and restart now to apply it?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Download & Restart',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Up to Date',
          'Your app is already running the latest version!'
        );
      }
    } catch (err: any) {
      console.warn('Update check error:', err);
      Alert.alert(
        'Update Check',
        'Could not complete online check. If an update was recently pushed, swipe Rento closed from your recent apps and reopen it to apply.'
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleRestartApp = async () => {
    try {
      await Updates.reloadAsync();
    } catch (err) {
      Alert.alert(
        'Restarting App',
        'To restart on your device: open your recent apps screen, swipe Rento away, and reopen it.'
      );
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const getStepTitle = () => {
    switch (mode) {
      case 'setup_pin':
        return 'Create a 4-Digit PIN';
      case 'confirm_pin':
        return 'Confirm your 4-Digit PIN';
      case 'verify_old':
        return 'Enter Current PIN';
      case 'remove_verify_old':
        return 'Enter Current PIN to Remove';
      case 'enter_new':
        return 'Enter New 4-Digit PIN';
      case 'confirm_new':
        return 'Confirm New 4-Digit PIN';
      default:
        return 'App Security & PIN Lock';
    }
  };

  const getStepSubtitle = () => {
    switch (mode) {
      case 'setup_pin':
        return 'Choose a memorable 4-digit code to protect your data.';
      case 'confirm_pin':
        return 'Re-enter the same 4-digit code to confirm.';
      case 'verify_old':
        return 'Enter your existing PIN before changing.';
      case 'remove_verify_old':
        return 'Enter your existing 4-digit code to disable PIN protection.';
      case 'enter_new':
        return 'Choose your new 4-digit code.';
      case 'confirm_new':
        return 'Re-enter your new PIN to confirm.';
      default:
        return 'Require a 4-digit PIN every time Rento is opened.';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <ShieldCheck size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.title}>{getStepTitle()}</Text>
                <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* MAIN MENU */}
          {mode === 'menu' ? (
            <ScrollView style={styles.menuBody} showsVerticalScrollIndicator={false}>
              {/* Status Banner */}
              <View
                style={[
                  styles.statusCard,
                  isPinSet && isPinEnabled ? styles.statusCardActive : styles.statusCardInactive,
                ]}
              >
                <View style={styles.statusLeft}>
                  {isPinSet && isPinEnabled ? (
                    <Lock size={22} color="#047857" />
                  ) : (
                    <Unlock size={22} color="#B45309" />
                  )}
                  <View>
                    <Text style={styles.statusTitle}>
                      {isPinSet && isPinEnabled ? 'PIN Protection Active' : 'App Lock Disabled'}
                    </Text>
                    <Text style={styles.statusDesc}>
                      {isPinSet && isPinEnabled
                        ? 'App locks when launched or returning from background.'
                        : 'Anyone with access to your phone can open Rento.'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isPinEnabled}
                  onValueChange={handleToggleSwitch}
                  thumbColor="#FFFFFF"
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                />
              </View>

              {/* Authorized Admin Email Card */}
              <View style={styles.adminEmailCard}>
                <View style={styles.adminEmailLeft}>
                  <View style={styles.adminEmailIcon}>
                    <Mail size={16} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminEmailLabel}>AUTHORIZED ADMIN EMAIL</Text>
                    <Text style={styles.adminEmailValue}>{adminEmail}</Text>
                    <Text style={styles.adminEmailSub}>
                      All PIN reset OTPs are strictly dispatched to this email address.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionList}>
                {!isPinSet ? (
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={handleStartSetup}
                    activeOpacity={0.8}
                  >
                    <KeyRound size={18} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Set Up 4-Digit PIN Now</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.actionItem}
                      onPress={handleStartChange}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionItemLeft}>
                        <KeyRound size={18} color="#4338CA" />
                        <View>
                          <Text style={styles.actionItemTitle}>Change PIN</Text>
                          <Text style={styles.actionItemSub}>
                            Update your existing 4-digit code
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isPinEnabled && (
                      <TouchableOpacity
                        style={styles.actionItem}
                        onPress={handleLockNow}
                        activeOpacity={0.7}
                      >
                        <View style={styles.actionItemLeft}>
                          <Lock size={18} color="#047857" />
                          <View>
                            <Text style={styles.actionItemTitle}>Lock App Now</Text>
                            <Text style={styles.actionItemSub}>
                              Test your lock screen immediately
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionItem, styles.actionItemAmber]}
                      onPress={handleRemovePin}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionItemLeft}>
                        <RotateCcw size={18} color="#D97706" />
                        <View>
                          <Text style={[styles.actionItemTitle, { color: '#B45309' }]}>
                            Reset Security PIN
                          </Text>
                          <Text style={styles.actionItemSub}>
                            Clears 4-digit code (keeps tenant data 100% safe)
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </>
                )}

                {/* Live App OTA Updates & App Reset Section */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>APP UPDATES & REBOOT</Text>
                </View>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleCheckAppUpdate}
                  disabled={isCheckingUpdate}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionItemLeft}>
                    {isCheckingUpdate ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <Sparkles size={18} color="#059669" />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionItemTitle}>Check for App Updates</Text>
                      <Text style={styles.actionItemSub}>
                        {isCheckingUpdate
                          ? 'Checking EAS servers for new release...'
                          : 'Download newest updates over-the-air'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleRestartApp}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionItemLeft}>
                    <RefreshCw size={18} color="#0284C7" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionItemTitle}>Restart / Reset App (Apply OTA)</Text>
                      <Text style={styles.actionItemSub}>
                        Reloads app code to apply downloaded updates
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionItem, styles.actionItemDanger]}
                  onPress={handleResetAllData}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionItemLeft}>
                    <Trash2 size={18} color="#DC2626" />
                    <View>
                      <Text style={[styles.actionItemTitle, { color: '#DC2626' }]}>
                        Reset All App Data
                      </Text>
                      <Text style={styles.actionItemSub}>
                        Permanently wipe properties and start fresh
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Safe Persistence Note */}
              <View style={styles.safeNote}>
                <CheckCircle2 size={15} color="#059669" />
                <Text style={styles.safeNoteText}>
                  Your properties, tenants, and payment records are saved offline on this phone and remain 100% safe across PIN changes or app updates.
                </Text>
              </View>
            </ScrollView>
          ) : (
            /* PIN ENTRY KEYPAD SCREEN */
            <View style={styles.keypadBody}>
              {/* PIN Dots */}
              <View style={styles.dotsRow}>
                {[0, 1, 2, 3].map((idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx < enteredPin.length && styles.dotFilled,
                      errorMessage ? styles.dotError : null,
                    ]}
                  />
                ))}
              </View>

              {/* Error Box */}
              <View style={styles.messageBox}>
                {errorMessage ? (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                ) : (
                  <Text style={styles.stepHint}>
                    {mode === 'setup_pin' && 'Enter 4 digits'}
                    {mode === 'confirm_pin' && 'Confirm your code'}
                    {mode === 'verify_old' && 'Enter current PIN to verify'}
                    {mode === 'enter_new' && 'Enter new 4 digits'}
                    {mode === 'confirm_new' && 'Confirm new 4 digits'}
                  </Text>
                )}
              </View>

              {/* Number Grid */}
              <View style={styles.keypadGrid}>
                {digits.map((digit) => (
                  <TouchableOpacity
                    key={digit}
                    style={styles.numberKey}
                    onPress={() => handleDigitPress(digit)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.numberText}>{digit}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.auxKey}
                  onPress={resetFlow}
                  activeOpacity={0.6}
                >
                  <Text style={styles.auxText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.numberKey}
                  onPress={() => handleDigitPress('0')}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numberText}>0</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.auxKey}
                  onPress={handleDelete}
                  activeOpacity={0.6}
                >
                  <Delete size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
    fontSize: 16,
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
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  menuBody: {
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  statusCardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusCardInactive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  adminEmailCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  adminEmailLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  adminEmailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  adminEmailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  adminEmailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C4A6E',
    marginTop: 2,
  },
  adminEmailSub: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 15,
  },
  actionList: {
    gap: 10,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  actionItemDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionItemAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  safeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 12,
  },
  safeNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },
  keypadBody: {
    padding: 24,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
  },
  dotFilled: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#FCA5A5',
  },
  messageBox: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  stepHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 280,
    rowGap: 14,
  },
  numberKey: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  auxKey: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
