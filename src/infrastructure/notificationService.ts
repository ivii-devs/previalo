/**
 * Previalo Notification Service
 * Manages local notifications, double opt-in permission flow, and Badging API.
 * Adheres strictly to:
 * - Double opt-in UI: Never request permissions on cold start.
 * - Defensive Badging API: Check 'setAppBadge' in navigator with silent no-ops.
 * - PWA Service Worker push/notification integration with fallback.
 */

import { PWAHelper } from './registerSW';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Checks if the Notification API is supported by the current browser/environment.
   */
  public isSupported(): boolean {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return true;
    }
    return typeof Notification !== 'undefined';
  }

  /**
   * Returns current notification permission state without prompting the user.
   */
  public getPermission(): NotificationStatus {
    if (!this.isSupported() || typeof Notification === 'undefined') {
      return 'unsupported';
    }
    return Notification.permission as NotificationStatus;
  }

  /**
   * Requests permission explicitly (double opt-in flow initiated by user gesture).
   */
  public async requestPermission(): Promise<NotificationStatus> {
    if (!this.isSupported() || typeof Notification === 'undefined') {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      return result as NotificationStatus;
    } catch {
      return this.getPermission();
    }
  }

  /**
   * Displays a local notification using the active ServiceWorkerRegistration,
   * falling back to the standard DOM Notification constructor.
   */
  public async showNotification(
    title: string,
    options?: {
      body?: string;
      icon?: string;
      badge?: string;
      tag?: string;
      data?: any;
    }
  ): Promise<boolean> {
    if (this.getPermission() !== 'granted') {
      return false;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-96x96.png',
      ...options,
    };

    try {
      let swReg = PWAHelper.getRegistration();
      if (!swReg && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          swReg = await navigator.serviceWorker.ready;
        } catch {
          // Ignore
        }
      }

      if (swReg && 'showNotification' in swReg) {
        await swReg.showNotification(title, defaultOptions);
        return true;
      }

      if (typeof Notification !== 'undefined') {
        new Notification(title, defaultOptions);
        return true;
      }
    } catch {
      // Passive fallback
    }

    return false;
  }

  /**
   * Defensively sets application icon badge count if supported by OS/browser.
   */
  public async setBadge(count?: number): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) {
      return false;
    }

    try {
      await (navigator as any).setAppBadge(count);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Defensively clears application icon badge if supported.
   */
  public async clearBadge(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('clearAppBadge' in navigator)) {
      return false;
    }

    try {
      await (navigator as any).clearAppBadge();
      return true;
    } catch {
      return false;
    }
  }
}

export const notificationService = NotificationService.getInstance();
