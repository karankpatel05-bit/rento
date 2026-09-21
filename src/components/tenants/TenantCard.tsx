import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Building2,
  ChevronRight,
  Zap,
  Wrench,
  TrendingUp,
  Plus,
} from 'lucide-react-native';
import { Tenant } from '../../types';

interface TenantCardProps {
  tenant: Tenant;
  onPress: () => void;
  onLogPayment: () => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  onPress,
  onLogPayment,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top row: Unit & Rent */}
      <View style={styles.topRow}>
        <View style={styles.unitBadge}>
          <Building2 size={14} color="#047857" />
          <Text style={styles.unitText}>{tenant.unitDesignation}</Text>
        </View>
        <View style={styles.rentBadge}>
          <Text style={styles.rentAmount}>₹{tenant.rentAmount.toLocaleString()}</Text>
          <Text style={styles.rentPeriod}>/mo</Text>
        </View>
      </View>

      {/* Tenant Name & Property */}
      <Text style={styles.tenantName}>{tenant.name}</Text>
      <Text style={styles.propertyAddress}>{tenant.propertyAddress}</Text>

      {/* Tags row */}
      <View style={styles.tagsContainer}>
        {/* Maintenance tag */}
        <View
          style={[
            styles.tag,
            tenant.maintenanceWorkflow === 'variable_rent_deduction'
              ? styles.tagWarning
              : styles.tagMuted,
          ]}
        >
          <Wrench
            size={12}
            color={
              tenant.maintenanceWorkflow === 'variable_rent_deduction'
                ? '#B45309'
                : '#475569'
            }
          />
          <Text
            style={[
              styles.tagText,
              tenant.maintenanceWorkflow === 'variable_rent_deduction'
                ? styles.tagTextWarning
                : styles.tagTextMuted,
            ]}
          >
            {tenant.maintenanceWorkflow === 'variable_rent_deduction'
              ? 'Variable Deduction'
              : 'Standard Maint.'}
          </Text>
        </View>

        {/* Electricity deposit tag */}
        {tenant.electricityDeposit > 0 && (
          <View style={[styles.tag, styles.tagAmber]}>
            <Zap size={12} color="#B45309" />
            <Text style={[styles.tagText, styles.tagTextAmber]}>
              Dep: ₹{tenant.electricityDeposit.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Rent increment tag */}
        {tenant.rentIncrement && (
          <View style={[styles.tag, styles.tagTeal]}>
            <TrendingUp size={12} color="#0F766E" />
            <Text style={[styles.tagText, styles.tagTextTeal]}>
              +{tenant.rentIncrement.value}
              {tenant.rentIncrement.type === 'percentage' ? '%' : '₹'}/yr
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Actions Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onLogPayment();
          }}
        >
          <Plus size={15} color="#059669" />
          <Text style={styles.logBtnText}>Log Payment</Text>
        </TouchableOpacity>

        <View style={styles.viewLedgerBtn}>
          <Text style={styles.viewLedgerText}>Ledger</Text>
          <ChevronRight size={16} color="#64748B" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  rentBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rentAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  rentPeriod: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 2,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  propertyAddress: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tagWarning: {
    backgroundColor: '#FEF3C7',
  },
  tagMuted: {
    backgroundColor: '#F1F5F9',
  },
  tagAmber: {
    backgroundColor: '#FFFBEB',
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  tagTeal: {
    backgroundColor: '#F0FDFA',
    borderWidth: 0.5,
    borderColor: '#99F6E4',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagTextWarning: {
    color: '#B45309',
  },
  tagTextMuted: {
    color: '#475569',
  },
  tagTextAmber: {
    color: '#B45309',
  },
  tagTextTeal: {
    color: '#0F766E',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  logBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  viewLedgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLedgerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
});
