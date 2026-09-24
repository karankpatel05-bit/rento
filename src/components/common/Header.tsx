import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, Lock, Unlock, ShieldCheck } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenAlerts?: () => void;
  onOpenSecurity?: () => void;
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenAlerts,
  onOpenSecurity,
  activeTab,
}) => {
  const { alerts, isPinSet, isPinEnabled } = useApp();
  const unresolvedAlertsCount = alerts.filter((a) => !a.isResolved).length;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Active</Text>
          </View>
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.rightActions}>
        {onOpenSecurity && (
          <TouchableOpacity
            style={[
              styles.securityButton,
              isPinSet && isPinEnabled && styles.securityButtonActive,
            ]}
            onPress={onOpenSecurity}
            activeOpacity={0.7}
          >
            {isPinSet && isPinEnabled ? (
              <Lock size={17} color="#047857" />
            ) : (
              <Unlock size={17} color="#94A3B8" />
            )}
          </TouchableOpacity>
        )}

        {onOpenAlerts && (
          <TouchableOpacity
            style={[styles.bellButton, activeTab === 'alerts' && styles.bellButtonActive]}
            onPress={onOpenAlerts}
            activeOpacity={0.7}
          >
            <Bell size={18} color={activeTab === 'alerts' ? '#059669' : '#334155'} />
            {unresolvedAlertsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unresolvedAlertsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  bellButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  securityButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
});
