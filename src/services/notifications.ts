import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking, Alert } from 'react-native';
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

  /**
   * Schedules a recurring 1st of every month notification:
   * "New month started! Open Rento to record rent collections"
   */
  async scheduleMonthly1stRentCollection(): Promise<string | null> {
    try {
      await this.requestPermissionsAsync();
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📅 1st of the Month: Rent Collection Due`,
          body: `Today is the 1st of the month! Open Rento to record rent collections from your properties.`,
          data: {
            action: 'monthly_collection',
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          day: 1, // 1st of every month
          hour: 9,
          minute: 0,
          repeats: true,
          channelId: 'rento-reminders',
        },
      });
      return id;
    } catch (err) {
      console.warn('Could not schedule monthly 1st notification:', err);
      return null;
    }
  },

  /**
   * Instantly trigger an overdue rent notification (mid-month 10th or next month rollover)
   */
  async triggerOverdueRentNotification(
    tenant: Tenant,
    monthYear: string,
    dueAmount: number,
    isNextMonthRollover: boolean
  ): Promise<void> {
    try {
      await this.requestPermissionsAsync();
      const title = isNextMonthRollover
        ? `🚨 Rent Overdue Rollover: ${tenant.name}`
        : `⚠️ Rent Due Reminder: ${tenant.name}`;
      const body = isNextMonthRollover
        ? `Rent of ₹${dueAmount.toLocaleString()} for ${monthYear} (${tenant.unitDesignation}) was not paid and has rolled over to this month.`
        : `Rent of ₹${dueAmount.toLocaleString()} for ${monthYear} (${tenant.unitDesignation}) remains pending.`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            tenantId: tenant.id,
            action: 'overdue_rent',
            monthYear,
            dueAmount,
          },
          sound: 'default',
        },
        trigger: null, // immediate
      });
    } catch (err) {
      console.warn('Could not trigger overdue rent notification:', err);
    }
  },

  /**
   * One-tap WhatsApp reminder pre-composed message for the tenant
   */
  sendTenantWhatsAppReminder(
    phone: string,
    tenantName: string,
    unit: string,
    dueAmount: number,
    monthsStr?: string
  ): void {
    if (!phone) {
      Alert.alert('Missing Phone Number', 'This tenant does not have a phone number saved.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const periodText = monthsStr ? `for ${monthsStr}` : 'for your rental period';

    const message = `Dear ${tenantName},\n\nThis is a friendly reminder that rent of ₹${dueAmount.toLocaleString()} ${periodText} for ${unit} is pending.\n\nKindly arrange the payment at your earliest convenience.\n\nThank you!`;

    const whatsappUrl = `whatsapp://send?phone=${phoneWithCountry}&text=${encodeURIComponent(message)}`;
    const webWhatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    const smsUrl = `sms:${phoneWithCountry}?body=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          return Linking.openURL(webWhatsappUrl).catch(() => Linking.openURL(smsUrl));
        }
      })
      .catch((err) => {
        console.warn('Could not open WhatsApp:', err);
        Linking.openURL(smsUrl).catch(() => {
          Alert.alert('Reminder Message', message);
        });
      });
  },

  async cancelAllReminders(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};
