import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Zap,
  CheckCircle2,
  Clock,
  Bell,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { Tenant } from '../types';
import { LogInterestModal } from '../components/tenants/LogInterestModal';

interface AlertsScreenProps {
  onSelectTenant: (tenant: Tenant) => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ onSelectTenant }) => {
  const { alerts, tenants, triggerTestMayNotification } = useApp();
  const [selectedTenantForRebate, setSelectedTenantForRebate] = useState<Tenant | null>(null);

  const pendingAlerts = alerts.filter((a) => !a.isResolved);
  const resolvedAlerts = alerts.filter((a) => a.isResolved);

  const handleTestNotification = async (tenant: Tenant) => {
    await triggerTestMayNotification(tenant);
    Alert.alert(
      'Notification Dispatched',
      `Push notification scheduled locally: "Collect electricity deposit interest from ${tenant.name}."`
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Intro Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Zap size={24} color="#D97706" />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Annual May Electricity Rebate</Text>
          <Text style={styles.bannerSubtitle}>
            Every year on May 1st, landlords are reminded to collect the interest rebate given
            by state electricity boards on the owner's security deposit.
          </Text>
        </View>
      </View>

      {/* Active Alerts Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Clock size={16} color="#D97706" />
          <Text style={styles.sectionTitle}>
            Action Required for May ({pendingAlerts.length})
          </Text>
        </View>

        {pendingAlerts.length === 0 ? (
          <View style={styles.allDoneCard}>
            <CheckCircle2 size={32} color="#059669" />
            <Text style={styles.allDoneTitle}>All May Rebates Collected!</Text>
            <Text style={styles.allDoneSub}>
              All electricity deposit interests for this cycle have been logged and reconciled.
            </Text>
          </View>
        ) : (
          pendingAlerts.map((alert) => {
            const tenant = tenants.find((t) => t.id === alert.tenantId);
            if (!tenant) return null;

            return (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertCardHeader}>
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>Due May 1st</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.pushTestBtn}
                    onPress={() => handleTestNotification(tenant)}
                  >
                    <Bell size={13} color="#D97706" />
                    <Text style={styles.pushTestBtnText}>Test Push Alert</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.alertCardTitle}>{alert.title}</Text>
                <Text style={styles.alertTenant}>
                  {alert.tenantName} • {alert.propertyAddress}
                </Text>

                <View style={styles.depositInfoBox}>
                  <Text style={styles.depositInfoLabel}>Owner Security Deposit:</Text>
                  <Text style={styles.depositInfoValue}>
                    ₹{alert.depositAmount.toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.alertMessage}>{alert.message}</Text>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.collectBtn}
                    onPress={() => setSelectedTenantForRebate(tenant)}
                  >
                    <Zap size={14} color="#FFFFFF" />
                    <Text style={styles.collectBtnText}>Log Collection</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={() => onSelectTenant(tenant)}
                  >
                    <Text style={styles.profileBtnText}>View Tenant Ledger</Text>
                    <ArrowRight size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle2 size={16} color="#059669" />
            <Text style={[styles.sectionTitle, { color: '#047857' }]}>
              Completed This Year ({resolvedAlerts.length})
            </Text>
          </View>

          {resolvedAlerts.map((alert) => {
            const tenant = tenants.find((t) => t.id === alert.tenantId);
            return (
              <View key={alert.id} style={styles.resolvedCard}>
                <View style={styles.resolvedLeft}>
                  <CheckCircle2 size={18} color="#059669" />
                  <View>
                    <Text style={styles.resolvedTenant}>{alert.tenantName}</Text>
                    <Text style={styles.resolvedProperty}>{alert.propertyAddress}</Text>
                  </View>
                </View>
                {tenant && (
                  <TouchableOpacity
                    style={styles.resolvedViewBtn}
                    onPress={() => onSelectTenant(tenant)}
                  >
                    <Text style={styles.resolvedViewBtnText}>View</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 60 }} />

      {/* Modal to log interest collection */}
      {selectedTenantForRebate && (
        <LogInterestModal
          visible={!!selectedTenantForRebate}
          onClose={() => setSelectedTenantForRebate(null)}
          tenant={selectedTenantForRebate}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  banner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 4,
    lineHeight: 17,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  allDoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  allDoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 8,
  },
  allDoneSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  pushTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pushTestBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  alertCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  alertTenant: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  depositInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  depositInfoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  depositInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  alertMessage: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  collectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: 10,
  },
  collectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    justifyContent: 'center',
  },
  profileBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  resolvedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  resolvedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  resolvedTenant: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  resolvedProperty: {
    fontSize: 11,
    color: '#64748B',
  },
  resolvedViewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  resolvedViewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
