import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Zap, ChevronRight, BellRing } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';

interface MayReminderBannerProps {
  onPress: () => void;
}

export const MayReminderBanner: React.FC<MayReminderBannerProps> = ({ onPress }) => {
  const { alerts } = useApp();
  const pendingMayAlerts = alerts.filter((a) => !a.isResolved);

  if (pendingMayAlerts.length === 0) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.leftIcon}>
        <Zap size={22} color="#D97706" />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>May Electricity Deposit Rebates</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingMayAlerts.length} Due</Text>
          </View>
        </View>
        <Text style={styles.description}>
          Tenants receive rebate on summer electricity bills. Tap to review and log collected interest.
        </Text>
      </View>
      <ChevronRight size={18} color="#B45309" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leftIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  badge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
});
