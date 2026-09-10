import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const notificationService = {
  /**
   * Check if running in a native mobile shell
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    if (this.isNative()) {
      try {
        const status = await LocalNotifications.requestPermissions();
        return status.display === 'granted';
      } catch (err) {
        console.warn('[NotificationService] Native notification permission failed:', err);
        return false;
      }
    }

    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch (err) {
        console.warn('[NotificationService] Web notification permission failed:', err);
        return false;
      }
    }
    return false;
  },

  /**
   * Trigger a sync-success alert notification
   */
  async notifySyncSuccess(syncedCount: number): Promise<void> {
    if (syncedCount <= 0) return;

    const title = 'Đồng bộ dữ liệu thành công! 🚀';
    const body = `Đã đồng bộ an toàn ${syncedCount} phiếu khảo sát hiện trường lên Cloud Database.`;

    // 1. Native Mobile Notification
    if (this.isNative()) {
      try {
        const check = await LocalNotifications.checkPermissions();
        if (check.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now() % 2147483647,
              title,
              body,
              schedule: { at: new Date(Date.now() + 200) },
              smallIcon: 'ic_launcher_round',
            },
          ],
        });
        return;
      } catch (err) {
        console.warn('[NotificationService] Native notification failed, falling back:', err);
      }
    }

    // 2. Web Browser Notification fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
        });
      } catch (err) {
        console.warn('[NotificationService] Web Notification error:', err);
      }
    }
  },
};
