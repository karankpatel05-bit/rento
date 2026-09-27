import React, { useState, useMemo } from 'react';
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
  AlertCircle,
  Calendar,
  IndianRupee,
  MessageSquare,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { Tenant } from '../types';
import { LogInterestModal } from '../components/tenants/LogInterestModal';
import { LogPaymentModal } from '../components/payments/LogPaymentModal';
import { calculateTenantRentSummary } from '../utils/duesCalculator';
import { NotificationService } from '../services/notifications';

interface AlertsScreenProps {
  onSelectTenant: (tenant: Tenant) => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ onSelectTenant }) => {
  const { alerts, tenants, payments, triggerTestMayNotification } = useApp();
  const [selectedTenantForRebate, setSelectedTenantForRebate] = useState<Tenant | null>(null);
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState<Tenant | null>(null);

  // Compute overdue tenants
  const overdueTenants = useMemo(() => {
    return tenants
      .filter((t) => t.active)
      .map((tenant) => {
        const summary = calculateTenantRentSummary(tenant, payments);
        return {
          tenant,
          summary,
        };
      })
      .filter((item) => item.summary.dueAmount > 0);
  }, [tenants, payments]);

  const pendingAlerts = alerts.filter((a) => !a.isResolved);
  const resolvedAlerts = alerts.filter((a) => a.isResolved);

  const handleTestOverdueNotification = async (tenant: Tenant, dueAmount: number, monthStr: string) => {
    await NotificationService.triggerOverdueRentNotification(tenant, monthStr, dueAmount, true);
    Alert.alert(
      'Overdue Notification Dispatched',
      `Sent push notification: "Rent Overdue: ${tenant.name} (${tenant.unitDesignation}) - ₹${dueAmount.toLocaleString()}"`
    );
  };

  const handleTestNotification = async (tenant: Tenant) => {
    await triggerTestMayNotification(tenant);
    Alert.alert(
      'Notification Dispatched',
      `Push notification scheduled locally: "Collect electricity deposit interest from ${tenant.name}."`
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Overdue Rent Reminders Section */}
      <View style={styles.overdueSection}>
        <View style={styles.sectionHeader}>
          <AlertCircle size={18} color="#DC2626" />
          <Text style={styles.overdueSectionTitle}>
            Overdue Rent Collections ({overdueTenants.length})
          </Text>
        </View>

        {overdueTenants.length === 0 ? (
          <View style={styles.noOverdueCard}>
            <CheckCircle2 size={22} color="#059669" />
            <Text style={styles.noOverdueText}>All property rents are up to date!</Text>
          </View>
        ) : (
          overdueTenants.map(({ tenant, summary }) => {
            const unbilledMonths = summary.unbilledAutoMonths || [];
            const monthsStr =
              unbilledMonths.length > 0
                ? unbilledMonths.map((m) => m.monthYear).join(', ')
                : 'Current period';

            return (
              <View key={tenant.id} style={styles.overdueCard}>
                <View style={styles.overdueCardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.overdueBadgeRow}>
                      <View style={styles.overdueUnitBadge}>
                        <Text style={styles.overdueUnitText}>{tenant.unitDesignation}</Text>
                      </View>
                      <Text style={styles.overdueTenantName}>{tenant.name}</Text>
                    </View>
                    <Text style={styles.overdueAddress}>{tenant.propertyAddress}</Text>
                  </View>

                  <View style={styles.overdueAmountBox}>
                    <Text style={styles.overdueAmountLabel}>Due to Collect</Text>
                    <Text style={styles.overdueAmount}>
                      ₹{summary.dueAmount.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {unbilledMonths.length > 0 && (
                  <View style={styles.overdueMonthStrip}>
                    <Calendar size={12} color="#DC2626" />
                    <Text style={styles.overdueMonthText}>Pending for: {monthsStr}</Text>
                  </View>
                )}

                {/* Quick Action Buttons */}
                <View style={styles.overdueActionRow}>
                  <TouchableOpacity
                    style={styles.overdueCollectBtn}
                    onPress={() => setSelectedTenantForPayment(tenant)}
                    activeOpacity={0.8}
                  >
                    <IndianRupee size={13} color="#FFFFFF" />
                    <Text style={styles.overdueCollectBtnText}>Collect Rent</Text>
                  </TouchableOpacity>

                  {tenant.phone ? (
                    <TouchableOpacity
                      style={styles.overdueWhatsAppBtn}
                      onPress={() =>
                        NotificationService.sendTenantWhatsAppReminder(
                          tenant.phone,
                          tenant.name,
                          tenant.unitDesignation,
                          summary.dueAmount,
                          monthsStr
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <MessageSquare size={13} color="#047857" />
                      <Text style={styles.overdueWhatsAppBtnText}>Send WhatsApp</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.overdueBellBtn}
                    onPress={() =>
                      handleTestOverdueNotification(tenant, summary.dueAmount, monthsStr)
                    }
                    activeOpacity={0.7}
                  >
                    <Bell size={13} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

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
            <Text style={styles.allDoneTitle}>
              {tenants.length === 0 ? 'No Active Reminders' : 'All May Rebates Collected!'}
            </Text>
            <Text style={styles.allDoneSub}>
              {tenants.length === 0
                ? 'When you register tenants with an electricity deposit, annual May 1st rebate alerts will appear here.'
                : 'All electricity deposit interests for this cycle have been logged and reconciled.'}
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

      {/* Modal to log overdue rent payment */}
      {selectedTenantForPayment && (
        <LogPaymentModal
          visible={!!selectedTenantForPayment}
          onClose={() => setSelectedTenantForPayment(null)}
          tenant={selectedTenantForPayment}
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
  overdueSection: {
    marginBottom: 20,
  },
  overdueSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noOverdueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
  },
  noOverdueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  overdueCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  overdueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  overdueBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overdueUnitBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueUnitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  overdueTenantName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  overdueAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  overdueAmountBox: {
    alignItems: 'flex-end',
  },
  overdueAmountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
    textTransform: 'uppercase',
  },
  overdueAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#DC2626',
  },
  overdueMonthStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  overdueMonthText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },
  overdueActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overdueCollectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  overdueCollectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  overdueWhatsAppBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  overdueWhatsAppBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  overdueBellBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
