import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  Building2,
  Plus,
  Search,
  IndianRupee,
  Wrench,
  CheckCircle,
  Users,
  RotateCcw,
  Sparkles,
  Scale,
  AlertCircle,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { Tenant } from '../types';
import { TenantCard } from '../components/tenants/TenantCard';
import { MayReminderBanner } from '../components/alerts/MayReminderBanner';
import { LogPaymentModal } from '../components/payments/LogPaymentModal';
import { TenantOnboardingModal } from '../components/tenants/TenantOnboardingModal';
import { calculatePropertyOverviewSummary } from '../utils/duesCalculator';

interface DashboardScreenProps {
  onSelectTenant: (tenant: Tenant) => void;
  onNavigateToAlerts: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onSelectTenant,
  onNavigateToAlerts,
}) => {
  const {
    tenants,
    payments,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'flexible' | 'fixed' | 'variable'>('all');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState<Tenant | null>(null);

  // Financial calculations across all properties
  const portfolio = useMemo(() => {
    return calculatePropertyOverviewSummary(tenants, payments);
  }, [tenants, payments]);

  // Filtered tenants list
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.unitDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'flexible') {
        return Boolean(tenant.isFlexiblePayer || tenant.paymentPlanType === 'flexible');
      }
      if (activeFilter === 'fixed') {
        return !tenant.isFlexiblePayer && tenant.paymentPlanType !== 'flexible';
      }
      if (activeFilter === 'variable') {
        return tenant.maintenanceWorkflow === 'variable_rent_deduction';
      }
      return true;
    });
  }, [tenants, searchQuery, activeFilter]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* May Reminder Banner (Automated May alert notification anchor) */}
        <MayReminderBanner onPress={onNavigateToAlerts} />

        {/* Landlord Financial Overview Cards */}
        <View style={styles.metricsContainer}>
          <View style={[styles.metricCard, styles.metricCardPrimary]}>
            <Text style={styles.metricLabel}>Expected Monthly Rent</Text>
            <Text style={styles.metricValue}>₹{portfolio.totalExpectedMonthly.toLocaleString()}</Text>
            <Text style={styles.metricSub}>
              {tenants.length} Properties • {portfolio.totalFlexibleTenants} Flexible Payers
            </Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricCardMini, styles.metricCardEmerald]}>
              <View style={styles.miniLabelRow}>
                <CheckCircle size={14} color="#047857" />
                <Text style={styles.metricMiniLabel}>Total Collected</Text>
              </View>
              <Text style={styles.metricMiniValue}>
                ₹{portfolio.totalCollected.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.metricCardMini, styles.metricCardIndigo]}>
              <View style={styles.miniLabelRow}>
                <Scale size={14} color="#4338CA" />
                <Text style={styles.metricMiniLabel}>Rent Calculated</Text>
              </View>
              <Text style={styles.metricMiniValueIndigo}>
                ₹{portfolio.totalCalculatedRent.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Outstanding Dues Banner if any difference exists */}
          {portfolio.totalOutstandingDues > 0 && (
            <View style={styles.duesOverviewBanner}>
              <AlertCircle size={16} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.duesOverviewTitle}>
                  Pending Rent Dues Across Properties
                </Text>
                <Text style={styles.duesOverviewSub}>
                  Total Difference: ₹{portfolio.totalOutstandingDues.toLocaleString()} remaining to be collected.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Search and Filters */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tenant or property..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[
                styles.chip,
                activeFilter === 'all' && styles.chipActive,
              ]}
              onPress={() => setActiveFilter('all')}
            >
              <Text
                style={[
                  styles.chipText,
                  activeFilter === 'all' && styles.chipTextActive,
                ]}
              >
                All ({tenants.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                activeFilter === 'flexible' && styles.chipActivePurple,
              ]}
              onPress={() => setActiveFilter('flexible')}
            >
              <Sparkles
                size={12}
                color={activeFilter === 'flexible' ? '#FFFFFF' : '#7C3AED'}
              />
              <Text
                style={[
                  styles.chipText,
                  activeFilter === 'flexible' && styles.chipTextActivePurple,
                ]}
              >
                Flexible ({portfolio.totalFlexibleTenants})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                activeFilter === 'fixed' && styles.chipActive,
              ]}
              onPress={() => setActiveFilter('fixed')}
            >
              <Text
                style={[
                  styles.chipText,
                  activeFilter === 'fixed' && styles.chipTextActive,
                ]}
              >
                Fixed ({portfolio.totalFixedTenants})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                activeFilter === 'variable' && styles.chipActive,
              ]}
              onPress={() => setActiveFilter('variable')}
            >
              <Text
                style={[
                  styles.chipText,
                  activeFilter === 'variable' && styles.chipTextActive,
                ]}
              >
                Variable Maint. ({tenants.filter((t) => t.maintenanceWorkflow === 'variable_rent_deduction').length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Header with Add Tenant Button */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Users size={18} color="#0F172A" />
            <Text style={styles.sectionTitle}>Tenants & Properties</Text>
          </View>

          <TouchableOpacity
            style={styles.addTenantBtn}
            onPress={() => setIsOnboardingOpen(true)}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addTenantText}>Add Tenant</Text>
          </TouchableOpacity>
        </View>

        {/* Tenant Cards List */}
        {filteredTenants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Building2 size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              {tenants.length === 0 ? 'No tenants or properties yet' : 'No matching properties'}
            </Text>
            <Text style={styles.emptySub}>
              {tenants.length === 0
                ? 'Get started by onboarding your first tenant and setting up rent details.'
                : 'Try adjusting your search filter or clear query.'}
            </Text>
            {tenants.length === 0 && (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setIsOnboardingOpen(true)}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>Add Your First Tenant</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredTenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onPress={() => onSelectTenant(tenant)}
              onLogPayment={() => setSelectedTenantForPayment(tenant)}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <TenantOnboardingModal
        visible={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {selectedTenantForPayment && (
        <LogPaymentModal
          visible={!!selectedTenantForPayment}
          onClose={() => setSelectedTenantForPayment(null)}
          tenant={selectedTenantForPayment}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollArea: {
    flex: 1,
    padding: 16,
  },
  metricsContainer: {
    marginBottom: 20,
    gap: 10,
  },
  metricCard: {
    borderRadius: 20,
    padding: 20,
  },
  metricCardPrimary: {
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  metricSub: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCardMini: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  metricCardEmerald: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  metricCardIndigo: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  metricCardAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  miniLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricMiniLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  metricMiniValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#047857',
    marginTop: 4,
  },
  metricMiniValueIndigo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4338CA',
    marginTop: 4,
  },
  metricMiniValueAmber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 4,
  },
  duesOverviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginTop: 10,
  },
  duesOverviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  duesOverviewSub: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipActivePurple: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextActivePurple: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  addTenantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addTenantText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
