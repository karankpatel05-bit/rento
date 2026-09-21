import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Tenant } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  async requestPermissionsAsync(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return true;
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device or emulator');
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permission');
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rento-reminders', {
        name: 'Landlord Reminders & Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#059669',
      });
    }

    return true;
  },

  /**
   * Schedules the annual May 1st reminder:
   * "Collect electricity deposit interest from [Tenant Name]"
   */
  async scheduleMayDepositReminder(tenant: Tenant): Promise<string | null> {
    if (!tenant.electricityDeposit || tenant.electricityDeposit <= 0) {
      return null;
    }

    try {
      const title = `May 1st Electricity Rebate Reminder`;
      const body = `Collect electricity deposit interest from ${tenant.name} (${tenant.unitDesignation}). Deposit: ₹${tenant.electricityDeposit.toLocaleString()}`;

      // Schedule for May 1st at 09:00 AM every year
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            tenantId: tenant.id,
            action: 'electricity_interest',
            type: 'may_reminder',
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          month: 5, // May (1-indexed in SchedulableTriggerInputTypes.CALENDAR)
          day: 1,
          hour: 9,
          minute: 0,
          repeats: true,
          channelId: 'rento-reminders',
        },
      });
      return id;
    } catch (err) {
      console.warn('Could not schedule calendar notification:', err);
      return null;
    }
  },

  /**
   * Instantly trigger a test notification for quick mobile verification
   */
  async triggerTestReminder(tenant: Tenant): Promise<void> {
    await this.requestPermissionsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `May 1st Reminder (Test Notification)`,
        body: `Collect electricity deposit interest from ${tenant.name} (${tenant.unitDesignation}). Deposit: ₹${tenant.electricityDeposit.toLocaleString()}`,
        data: {
          tenantId: tenant.id,
          action: 'electricity_interest',
          type: 'may_reminder',
        },
        sound: 'default',
      },
      trigger: null, // trigger immediately
    });
  },

  async cancelAllReminders(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};
