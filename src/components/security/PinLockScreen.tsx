import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { ShieldCheck, Delete, KeyRound, AlertTriangle } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';

export const PinLockScreen: React.FC = () => {
  const { unlockApp, resetPinEmergency } = useApp();
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDigitPress = (digit: string) => {
    if (enteredPin.length >= 4) return;
    setErrorMessage(null);

    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    if (nextPin.length === 4) {
      // Validate automatically on 4th digit
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

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setErrorMessage(null);
      setEnteredPin(enteredPin.slice(0, -1));
    }
  };

  const handleClear = () => {
    setErrorMessage(null);
    setEnteredPin('');
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot Security PIN?',
      'Would you like to reset your app PIN? All of your property, tenant, and payment records will remain completely safe and untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset PIN',
          style: 'destructive',
          onPress: async () => {
            await resetPinEmergency();
            Alert.alert(
              'PIN Reset Successful',
              'Security PIN has been cleared. You can now access your records and set a new PIN in Security Settings anytime.'
            );
          },
        },
      ]
    );
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <View style={styles.container}>
      {/* Brand & Security Header */}
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

      {/* Error Feedback message */}
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

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        <View style={styles.keypadGrid}>
          {digits.map((digit) => (
            <TouchableOpacity
              key={digit}
              style={styles.keyBtn}
              onPress={() => handleDigitPress(digit)}
              activeOpacity={0.6}
            >
              <Text style={styles.keyText}>{digit}</Text>
            </TouchableOpacity>
          ))}

          {/* Bottom Row: Clear, 0, Backspace */}
          <TouchableOpacity
            style={styles.keyBtnAux}
            onPress={handleClear}
            activeOpacity={0.6}
          >
            <Text style={styles.keyAuxText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keyBtn}
            onPress={() => handleDigitPress('0')}
            activeOpacity={0.6}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keyBtnAux}
            onPress={handleDelete}
            activeOpacity={0.6}
          >
            <Delete size={22} color="#E2E8F0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Forgot PIN Option */}
      <TouchableOpacity
        style={styles.forgotBtn}
        onPress={handleForgotPin}
        activeOpacity={0.7}
      >
        <KeyRound size={14} color="#94A3B8" />
        <Text style={styles.forgotText}>Forgot PIN? Reset Safely</Text>
      </TouchableOpacity>
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
    marginTop: 20,
  },
  shieldIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 20,
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
  errorBox: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F87171',
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
    rowGap: 18,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
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
    color: '#94A3B8',
    fontWeight: '600',
  },
});
