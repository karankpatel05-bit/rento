import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Vibration,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import {
  ShieldCheck,
  Delete,
  KeyRound,
  AlertTriangle,
  RotateCcw,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Lock,
  RefreshCw,
} from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { EmailService } from '../../services/emailService';

type LockScreenMode = 'pin' | 'email_challenge' | 'otp_verify' | 'new_pin' | 'confirm_pin';

export const PinLockScreen: React.FC = () => {
  const { unlockApp, adminEmail, resetPinWithOtp } = useApp();

  const [mode, setMode] = useState<LockScreenMode>('pin');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email challenge state
  const [enteredEmail, setEnteredEmail] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);

  // OTP Verification state
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpExpiryTime, setOtpExpiryTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // New PIN setup state
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');

  // 1-second interval timer for OTP countdown
  useEffect(() => {
    let interval: any = null;
    if (mode === 'otp_verify') {
      interval = setInterval(() => {
        if (otpExpiryTime) {
          const diff = Math.max(0, Math.floor((otpExpiryTime - Date.now()) / 1000));
          setRemainingSeconds(diff);
          if (diff <= 0) {
            setErrorMessage('OTP has expired. Please request a new one.');
          }
        }
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, otpExpiryTime]);

  const resetAllFlows = () => {
    setMode('pin');
    setEnteredPin('');
    setEnteredEmail('');
    setEnteredOtp('');
    setGeneratedOtp(null);
    setOtpExpiryTime(null);
    setNewPin('');
    setConfirmPin('');
    setErrorMessage(null);
  };

  // -------------------------------------------------------------
  // 1. PIN PAD HANDLERS (Standard Unlock)
  // -------------------------------------------------------------
  const handlePinDigit = (digit: string) => {
    if (enteredPin.length >= 4) return;
    setErrorMessage(null);

    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    if (nextPin.length === 4) {
      setTimeout(() => {
        const success = unlockApp(nextPin);
        if (!success) {
          Vibration.vibrate(Platform.OS === 'android' ? 100 : [0, 100]);
          setErrorMessage('Incorrect PIN. Please try again.');
          setEnteredPin('');
        }
      }, 100);
    }
  };

  const handlePinDelete = () => {
    if (enteredPin.length > 0) {
      setErrorMessage(null);
      setEnteredPin(enteredPin.slice(0, -1));
    }
  };

  // -------------------------------------------------------------
  // 2. ADMIN EMAIL CHALLENGE HANDLERS
  // -------------------------------------------------------------
  const handleInitiateReset = () => {
    setErrorMessage(null);
    setEnteredEmail('');
    setMode('email_challenge');
  };

  const handleSendOtp = async () => {
    const trimmed = enteredEmail.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your admin email ID.');
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);

    try {
      // 1. Verify that entered email strictly matches the registered administrator email
      const isAuthorized = await EmailService.verifyAdminEmail(trimmed);

      if (!isAuthorized) {
        Vibration.vibrate(Platform.OS === 'android' ? 150 : [0, 150]);
        setErrorMessage(
          '❌ Unauthorized Email: The entered email ID does NOT match the registered admin account. OTP was not sent.'
        );
        setIsSendingOtp(false);
        return;
      }

      // 2. Generate secure 6-digit OTP
      const otp = EmailService.generateOtp();
      setGeneratedOtp(otp);

      // Set 5-minute expiry (300 seconds)
      const expiry = Date.now() + 5 * 60 * 1000;
      setOtpExpiryTime(expiry);
      setRemainingSeconds(300);
      setResendCooldown(30);

      // 3. Dispatch OTP via Email Gateway
      const result = await EmailService.sendOtpEmail(trimmed, otp);

      setIsSendingOtp(false);
      setEnteredOtp('');
      setMode('otp_verify');

      Alert.alert(
        'OTP Sent!',
        `A 6-digit verification code has been dispatched to ${EmailService.maskEmail(trimmed)}. Please check your inbox and spam folder.`
      );
    } catch (err: any) {
      setIsSendingOtp(false);
      setErrorMessage('Failed to send OTP. Please check your internet connection.');
    }
  };

  // -------------------------------------------------------------
  // 3. OTP VERIFICATION HANDLERS
  // -------------------------------------------------------------
  const handleOtpDigit = (digit: string) => {
    if (enteredOtp.length >= 6) return;
    setErrorMessage(null);

    const nextOtp = enteredOtp + digit;
    setEnteredOtp(nextOtp);

    if (nextOtp.length === 6) {
      setTimeout(() => {
        // Check expiration
        if (otpExpiryTime && Date.now() > otpExpiryTime) {
          Vibration.vibrate(Platform.OS === 'android' ? 120 : [0, 120]);
          setErrorMessage('OTP has expired. Tap Resend OTP to get a new code.');
          setEnteredOtp('');
          return;
        }

        // Validate OTP
        if (nextOtp === generatedOtp) {
          // Success! Move to new PIN setup
          setErrorMessage(null);
          setNewPin('');
          setConfirmPin('');
          setMode('new_pin');
        } else {
          Vibration.vibrate(Platform.OS === 'android' ? 120 : [0, 120]);
          setErrorMessage('❌ Invalid OTP code. Please check your email and try again.');
          setEnteredOtp('');
        }
      }, 100);
    }
  };

  const handleOtpDelete = () => {
    if (enteredOtp.length > 0) {
      setErrorMessage(null);
      setEnteredOtp(enteredOtp.slice(0, -1));
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsSendingOtp(true);
    setErrorMessage(null);

    try {
      const otp = EmailService.generateOtp();
      setGeneratedOtp(otp);

      const expiry = Date.now() + 5 * 60 * 1000;
      setOtpExpiryTime(expiry);
      setRemainingSeconds(300);
      setResendCooldown(30);

      await EmailService.sendOtpEmail(adminEmail, otp);
      setIsSendingOtp(false);
      setEnteredOtp('');

      Alert.alert(
        'New OTP Sent',
        `A fresh code has been sent to ${EmailService.maskEmail(adminEmail)}.`
      );
    } catch (err) {
      setIsSendingOtp(false);
      setErrorMessage('Could not resend OTP. Check your internet connection.');
    }
  };

  // -------------------------------------------------------------
  // 4. NEW PIN CREATION & CONFIRMATION
  // -------------------------------------------------------------
  const handleNewPinDigit = (digit: string) => {
    if (newPin.length >= 4) return;
    setErrorMessage(null);

    const next = newPin + digit;
    setNewPin(next);

    if (next.length === 4) {
      setTimeout(() => {
        setConfirmPin('');
        setMode('confirm_pin');
      }, 120);
    }
  };

  const handleNewPinDelete = () => {
    if (newPin.length > 0) {
      setNewPin(newPin.slice(0, -1));
    }
  };

  const handleConfirmPinDigit = (digit: string) => {
    if (confirmPin.length >= 4) return;
    setErrorMessage(null);

    const next = confirmPin + digit;
    setConfirmPin(next);

    if (next.length === 4) {
      setTimeout(async () => {
        if (next === newPin) {
          // PIN match confirmed! Save & unlock app safely
          await resetPinWithOtp(newPin);
          Alert.alert(
            '✅ Security PIN Updated',
            'Your new 4-digit PIN has been saved. Your app is now unlocked and all data is 100% safe.'
          );
          resetAllFlows();
        } else {
          Vibration.vibrate(Platform.OS === 'android' ? 120 : [0, 120]);
          setErrorMessage('PINs do not match. Please choose your new PIN again.');
          setNewPin('');
          setConfirmPin('');
          setMode('new_pin');
        }
      }, 120);
    }
  };

  const handleConfirmPinDelete = () => {
    if (confirmPin.length > 0) {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* SCREEN 1: NORMAL 4-DIGIT PIN LOCK                         */}
      {/* ========================================================= */}
      {mode === 'pin' && (
        <>
          <View style={styles.header}>
            <View style={styles.shieldIconContainer}>
              <ShieldCheck size={42} color="#10B981" />
            </View>
            <Text style={styles.appTitle}>Rento Security</Text>
            <Text style={styles.subtitle}>Enter your 4-digit PIN to access property data</Text>
          </View>

          {/* 4 PIN Dots */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < enteredPin.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    isFilled && styles.dotFilled,
                    errorMessage ? styles.dotError : null,
                  ]}
                />
              );
            })}
          </View>

          {/* Error Message */}
          <View style={styles.errorBox}>
            {errorMessage ? (
              <View style={styles.errorRow}>
                <AlertTriangle size={14} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderNotice}>Rento is locked for your privacy</Text>
            )}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            <View style={styles.keypadGrid}>
              {digits.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={styles.keyBtn}
                  onPress={() => handlePinDigit(digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{digit}</Text>
                </TouchableOpacity>
              ))}

              {/* Bottom Row: Reset PIN (Triggers Email & OTP flow - NEVER unlocks directly) */}
              <TouchableOpacity
                style={[styles.keyBtnAux, styles.keyBtnReset]}
                onPress={handleInitiateReset}
                activeOpacity={0.6}
              >
                <RotateCcw size={16} color="#F59E0B" />
                <Text style={styles.keyResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.keyBtn}
                onPress={() => handlePinDigit('0')}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.keyBtnAux}
                onPress={handlePinDelete}
                activeOpacity={0.6}
              >
                <Delete size={22} color="#E2E8F0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Bar: Secure Reset Link */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleInitiateReset}
              activeOpacity={0.7}
            >
              <RotateCcw size={14} color="#FCD34D" />
              <Text style={styles.forgotText}>Forgot PIN? Reset via Admin Email OTP</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ========================================================= */}
      {/* SCREEN 2: ADMIN EMAIL VERIFICATION CHALLENGE              */}
      {/* ========================================================= */}
      {mode === 'email_challenge' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.challengeContainer}
        >
          <ScrollView
            contentContainerStyle={styles.challengeScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={[styles.shieldIconContainer, styles.shieldIconAmber]}>
                <Mail size={38} color="#F59E0B" />
              </View>
              <Text style={styles.appTitle}>Admin Email Verification</Text>
              <Text style={styles.subtitle}>
                Security Locked: Enter your registered Admin Email ID. An OTP will ONLY be sent if the email matches.
              </Text>
            </View>

            <View style={styles.emailCard}>
              <Text style={styles.inputLabel}>REGISTERED ADMIN EMAIL</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#64748B" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.emailInput}
                  placeholder="Enter admin email (e.g. karankpatel05@...)"
                  placeholderTextColor="#64748B"
                  value={enteredEmail}
                  onChangeText={(val) => {
                    setEnteredEmail(val);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              {errorMessage && (
                <View style={[styles.errorRow, { marginTop: 12 }]}>
                  <AlertTriangle size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, isSendingOtp && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={isSendingOtp}
                activeOpacity={0.8}
              >
                {isSendingOtp ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Mail size={16} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Send Verification OTP</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelGhostBtn}
                onPress={resetAllFlows}
                activeOpacity={0.7}
              >
                <ArrowLeft size={16} color="#94A3B8" />
                <Text style={styles.cancelGhostText}>Cancel & Return to Lock</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.securityWarningCard}>
              <Lock size={15} color="#94A3B8" />
              <Text style={styles.securityWarningText}>
                Unauthorized users cannot bypass this lock. Tenant data remains completely shielded offline.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ========================================================= */}
      {/* SCREEN 3: 6-DIGIT OTP VERIFICATION                        */}
      {/* ========================================================= */}
      {mode === 'otp_verify' && (
        <>
          <View style={styles.header}>
            <View style={[styles.shieldIconContainer, styles.shieldIconBlue]}>
              <KeyRound size={38} color="#38BDF8" />
            </View>
            <Text style={styles.appTitle}>Enter 6-Digit OTP</Text>
            <Text style={styles.subtitle}>
              Code dispatched to {EmailService.maskEmail(enteredEmail || adminEmail)}.
            </Text>

            {/* Countdown Badge */}
            <View style={styles.timerBadge}>
              <Clock size={13} color="#38BDF8" />
              <Text style={styles.timerText}>
                Expires in: <Text style={{ fontWeight: '800' }}>{formatTimer(remainingSeconds)}</Text>
              </Text>
            </View>
          </View>

          {/* 6 OTP Boxes */}
          <View style={styles.otpBoxesRow}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = enteredOtp[index];
              const isCurrent = index === enteredOtp.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    isCurrent ? styles.otpBoxActive : null,
                    errorMessage ? styles.otpBoxError : null,
                  ]}
                >
                  <Text style={styles.otpBoxText}>{digit || ''}</Text>
                </View>
              );
            })}
          </View>

          {/* Error Feedback */}
          <View style={styles.errorBox}>
            {errorMessage ? (
              <View style={styles.errorRow}>
                <AlertTriangle size={14} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderNotice}>Check your inbox and spam folder</Text>
            )}
          </View>

          {/* Numeric Keypad for OTP */}
          <View style={styles.keypad}>
            <View style={styles.keypadGrid}>
              {digits.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={styles.keyBtn}
                  onPress={() => handleOtpDigit(digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{digit}</Text>
                </TouchableOpacity>
              ))}

              {/* Bottom Row */}
              <TouchableOpacity
                style={styles.keyBtnAux}
                onPress={resetAllFlows}
                activeOpacity={0.6}
              >
                <ArrowLeft size={18} color="#94A3B8" />
                <Text style={styles.keyAuxText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.keyBtn}
                onPress={() => handleOtpDigit('0')}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.keyBtnAux}
                onPress={handleOtpDelete}
                activeOpacity={0.6}
              >
                <Delete size={22} color="#E2E8F0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Resend OTP Row */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.resendBtn, resendCooldown > 0 && styles.btnDisabled]}
              onPress={handleResendOtp}
              disabled={resendCooldown > 0}
              activeOpacity={0.7}
            >
              <RefreshCw size={13} color={resendCooldown > 0 ? '#64748B' : '#38BDF8'} />
              <Text
                style={[
                  styles.resendText,
                  resendCooldown > 0 ? { color: '#64748B' } : { color: '#38BDF8' },
                ]}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend OTP to Email'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ========================================================= */}
      {/* SCREEN 4: SET NEW 4-DIGIT PIN                             */}
      {/* ========================================================= */}
      {mode === 'new_pin' && (
        <>
          <View style={styles.header}>
            <View style={[styles.shieldIconContainer, styles.shieldIconIndigo]}>
              <KeyRound size={40} color="#818CF8" />
            </View>
            <Text style={styles.appTitle}>Create New PIN</Text>
            <Text style={styles.subtitle}>Identity verified! Enter your new 4-digit code.</Text>
          </View>

          {/* 4 Dots */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index < newPin.length && styles.dotFilled,
                  errorMessage ? styles.dotError : null,
                ]}
              />
            ))}
          </View>

          <View style={styles.errorBox}>
            {errorMessage && (
              <View style={styles.errorRow}>
                <AlertTriangle size={14} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            <View style={styles.keypadGrid}>
              {digits.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={styles.keyBtn}
                  onPress={() => handleNewPinDigit(digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{digit}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.keyBtnAux} />

              <TouchableOpacity
                style={styles.keyBtn}
                onPress={() => handleNewPinDigit('0')}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.keyBtnAux}
                onPress={handleNewPinDelete}
                activeOpacity={0.6}
              >
                <Delete size={22} color="#E2E8F0" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity onPress={resetAllFlows}>
              <Text style={styles.cancelGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ========================================================= */}
      {/* SCREEN 5: CONFIRM NEW 4-DIGIT PIN                         */}
      {/* ========================================================= */}
      {mode === 'confirm_pin' && (
        <>
          <View style={styles.header}>
            <View style={[styles.shieldIconContainer, styles.shieldIconGreen]}>
              <CheckCircle2 size={40} color="#10B981" />
            </View>
            <Text style={styles.appTitle}>Confirm New PIN</Text>
            <Text style={styles.subtitle}>Re-enter the 4 digits to confirm and activate.</Text>
          </View>

          {/* 4 Dots */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index < confirmPin.length && styles.dotFilled,
                  errorMessage ? styles.dotError : null,
                ]}
              />
            ))}
          </View>

          <View style={styles.errorBox}>
            {errorMessage && (
              <View style={styles.errorRow}>
                <AlertTriangle size={14} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            <View style={styles.keypadGrid}>
              {digits.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={styles.keyBtn}
                  onPress={() => handleConfirmPinDigit(digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{digit}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.keyBtnAux} />

              <TouchableOpacity
                style={styles.keyBtn}
                onPress={() => handleConfirmPinDigit('0')}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.keyBtnAux}
                onPress={handleConfirmPinDelete}
                activeOpacity={0.6}
              >
                <Delete size={22} color="#E2E8F0" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity onPress={() => setMode('new_pin')}>
              <Text style={styles.cancelGhostText}>Back to re-enter PIN</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    zIndex: 99999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 15,
  },
  shieldIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  shieldIconAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    shadowColor: '#F59E0B',
  },
  shieldIconBlue: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    shadowColor: '#38BDF8',
  },
  shieldIconIndigo: {
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    borderColor: 'rgba(129, 140, 248, 0.35)',
    shadowColor: '#818CF8',
  },
  shieldIconGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    shadowColor: '#10B981',
  },
  appTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 18,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  timerText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
    justifyContent: 'center',
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  otpBoxActive: {
    borderColor: '#0284C7',
    borderWidth: 2,
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  otpBoxText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  errorBox: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F87171',
    textAlign: 'center',
  },
  placeholderNotice: {
    fontSize: 12,
    color: '#64748B',
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    rowGap: 16,
  },
  keyBtn: {
    width: '28%',
    aspectRatio: 1,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  keyBtnAux: {
    width: '28%',
    aspectRatio: 1,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyAuxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  keyBtnReset: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  keyResetText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 2,
  },
  bottomBar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  forgotText: {
    fontSize: 12,
    color: '#FCD34D',
    fontWeight: '700',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  resendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Email Challenge Specific Styles
  challengeContainer: {
    flex: 1,
    width: '100%',
  },
  challengeScroll: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  emailCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emailInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 18,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  securityWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    borderRadius: 14,
    maxWidth: 340,
    marginTop: 20,
  },
  securityWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
});
