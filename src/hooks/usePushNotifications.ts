'use client';

import { useState, useCallback } from 'react';
import {
  isSupported,
  checkPermission,
  requestPermission,
  type NotificationPermission,
} from '@/lib/notifications';

const PROMPT_DISMISSED_KEY = 'lumina_notif_prompt_dismissed';

export function usePushNotifications() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() =>
    isSupported() ? checkPermission() : 'default'
  );
  const [supported, setSupported] = useState(() => isSupported());

  const request = useCallback(async (): Promise<NotificationPermission> => {
    if (!supported) return 'denied';
    const result = await requestPermission();
    setPermissionStatus(result);
    return result;
  }, [supported]);

  const hasPromptBeenDismissed = (): boolean => {
    try {
      return localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const dismissPrompt = (): void => {
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
    } catch {
      // localStorage not available
    }
  };

  return {
    permissionStatus,
    isSupported: supported,
    requestPermission: request,
    hasPromptBeenDismissed,
    dismissPrompt,
  };
}
