import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { Building2, Bell, ShieldCheck } from 'lucide-react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { Header } from './src/components/common/Header';
import { UpdateBanner } from './src/components/common/UpdateBanner';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TenantDetailScreen } from './src/screens/TenantDetailScreen';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { Tenant } from './src/types';
import { PinLockScreen } from './src/components/security/PinLockScreen';
import { PinManagementModal } from './src/components/security/PinManagementModal';

function MainApp() {
  const { tenants, alerts, isAppLocked } = useApp();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alerts'>('dashboard');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);

  const pendingAlertsCount = alerts.filter((a) => !a.isResolved).length;

  // Prompt for Camera permission immediately on app startup
  useEffect(() => {
    (async () => {
      try {
        await ImagePicker.requestCameraPermissionsAsync();
      } catch (err) {
        console.warn('Camera permission request on app startup:', err);
      }
    })();
  }, []);

  // Listen for user tapping a scheduled or test push notification
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.tenantId) {
          const tenant = tenants.find((t) => t.id === data.tenantId);
          if (tenant) {
            setSelectedTenant(tenant);
            setActiveTab('dashboard');
          } else {
            setActiveTab('alerts');
          }
        } else {
          setActiveTab('alerts');
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [tenants]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* In-App OTA Update Status Banner */}
      <UpdateBanner />

      {/* Dynamic Header */}
      {!selectedTenant && (
        <Header
          title={activeTab === 'dashboard' ? 'Rento Landlord' : 'Alerts & Reminders'}
          subtitle={
            activeTab === 'dashboard'
              ? 'Property & Payment Tracking'
              : 'Annual May Electricity Rebates'
          }
          activeTab={activeTab}
          onOpenAlerts={() => setActiveTab(activeTab === 'dashboard' ? 'alerts' : 'dashboard')}
          onOpenSecurity={() => setIsSecurityModalOpen(true)}
        />
      )}

      {/* Main Content View */}
      <View style={styles.content}>
        {selectedTenant ? (
          <TenantDetailScreen
            tenant={selectedTenant}
            onBack={() => setSelectedTenant(null)}
          />
        ) : activeTab === 'dashboard' ? (
          <DashboardScreen
            onSelectTenant={(tenant) => setSelectedTenant(tenant)}
            onNavigateToAlerts={() => setActiveTab('alerts')}
          />
        ) : (
          <AlertsScreen
            onSelectTenant={(tenant) => {
              setSelectedTenant(tenant);
            }}
          />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      {!selectedTenant && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}
          >
            <Building2
              size={22}
              color={activeTab === 'dashboard' ? '#059669' : '#94A3B8'}
            />
            <Text
              style={[
                styles.navLabel,
                activeTab === 'dashboard' && styles.navLabelActive,
              ]}
            >
              Properties
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('alerts')}
            activeOpacity={0.7}
          >
            <View style={styles.bellNavWrapper}>
              <Bell
                size={22}
                color={activeTab === 'alerts' ? '#059669' : '#94A3B8'}
              />
              {pendingAlertsCount > 0 && (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{pendingAlertsCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.navLabel,
                activeTab === 'alerts' && styles.navLabelActive,
              ]}
            >
              May Alerts
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PIN Security Management Modal */}
      <PinManagementModal
        visible={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* Fullscreen PIN Lock Screen Overlay when app is locked */}
      {isAppLocked && <PinLockScreen />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 80,
  },
  bellNavWrapper: {
    position: 'relative',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  navLabelActive: {
    color: '#059669',
    fontWeight: '700',
  },
});
