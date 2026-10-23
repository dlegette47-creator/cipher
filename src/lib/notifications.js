import { Capacitor } from '@capacitor/core';

export const requestNotificationPermission = async () => {
  // Web Notification API
  if (!Capacitor.isNativePlatform() && 'Notification' in window) {
    if (Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  }
  // Capacitor Local Notifications (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import(/* @vite-ignore */ '@capacitor/local-notifications');
      await LocalNotifications.requestPermissions();
    } catch (e) {
      console.warn('Capacitor Local Notifications not installed yet.');
    }
  }
};

const _shouldHideContent = () => {
  try {
    const pk = localStorage.getItem('cipher_active_pubkey') || localStorage.getItem('cipher_db_owner') || 'guest';
    const key = 'cipher_' + pk.slice(0, 8) + '_hide_notif_content';
    const raw = localStorage.getItem(key);
    return raw === null ? true : JSON.parse(raw); // default: hidden
  } catch { return true; }
};

export const showNotification = async (title, body) => {
  const shouldHide = _shouldHideContent();
  const finalBody = shouldHide ? 'New message' : body;
  // Only show if the user has the tab hidden (don't annoy them if they are staring at the chat)
  if (document.visibilityState === 'visible' && !Capacitor.isNativePlatform()) return;

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body: finalBody,
          id: Math.floor(Math.random() * 100000),
          schedule: { at: new Date(Date.now() + 1000) },
          sound: null,
          attachments: null,
          actionTypeId: '',
          extra: null
        }]
      });
    } catch (e) {}
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: finalBody, icon: '/icon-192.png' });
  }
};