import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  Plus,
  Zap,
  Wrench,
  TrendingUp,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  Bell,
  ShieldCheck,
  FileDown,
  History,
} from 'lucide-react-native';
import { Tenant, PaymentRecord, InterestCollectionRecord } from '../types';
import { useApp } from '../context/AppContext';
import { LogPaymentModal } from '../components/payments/LogPaymentModal';
import { LogInterestModal } from '../components/tenants/LogInterestModal';
import { LogAdditionalDepositModal } from '../components/tenants/LogAdditionalDepositModal';
import { LogPastRentModal } from '../components/payments/LogPastRentModal';
import { PdfGenerator } from '../services/pdfGenerator';

interface TenantDetailScreenProps {
  tenant: Tenant;
  onBack: () => void;
}

export const TenantDetailScreen: React.FC<TenantDetailScreenProps> = ({
  tenant,
  onBack,
}) => {
  const {
    tenants,
    payments,
    interestCollections,
    triggerTestMayNotification,
  } = useApp();

  // Find updated tenant from context state
  const activeTenant = tenants.find((t) => t.id === tenant.id) || tenant;

  const [isLogPaymentOpen, setIsLogPaymentOpen] = useState<boolean>(false);
  const [isLogInterestOpen, setIsLogInterestOpen] = useState<boolean>(false);
  const [isLogAdditionalDepositOpen, setIsLogAdditionalDepositOpen] = useState<boolean>(false);
  const [isLogPastRentOpen, setIsLogPastRentOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'payments' | 'electricity'>('payments');

  // Filter payments & interests for this tenant
  const tenantPayments = payments.filter((p) => p.tenantId === activeTenant.id);
  const tenantInterests = interestCollections.filter((ic) => ic.tenantId === activeTenant.id);

  // Security deposit calculations
  const initialDeposit = activeTenant.securityDeposit || 0;
  const additionalDeposits = activeTenant.additionalDeposits || [];
  const totalAdditional = additionalDeposits.reduce((sum, d) => sum + d.amount, 0);
  const totalSecurityDeposit = initialDeposit + totalAdditional;

  const handleTestNotification = async () => {
    await triggerTestMayNotification(activeTenant);
    Alert.alert(
      'Push Notification Triggered!',
      `Sent local reminder: "Collect electricity deposit interest from ${activeTenant.name}."`
    );
  };

  const handleDownloadRentLedgerPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await PdfGenerator.generateRentLedgerPDF(activeTenant, tenantPayments);
    } catch (err) {
      console.error(err);
      Alert.alert('PDF Error', 'Failed to generate Rent Ledger PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadElectricityPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await PdfGenerator.generateElectricityStatementPDF(activeTenant, tenantInterests);
    } catch (err) {
      console.error(err);
      Alert.alert('PDF Error', 'Failed to generate Electricity Statement PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topBarTitleArea}>
          <Text style={styles.topBarTitle}>{activeTenant.unitDesignation}</Text>
          <Text style={styles.topBarSub}>{activeTenant.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.testNotifyBtn}
          onPress={handleTestNotification}
        >
          <Bell size={16} color="#D97706" />
          <Text style={styles.testNotifyText}>Test Alert</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Tenant Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View>
              <Text style={styles.tenantName}>{activeTenant.name}</Text>
              <View style={styles.infoRow}>
                <MapPin size={13} color="#64748B" />
                <Text style={styles.propertyText}>
                  {activeTenant.unitDesignation}, {activeTenant.propertyAddress}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Phone size={13} color="#64748B" />
                <Text style={styles.propertyText}>{activeTenant.phone}</Text>
              </View>
            </View>
            <View style={styles.rentBadge}>
              <Text style={styles.rentLabel}>Current Rent</Text>
              <Text style={styles.rentAmount}>
                ₹{activeTenant.rentAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Quick Details Grid */}
          <View style={styles.detailsGrid}>
            {/* Rent Escalation */}
            <View style={styles.detailItem}>
              <View style={styles.detailLabelRow}>
                <TrendingUp size={13} color="#059669" />
                <Text style={styles.detailLabel}>Escalation</Text>
              </View>
              <Text style={styles.detailValue}>
                +{activeTenant.rentIncrement.value}
                {activeTenant.rentIncrement.type === 'percentage' ? '%' : '₹'} / yr
              </Text>
              <Text style={styles.detailSub}>{activeTenant.rentIncrement.notes}</Text>
            </View>

            {/* Electricity Board & Deposit */}
            <View style={styles.detailItem}>
              <View style={styles.detailLabelRow}>
                <Zap size={13} color="#D97706" />
                <Text style={styles.detailLabel}>Electricity Deposit</Text>
              </View>
              <Text style={[styles.detailValue, { color: '#B45309' }]}>
                ₹{activeTenant.electricityDeposit.toLocaleString()}
              </Text>
              <Text style={styles.detailSub}>{activeTenant.electricityLoad}</Text>
            </View>
          </View>

          {/* Maintenance Workflow Box */}
          <View
            style={[
              styles.workflowBanner,
              activeTenant.maintenanceWorkflow === 'variable_rent_deduction'
                ? styles.workflowBannerWarning
                : styles.workflowBannerMuted,
            ]}
          >
            <Wrench
              size={15}
              color={
                activeTenant.maintenanceWorkflow === 'variable_rent_deduction'
                  ? '#B45309'
                  : '#475569'
              }
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.workflowTitle,
                  activeTenant.maintenanceWorkflow === 'variable_rent_deduction'
                    ? { color: '#92400E' }
                    : { color: '#334155' },
                ]}
              >
                {activeTenant.maintenanceWorkflow === 'variable_rent_deduction'
                  ? 'Variable Rent Deduction System'
                  : 'Standard Maintenance System'}
              </Text>
              <Text
                style={[
                  styles.workflowDesc,
                  activeTenant.maintenanceWorkflow === 'variable_rent_deduction'
                    ? { color: '#B45309' }
                    : { color: '#64748B' },
                ]}
              >
                {activeTenant.maintenanceWorkflow === 'variable_rent_deduction'
                  ? 'Maintenance is deducted directly from rent payout twice a year.'
                  : 'Tenant settles maintenance charges separately with the society.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tenant Security Deposit Held Card */}
        <View style={styles.depositCard}>
          <View style={styles.depositTopRow}>
            <View style={styles.depositIconCircle}>
              <ShieldCheck size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.depositSectionLabel}>Security Deposit Held</Text>
              <Text style={styles.depositTotalValue}>₹{totalSecurityDeposit.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={styles.addDepositBtn}
              onPress={() => setIsLogAdditionalDepositOpen(true)}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#059669" />
              <Text style={styles.addDepositBtnText}>Add Deposit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.depositBreakdownRow}>
            <View style={styles.depositSubItem}>
              <Text style={styles.depositSubLabel}>Initial Deposit</Text>
              <Text style={styles.depositSubValue}>₹{initialDeposit.toLocaleString()}</Text>
            </View>
            <View style={styles.depositSubDivider} />
            <View style={styles.depositSubItem}>
              <Text style={styles.depositSubLabel}>Additional Deposits</Text>
              <Text style={styles.depositSubValue}>
                ₹{totalAdditional.toLocaleString()} ({additionalDeposits.length} logs)
              </Text>
            </View>
          </View>

          {/* Mini history list if any additional deposits were logged */}
          {additionalDeposits.length > 0 && (
            <View style={styles.depositHistoryBox}>
              <Text style={styles.depositHistoryTitle}>Additional Deposit History</Text>
              {additionalDeposits.map((ad) => (
                <View key={ad.id} style={styles.depositHistoryItem}>
                  <View style={styles.depositHistoryLeft}>
                    <Text style={styles.depositHistoryDate}>{ad.date}</Text>
                    {ad.remarks ? (
                      <Text style={styles.depositHistoryRemark}>{ad.remarks}</Text>
                    ) : null}
                  </View>
                  <View style={styles.depositHistoryRight}>
                    <Text style={styles.depositHistoryAmount}>+₹{ad.amount.toLocaleString()}</Text>
                    <View style={styles.depositMiniBadge}>
                      <Text style={styles.depositMiniBadgeText}>{ad.paymentMode}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* PDF Reports Export Bar */}
        <View style={styles.reportsCard}>
          <View style={styles.reportsHeader}>
            <FileDown size={18} color="#0F172A" />
            <Text style={styles.reportsTitle}>Download Statements & PDFs</Text>
            {isGeneratingPdf && (
              <ActivityIndicator size="small" color="#059669" style={{ marginLeft: 8 }} />
            )}
          </View>
          <View style={styles.reportsButtonRow}>
            <TouchableOpacity
              style={styles.pdfBtn}
              onPress={handleDownloadRentLedgerPDF}
              disabled={isGeneratingPdf}
              activeOpacity={0.8}
            >
              <FileText size={15} color="#047857" />
              <Text style={styles.pdfBtnText}>Rent Ledger PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pdfBtn, styles.pdfBtnAmber]}
              onPress={handleDownloadElectricityPDF}
              disabled={isGeneratingPdf}
              activeOpacity={0.8}
            >
              <Zap size={15} color="#B45309" />
              <Text style={[styles.pdfBtnText, styles.pdfBtnTextAmber]}>Electricity PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher: Payments Ledger vs Electricity Rebates */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeSubTab === 'payments' && styles.tabItemActive,
            ]}
            onPress={() => setActiveSubTab('payments')}
          >
            <FileText
              size={16}
              color={activeSubTab === 'payments' ? '#059669' : '#64748B'}
            />
            <Text
              style={[
                styles.tabText,
                activeSubTab === 'payments' && styles.tabTextActive,
              ]}
            >
              Payment Ledger ({tenantPayments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeSubTab === 'electricity' && styles.tabItemActive,
            ]}
            onPress={() => setActiveSubTab('electricity')}
          >
            <Zap
              size={16}
              color={activeSubTab === 'electricity' ? '#D97706' : '#64748B'}
            />
            <Text
              style={[
                styles.tabText,
                activeSubTab === 'electricity' && styles.tabTextActive,
              ]}
            >
              May Rebates ({tenantInterests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Monthly Payments Ledger */}
        {activeSubTab === 'payments' && (
          <View style={styles.ledgerSection}>
            <View style={styles.ledgerHeaderRow}>
              <Text style={styles.ledgerHeaderTitle}>
                Payment Records ({tenantPayments.length})
              </Text>
              <TouchableOpacity
                style={styles.logPastRentBtn}
                onPress={() => setIsLogPastRentOpen(true)}
                activeOpacity={0.8}
              >
                <History size={13} color="#059669" />
                <Text style={styles.logPastRentText}>+ Log Past Month</Text>
              </TouchableOpacity>
            </View>

            {tenantPayments.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={32} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No payments logged yet</Text>
                <Text style={styles.emptyDesc}>
                  Tap "+ Log Payment" or "+ Log Past Month" to record rent history.
                </Text>
              </View>
            ) : (
              tenantPayments.map((payment) => (
                <View key={payment.id} style={styles.ledgerCard}>
                  {/* Ledger Card Top Row */}
                  <View style={styles.ledgerTopRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={styles.monthModeRow}>
                        <Text style={styles.ledgerMonth}>{payment.monthYear}</Text>
                        {payment.paymentMode && (
                          <View
                            style={[
                              styles.modeBadge,
                              payment.paymentMode === 'UPI' && styles.modeBadgeUPI,
                              payment.paymentMode === 'NEFT' && styles.modeBadgeNEFT,
                              payment.paymentMode === 'Cash' && styles.modeBadgeCash,
                            ]}
                          >
                            <Text
                              style={[
                                styles.modeBadgeText,
                                payment.paymentMode === 'UPI' && styles.modeBadgeTextUPI,
                                payment.paymentMode === 'NEFT' && styles.modeBadgeTextNEFT,
                                payment.paymentMode === 'Cash' && styles.modeBadgeTextCash,
                              ]}
                            >
                              {payment.paymentMode}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.dateRow}>
                        <Calendar size={12} color="#64748B" />
                        <Text style={styles.ledgerDate}>
                          Paid on {payment.paymentDate}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.amountArea}>
                      <Text style={styles.ledgerPaidAmount}>
                        ₹{payment.amountPaid.toLocaleString()}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          payment.status === 'paid'
                            ? styles.statusPaid
                            : styles.statusPartial,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            payment.status === 'paid'
                              ? styles.statusTextPaid
                              : styles.statusTextPartial,
                          ]}
                        >
                          {payment.status === 'paid' ? 'Paid in Full' : 'Partial'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* ADVANCED MAINTENANCE DEDUCTION TAG */}
                  {payment.isMaintenanceDeducted ? (
                    <View style={styles.deductionBreakdown}>
                      <View style={styles.deductionTag}>
                        <Wrench size={13} color="#B45309" />
                        <Text style={styles.deductionTagText}>
                          Maintenance Deducted: -₹
                          {payment.maintenanceDeductionAmount.toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.deductionCalculation}>
                        Gross Rent ₹{payment.expectedRent.toLocaleString()} - Deduction ₹
                        {payment.maintenanceDeductionAmount.toLocaleString()} = Net Payout ₹
                        {payment.netPayoutReceived.toLocaleString()}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.standardTag}>
                      <Text style={styles.standardTagText}>
                        No Maintenance Deduction (Regular Rent)
                      </Text>
                    </View>
                  )}

                  {/* Remarks / Notes */}
                  {payment.remarks ? (
                    <View style={styles.remarksBox}>
                      <Text style={styles.remarksLabel}>Remarks:</Text>
                      <Text style={styles.remarksText}>{payment.remarks}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 2: May Electricity Interest Rebates */}
        {activeSubTab === 'electricity' && (
          <View style={styles.ledgerSection}>
            <View style={styles.electricitySummaryCard}>
              <View style={styles.summaryTop}>
                <Zap size={20} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>May 1st Electricity Rebates</Text>
                  <Text style={styles.summarySub}>
                    Owner Deposit: ₹{activeTenant.electricityDeposit.toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.collectBtn}
                  onPress={() => setIsLogInterestOpen(true)}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.collectBtnText}>Log Collection</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.summaryDesc}>
                The state electricity board awards an annual rebate/interest on the owner's
                deposit directly into the tenant's summer electricity bill. This is collected
                or adjusted annually every May.
              </Text>
            </View>

            {tenantInterests.length === 0 ? (
              <View style={styles.emptyState}>
                <AlertCircle size={32} color="#D97706" />
                <Text style={styles.emptyTitle}>No interest logged yet</Text>
                <Text style={styles.emptyDesc}>
                  Tap "Log Collection" above to record annual interest collected from {activeTenant.name}.
                </Text>
              </View>
            ) : (
              tenantInterests.map((rec) => (
                <View key={rec.id} style={styles.interestCard}>
                  <View style={styles.interestTopRow}>
                    <View>
                      <Text style={styles.interestYear}>{rec.year} Rebate</Text>
                      <Text style={styles.interestDate}>Recorded on {rec.collectedDate}</Text>
                    </View>
                    <View style={styles.interestAmountBadge}>
                      <CheckCircle2 size={14} color="#059669" />
                      <Text style={styles.interestAmount}>
                        ₹{rec.amountCollected.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  {rec.remarks ? (
                    <Text style={styles.interestRemarks}>{rec.remarks}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FLOATING ACTION BUTTON (FAB) to Log Payment */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setIsLogPaymentOpen(true)}
          activeOpacity={0.85}
        >
          <Plus size={22} color="#FFFFFF" />
          <Text style={styles.fabText}>Log Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <LogPaymentModal
        visible={isLogPaymentOpen}
        onClose={() => setIsLogPaymentOpen(false)}
        tenant={activeTenant}
      />
      <LogInterestModal
        visible={isLogInterestOpen}
        onClose={() => setIsLogInterestOpen(false)}
        tenant={activeTenant}
      />
      <LogAdditionalDepositModal
        visible={isLogAdditionalDepositOpen}
        onClose={() => setIsLogAdditionalDepositOpen(false)}
        tenant={activeTenant}
      />
      <LogPastRentModal
        visible={isLogPastRentOpen}
        onClose={() => setIsLogPastRentOpen(false)}
        tenant={activeTenant}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topBarTitleArea: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  topBarSub: {
    fontSize: 12,
    color: '#64748B',
  },
  testNotifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  testNotifyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  scrollArea: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  tenantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  propertyText: {
    fontSize: 12,
    color: '#64748B',
  },
  rentBadge: {
    alignItems: 'flex-end',
  },
  rentLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  rentAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  workflowBanner: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  workflowBannerWarning: {
    backgroundColor: '#FEF3C7',
  },
  workflowBannerMuted: {
    backgroundColor: '#F1F5F9',
  },
  workflowTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  workflowDesc: {
    fontSize: 11,
    marginTop: 1,
    lineHeight: 15,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  ledgerSection: {},
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ledgerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  ledgerMonth: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ledgerDate: {
    fontSize: 12,
    color: '#64748B',
  },
  amountArea: {
    alignItems: 'flex-end',
  },
  ledgerPaidAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  statusPaid: {
    backgroundColor: '#ECFDF5',
  },
  statusPartial: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextPaid: {
    color: '#047857',
  },
  statusTextPartial: {
    color: '#DC2626',
  },
  deductionBreakdown: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  deductionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deductionTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  deductionCalculation: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 4,
  },
  standardTag: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  standardTagText: {
    fontSize: 11,
    color: '#64748B',
  },
  remarksBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  remarksText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  electricitySummaryCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  summarySub: {
    fontSize: 12,
    color: '#B45309',
  },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  collectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryDesc: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  interestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  interestTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interestYear: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  interestDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  interestAmountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  interestAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#047857',
  },
  interestRemarks: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  monthModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  modeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  modeBadgeUPI: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  modeBadgeNEFT: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  modeBadgeCash: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modeBadgeTextUPI: {
    color: '#4338CA',
  },
  modeBadgeTextNEFT: {
    color: '#1D4ED8',
  },
  modeBadgeTextCash: {
    color: '#047857',
  },
  depositCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  depositTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  depositIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  depositTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  addDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addDepositBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  depositBreakdownRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  depositSubItem: {
    flex: 1,
  },
  depositSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  depositSubValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  depositSubDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  depositHistoryBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  depositHistoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  depositHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  depositHistoryLeft: {
    flex: 1,
  },
  depositHistoryDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  depositHistoryRemark: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  depositHistoryRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  depositHistoryAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  depositMiniBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  depositMiniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  reportsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  reportsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reportsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportsButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    paddingVertical: 11,
    borderRadius: 12,
  },
  pdfBtnAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  pdfBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  pdfBtnTextAmber: {
    color: '#B45309',
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ledgerHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logPastRentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logPastRentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
});
