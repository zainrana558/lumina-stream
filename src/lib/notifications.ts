/**
 * Browser Notification API utilities.
 * Uses the Notification API for client-side notifications without a push server.
 */

export type NotificationPermission = 'default' | 'granted' | 'denied';

export function isSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

export function checkPermission(): NotificationPermission {
  if (!isSupported()) return 'denied';
  return Notification.permission as NotificationPermission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermission;
  } catch {
    return 'denied';
  }
}

export function sendNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    return new Notification(title, {
      icon: '/logo.svg',
      badge: '/logo.svg',
      ...options,
    });
  } catch {
    return null;
  }
}
