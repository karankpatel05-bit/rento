import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as Updates from 'expo-updates';
import { Sparkles, RefreshCw, X } from 'lucide-react-native';

export const UpdateBanner: React.FC = () => {
  const { isUpdateAvailable, isUpdatePending, isDownloading } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Background check on startup for standalone release builds
  useEffect(() => {
    async function checkUpdateInBackground() {
      try {
        if (__DEV__ || !Updates.isEnabled) return;
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
        }
      } catch (err) {
        // Silently catch network errors or unconfigured update IDs in dev
        console.log('OTA background update check:', err);
      }
    }
    checkUpdateInBackground();
  }, []);

  // When an update is detected, automatically download in background
  useEffect(() => {
    if (isUpdateAvailable) {
      Updates.fetchUpdateAsync().catch((err) => {
        console.warn('Error fetching update:', err);
      });
    }
  }, [isUpdateAvailable]);

  // If dismissed or no pending update / download, don't render anything
  if (dismissed) return null;

  if (isDownloading) {
    return (
      <View style={styles.downloadingContainer}>
        <ActivityIndicator size="small" color="#059669" style={{ marginRight: 6 }} />
        <Text style={styles.downloadingText}>Downloading latest update in background...</Text>
      </View>
    );
  }

  if (isUpdatePending) {
    return (
      <View style={styles.bannerContainer}>
        <View style={styles.bannerLeft}>
          <View style={styles.sparkleCircle}>
            <Sparkles size={16} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>New Update Ready</Text>
            <Text style={styles.bannerSub}>Restart now to apply the latest changes</Text>
          </View>
        </View>

        <View style={styles.bannerRight}>
          <TouchableOpacity
            style={styles.restartBtn}
            onPress={() => Updates.reloadAsync()}
            activeOpacity={0.8}
          >
            <RefreshCw size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.restartBtnText}>Restart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setDismissed(true)}
            activeOpacity={0.7}
          >
            <X size={14} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  downloadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  sparkleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  bannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restartBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
  },
});
