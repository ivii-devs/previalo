/**
 * Previalo Infrastructure: Service Worker Registration & PWA Lifecycle
 * Captures beforeinstallprompt, exposes promptInstall(), isInstallable(), isOffline(),
 * and manages online/offline and install lifecycle events.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type InstallPromptOutcome = 'accepted' | 'dismissed' | 'unsupported';

export interface SWRegistrationOptions {
  swUrl?: string;
  scope?: string;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: unknown) => void;
}

export class PWAHelper {
  private static deferredPrompt: BeforeInstallPromptEvent | null = null;
  private static installableListeners = new Set<(installable: boolean) => void>();
  private static networkListeners = new Set<(isOnline: boolean) => void>();
  private static installedListeners = new Set<() => void>();
  private static initialized = false;
  private static swRegistration: ServiceWorkerRegistration | null = null;

  /**
   * Initializes window event listeners for PWA lifecycle.
   */
  public static init(): void {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    // Capture beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notifyInstallableChange(true);
    });

    // Detect app installed
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.notifyInstallableChange(false);
      this.installedListeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // Ignored
        }
      });
    });

    // Online / Offline tracking
    window.addEventListener('online', () => {
      this.notifyNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.notifyNetworkChange(false);
    });
  }

  /**
   * Returns true if the beforeinstallprompt event is captured and available.
   */
  public static isInstallable(): boolean {
    this.init();
    return this.deferredPrompt !== null;
  }

  /**
   * Returns true if device is offline (navigator.onLine is false).
   */
  public static isOffline(): boolean {
    if (typeof navigator === 'undefined') return false;
    return !navigator.onLine;
  }

  /**
   * Returns true if device is online.
   */
  public static isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  /**
   * Returns true if running as installed standalone PWA (Home Screen on iOS or standalone display-mode).
   */
  public static isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const isMediaQuery = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
    const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
    return isMediaQuery || isNavigatorStandalone;
  }

  /**
   * Returns true if device is iOS (iPhone, iPad, iPod touch).
   */
  public static isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isAppleDevice = /iPad|iPhone|iPod/.test(ua);
    const isMacTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isAppleDevice || isMacTouch;
  }

  /**
   * Revalidates network status and notifies network change listeners.
   * Useful when resuming from background on iOS.
   */
  public static refreshNetworkStatus(): void {
    this.notifyNetworkChange(this.isOnline());
  }

  /**
   * Prompts the user to install the PWA if beforeinstallprompt was captured.
   */
  public static async promptInstall(): Promise<InstallPromptOutcome> {
    this.init();
    if (!this.deferredPrompt) {
      return 'unsupported';
    }

    try {
      const promptEvent = this.deferredPrompt;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      this.deferredPrompt = null;
      this.notifyInstallableChange(false);
      return choice.outcome;
    } catch {
      this.deferredPrompt = null;
      this.notifyInstallableChange(false);
      return 'unsupported';
    }
  }

  /**
   * Subscribes to installable state changes.
   * Returns an unsubscribe function.
   */
  public static onInstallableChange(callback: (installable: boolean) => void): () => void {
    this.init();
    this.installableListeners.add(callback);
    // Emit initial status
    try {
      callback(this.isInstallable());
    } catch {}

    return () => {
      this.installableListeners.delete(callback);
    };
  }

  /**
   * Subscribes to online/offline network status changes.
   * Returns an unsubscribe function.
   */
  public static onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    this.init();
    this.networkListeners.add(callback);
    try {
      callback(this.isOnline());
    } catch {}

    return () => {
      this.networkListeners.delete(callback);
    };
  }

  /**
   * Subscribes to the appinstalled event.
   * Returns an unsubscribe function.
   */
  public static onAppInstalled(callback: () => void): () => void {
    this.init();
    this.installedListeners.add(callback);
    return () => {
      this.installedListeners.delete(callback);
    };
  }

  /**
   * Registers the Service Worker.
   */
  public static async registerServiceWorker(
    options?: SWRegistrationOptions
  ): Promise<ServiceWorkerRegistration | null> {
    this.init();
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    const swUrl = options?.swUrl ?? '/sw.js';
    const scope = options?.scope ?? '/';

    try {
      const registration = await navigator.serviceWorker.register(swUrl, { scope });
      this.swRegistration = registration;

      if (registration.waiting) {
        options?.onUpdate?.(registration);
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available
              options?.onUpdate?.(registration);
            } else {
              // Content cached for offline use
              options?.onSuccess?.(registration);
            }
          }
        });
      });

      return registration;
    } catch (error) {
      options?.onError?.(error);
      return null;
    }
  }

  /**
   * Returns active registration if registered.
   */
  public static getRegistration(): ServiceWorkerRegistration | null {
    return this.swRegistration;
  }

  /**
   * Internal notify helper for installable status.
   */
  private static notifyInstallableChange(installable: boolean): void {
    this.installableListeners.forEach((listener) => {
      try {
        listener(installable);
      } catch {
        // Ignored
      }
    });
  }

  /**
   * Internal notify helper for network status.
   */
  private static notifyNetworkChange(online: boolean): void {
    this.networkListeners.forEach((listener) => {
      try {
        listener(online);
      } catch {
        // Ignored
      }
    });
  }

  /**
   * Testing hook: injects a mock beforeinstallprompt event.
   */
  public static __setDeferredPrompt(event: BeforeInstallPromptEvent | null): void {
    this.deferredPrompt = event;
    this.notifyInstallableChange(event !== null);
  }

  /**
   * Testing hook: resets all listeners and internal state.
   */
  public static __resetState(): void {
    this.deferredPrompt = null;
    this.installableListeners.clear();
    this.networkListeners.clear();
    this.installedListeners.clear();
    this.initialized = false;
    this.swRegistration = null;
  }
}

// Standalone function exports
export const promptInstall = () => PWAHelper.promptInstall();
export const isInstallable = () => PWAHelper.isInstallable();
export const isOffline = () => PWAHelper.isOffline();
export const isOnline = () => PWAHelper.isOnline();
export const isStandalone = () => PWAHelper.isStandalone();
export const isIOS = () => PWAHelper.isIOS();
export const refreshNetworkStatus = () => PWAHelper.refreshNetworkStatus();
export const onNetworkChange = (cb: (isOnline: boolean) => void) => PWAHelper.onNetworkChange(cb);
export const onInstallableChange = (cb: (installable: boolean) => void) =>
  PWAHelper.onInstallableChange(cb);
export const onAppInstalled = (cb: () => void) => PWAHelper.onAppInstalled(cb);
export const registerServiceWorker = (options?: SWRegistrationOptions) =>
  PWAHelper.registerServiceWorker(options);

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  PWAHelper.init();
}

export default PWAHelper;
