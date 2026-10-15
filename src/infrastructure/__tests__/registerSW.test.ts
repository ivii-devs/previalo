import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PWAHelper,
  promptInstall,
  isInstallable,
  isOffline,
  isOnline,
  onNetworkChange,
  onInstallableChange,
  onAppInstalled,
  registerServiceWorker,
  type BeforeInstallPromptEvent,
} from '../registerSW';

describe('RegisterSW & PWAHelper Infrastructure Service', () => {
  let eventListeners: Map<string, Set<(e: any) => void>>;
  let mockNavigator: any;

  beforeEach(() => {
    PWAHelper.__resetState();
    eventListeners = new Map();

    const mockWindow = {
      addEventListener: vi.fn((event: string, handler: (e: any) => void) => {
        if (!eventListeners.has(event)) {
          eventListeners.set(event, new Set());
        }
        eventListeners.get(event)!.add(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: (e: any) => void) => {
        eventListeners.get(event)?.delete(handler);
      }),
      dispatchEvent: vi.fn((event: Event) => {
        const handlers = eventListeners.get(event.type);
        handlers?.forEach((h) => h(event));
        return true;
      }),
    };

    mockNavigator = {
      onLine: true,
      serviceWorker: {
        register: vi.fn(),
        controller: null,
      },
    };

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('navigator', mockNavigator);

    // Initialize PWAHelper with our mocked window
    PWAHelper.init();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Online / Offline State Detection & Subscriptions', () => {
    it('should accurately detect online status', () => {
      mockNavigator.onLine = true;
      expect(isOnline()).toBe(true);
      expect(isOffline()).toBe(false);
    });

    it('should accurately detect offline status', () => {
      mockNavigator.onLine = false;
      expect(isOnline()).toBe(false);
      expect(isOffline()).toBe(true);
    });

    it('should trigger onNetworkChange subscribers when online/offline events fire', () => {
      const networkCallback = vi.fn();
      const unsubscribe = onNetworkChange(networkCallback);

      // Initial call
      expect(networkCallback).toHaveBeenCalledWith(true);
      networkCallback.mockClear();

      // Trigger offline event
      const offlineHandlers = eventListeners.get('offline');
      expect(offlineHandlers).toBeDefined();
      offlineHandlers?.forEach((handler) => handler(new Event('offline')));
      expect(networkCallback).toHaveBeenCalledWith(false);

      // Trigger online event
      networkCallback.mockClear();
      const onlineHandlers = eventListeners.get('online');
      expect(onlineHandlers).toBeDefined();
      onlineHandlers?.forEach((handler) => handler(new Event('online')));
      expect(networkCallback).toHaveBeenCalledWith(true);

      // Unsubscribe
      unsubscribe();
      networkCallback.mockClear();
      offlineHandlers?.forEach((handler) => handler(new Event('offline')));
      expect(networkCallback).not.toHaveBeenCalled();
    });
  });

  describe('beforeinstallprompt & promptInstall()', () => {
    it('should report isInstallable as false initially and return unsupported if prompted', async () => {
      expect(isInstallable()).toBe(false);
      const outcome = await promptInstall();
      expect(outcome).toBe('unsupported');
    });

    it('should capture beforeinstallprompt, update isInstallable, and execute promptInstall()', async () => {
      const installableCallback = vi.fn();
      const unsubscribe = onInstallableChange(installableCallback);
      installableCallback.mockClear();

      // Mock BeforeInstallPromptEvent
      const mockPromptEvent: BeforeInstallPromptEvent = {
        platforms: ['web'],
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
        prompt: vi.fn().mockResolvedValue(undefined),
        preventDefault: vi.fn(),
      } as unknown as BeforeInstallPromptEvent;

      // Simulate browser firing beforeinstallprompt
      const promptHandlers = eventListeners.get('beforeinstallprompt');
      expect(promptHandlers).toBeDefined();
      promptHandlers?.forEach((handler) => handler(mockPromptEvent));

      expect(mockPromptEvent.preventDefault).toHaveBeenCalled();
      expect(isInstallable()).toBe(true);
      expect(installableCallback).toHaveBeenCalledWith(true);

      // Now prompt install
      const outcome = await promptInstall();
      expect(mockPromptEvent.prompt).toHaveBeenCalled();
      expect(outcome).toBe('accepted');
      expect(isInstallable()).toBe(false);
      expect(installableCallback).toHaveBeenCalledWith(false);

      unsubscribe();
    });

    it('should handle user dismissing the install prompt', async () => {
      const mockPromptEvent: BeforeInstallPromptEvent = {
        platforms: ['web'],
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
        prompt: vi.fn().mockResolvedValue(undefined),
        preventDefault: vi.fn(),
      } as unknown as BeforeInstallPromptEvent;

      PWAHelper.__setDeferredPrompt(mockPromptEvent);
      expect(isInstallable()).toBe(true);

      const outcome = await promptInstall();
      expect(outcome).toBe('dismissed');
      expect(isInstallable()).toBe(false);
    });

    it('should handle appinstalled event and notify subscribers', () => {
      const installedCallback = vi.fn();
      const unsubscribe = onAppInstalled(installedCallback);

      // Set deferred prompt
      PWAHelper.__setDeferredPrompt({} as any);
      expect(isInstallable()).toBe(true);

      // Fire appinstalled
      const appInstalledHandlers = eventListeners.get('appinstalled');
      appInstalledHandlers?.forEach((handler) => handler(new Event('appinstalled')));

      expect(installedCallback).toHaveBeenCalled();
      expect(isInstallable()).toBe(false);

      unsubscribe();
    });
  });

  describe('registerServiceWorker', () => {
    it('should register service worker when supported', async () => {
      const mockRegistration = {
        waiting: null,
        installing: null,
        addEventListener: vi.fn(),
      };
      mockNavigator.serviceWorker.register.mockResolvedValue(mockRegistration);

      const reg = await registerServiceWorker({ swUrl: '/sw.js', scope: '/' });

      expect(mockNavigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(reg).toBe(mockRegistration);
      expect(PWAHelper.getRegistration()).toBe(mockRegistration);
    });

    it('should call onUpdate if a service worker is waiting on registration', async () => {
      const onUpdate = vi.fn();
      const mockRegistration = {
        waiting: {},
        installing: null,
        addEventListener: vi.fn(),
      };
      mockNavigator.serviceWorker.register.mockResolvedValue(mockRegistration);

      await registerServiceWorker({ onUpdate });

      expect(onUpdate).toHaveBeenCalledWith(mockRegistration);
    });

    it('should handle service worker registration failure gracefully', async () => {
      const onError = vi.fn();
      const error = new Error('SW registration failed');
      mockNavigator.serviceWorker.register.mockRejectedValue(error);

      const reg = await registerServiceWorker({ onError });

      expect(reg).toBeNull();
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should return null when serviceWorker is not supported in navigator', async () => {
      vi.stubGlobal('navigator', { onLine: true }); // no serviceWorker property

      const reg = await registerServiceWorker();
      expect(reg).toBeNull();
    });
  });

  describe('iOS & Standalone Mode Detection', () => {
    it('detects standalone mode via matchMedia', () => {
      vi.stubGlobal('window', {
        matchMedia: vi.fn((query: string) => ({
          matches: query === '(display-mode: standalone)',
        })),
        navigator: {},
        addEventListener: vi.fn(),
      });

      expect(PWAHelper.isStandalone()).toBe(true);
    });

    it('detects standalone mode via navigator.standalone on iOS', () => {
      vi.stubGlobal('window', {
        matchMedia: vi.fn(() => ({ matches: false })),
        navigator: { standalone: true },
        addEventListener: vi.fn(),
      });

      expect(PWAHelper.isStandalone()).toBe(true);
    });

    it('detects iOS userAgent correctly', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        onLine: true,
      });

      expect(PWAHelper.isIOS()).toBe(true);
    });

    it('triggers refreshNetworkStatus to notify listeners', () => {
      const listener = vi.fn();
      PWAHelper.onNetworkChange(listener);
      listener.mockClear();

      PWAHelper.refreshNetworkStatus();
      expect(listener).toHaveBeenCalledWith(true);
    });
  });
});
