import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Volume2,
  VolumeX,
  Vibrate,
  Bell,
  BellOff,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useSettingsStore, type Theme } from '../../application/useSettingsStore';
import { soundService } from '../../infrastructure/soundService';
import {
  notificationService,
  type NotificationStatus,
} from '../../infrastructure/notificationService';
import { LegalModal } from './LegalModal';
import { clear as clearIndexedDB } from 'idb-keyval';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ThemeConfig {
  id: Theme;
  name: string;
  accent: string;
  surface: string;
}

export const SETTINGS_THEMES: ThemeConfig[] = [
  {
    id: 'coral-night',
    name: 'Noche Coral',
    accent: '#ff6257',
    surface: '#121113',
  },
  {
    id: 'indigo-obsidian',
    name: 'Obsidiana Índigo',
    accent: '#7c7aff',
    surface: '#101118',
  },
  {
    id: 'emerald-forest',
    name: 'Bosque Esmeralda',
    accent: '#2ecc87',
    surface: '#0f1412',
  },
  {
    id: 'amber-dusk',
    name: 'Ámbar Nocturno',
    accent: '#f59e0b',
    surface: '#14110f',
  },
  {
    id: 'warm-day',
    name: 'Modo Día',
    accent: '#cc3931',
    surface: '#f7f4ef',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const storeTheme = useSettingsStore((state) => state.theme);
  const currentTheme = storeTheme || useSettingsStore.getState().theme;
  const storeSound = useSettingsStore((state) => state.soundEnabled);
  const soundEnabled = storeSound ?? useSettingsStore.getState().soundEnabled;
  const storeHaptics = useSettingsStore((state) => state.hapticsEnabled);
  const hapticsEnabled = storeHaptics ?? useSettingsStore.getState().hapticsEnabled;
  const setTheme = useSettingsStore((state) => state.setTheme);
  const toggleSound = useSettingsStore((state) => state.toggleSound);
  const toggleHaptics = useSettingsStore((state) => state.toggleHaptics);

  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('unsupported');
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | 'storage'>('terms');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotificationStatus(notificationService.getPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectTheme = (theme: Theme) => {
    soundService.playTap();
    soundService.vibrate(10);
    setTheme(theme);
  };

  const handleToggleSound = () => {
    toggleSound();
    if (!soundEnabled) {
      setTimeout(() => soundService.playTap(), 50);
    }
  };

  const handleToggleHaptics = () => {
    toggleHaptics();
    if (!hapticsEnabled) {
      soundService.vibrate(20);
    }
  };

  const handleToggleNotifications = async () => {
    soundService.playTap();
    if (notificationStatus === 'granted') {
      return;
    }

    const result = await notificationService.requestPermission();
    setNotificationStatus(result);
    if (result === 'granted') {
      await notificationService.showNotification('Previalo activado', {
        body: 'Notificaciones activadas para tus previas.',
      });
    }
  };

  const handleClearAllData = async () => {
    soundService.playTap();
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      await clearIndexedDB();
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch {
      // Best-effort local cleanup
    }
    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
      window.location.reload();
    }
  };

  const openLegal = (tab: 'terms' | 'privacy' | 'storage') => {
    soundService.playTap();
    setLegalTab(tab);
    setIsLegalOpen(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/75 select-none"
        data-testid="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className="w-full max-w-sm rounded-[20px] border border-border-strong bg-surface p-5 shadow-modal flex flex-col space-y-5 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-y-auto scroll-container">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5 text-action" />
              <h3 id="settings-modal-title" className="font-heading text-lg font-bold text-text">
                Configuración
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                soundService.playTap();
                onClose();
              }}
              className="min-w-[44px] min-h-[44px] -mr-1 rounded-xl border border-border bg-surface-muted text-text-secondary interactive-surface active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Cerrar modal"
              data-testid="close-settings-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Selector */}
          <section className="space-y-2.5">
            <label className="font-heading text-xs font-bold text-text-secondary block">
              Tema visual
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SETTINGS_THEMES.map((item) => {
                const active = currentTheme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTheme(item.id)}
                    className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all text-left cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.98] ${
                      active
                        ? 'border-action bg-selected text-text font-bold'
                        : 'border-border bg-surface-muted text-text-secondary interactive-surface'
                    }`}
                    data-testid={`theme-option-${item.id}`}
                    data-accent={item.accent}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-border-strong flex items-center justify-center"
                        style={{ backgroundColor: item.surface }}
                        aria-hidden="true"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.accent }}
                        />
                      </span>
                      <span className="leading-tight break-words">{item.name}</span>
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-action shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Audio & Haptic Feedback Controls */}
          <section className="space-y-2.5 pt-1 border-t border-border">
            <label className="font-heading text-xs font-bold text-text-secondary block pt-3">
              Efectos y respuestas
            </label>
            <div className="divide-y divide-border rounded-2xl border border-border bg-surface-muted overflow-hidden">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between px-3.5 py-2 min-h-[56px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-text-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text">Sonido FX</div>
                    <div className="text-[11px] text-text-muted truncate">
                      Audio procedural Web Audio
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  role="switch"
                  aria-checked={soundEnabled}
                  aria-label="Alternar sonido"
                  className="min-w-[48px] min-h-[44px] flex items-center justify-end cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-xl"
                  data-testid="toggle-sound-btn"
                >
                  <span
                    className={`w-11 h-6 rounded-full transition-colors relative block ${
                      soundEnabled ? 'bg-action' : 'bg-border-strong'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full absolute top-1 left-1 transition-transform ${
                        soundEnabled ? 'translate-x-5 bg-action-ink' : 'translate-x-0 bg-text'
                      }`}
                    />
                  </span>
                </button>
              </div>

              {/* Haptics Toggle */}
              <div className="flex items-center justify-between px-3.5 py-2 min-h-[56px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Vibrate
                    className={`w-4 h-4 shrink-0 ${
                      hapticsEnabled ? 'text-warning' : 'text-text-muted'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text">Vibración háptica</div>
                    <div className="text-[11px] text-text-muted truncate">
                      Respuesta táctil en toques
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleHaptics}
                  role="switch"
                  aria-checked={hapticsEnabled}
                  aria-label="Alternar háptica"
                  className="min-w-[48px] min-h-[44px] flex items-center justify-end cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-xl"
                  data-testid="toggle-haptics-btn"
                >
                  <span
                    className={`w-11 h-6 rounded-full transition-colors relative block ${
                      hapticsEnabled ? 'bg-action' : 'bg-border-strong'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full absolute top-1 left-1 transition-transform ${
                        hapticsEnabled ? 'translate-x-5 bg-action-ink' : 'translate-x-0 bg-text'
                      }`}
                    />
                  </span>
                </button>
              </div>

              {/* Notifications Double Opt-in Toggle */}
              {notificationStatus !== 'unsupported' && (
                <div className="flex items-center justify-between px-3.5 py-2 min-h-[56px]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {notificationStatus === 'granted' ? (
                      <Bell className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <BellOff className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text">Notificaciones</div>
                      <div className="text-[11px] text-text-muted truncate">
                        {notificationStatus === 'granted'
                          ? 'Activadas'
                          : notificationStatus === 'denied'
                          ? 'Bloqueadas en navegador'
                          : 'Avisos locales de previa'}
                      </div>
                    </div>
                  </div>
                  {notificationStatus !== 'granted' && notificationStatus !== 'denied' && (
                    <button
                      type="button"
                      onClick={handleToggleNotifications}
                      className="px-3 min-h-[44px] rounded-xl bg-action text-action-ink font-bold text-xs cursor-pointer interactive-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      data-testid="enable-notifications-btn"
                    >
                      Activar
                    </button>
                  )}
                  {notificationStatus === 'granted' && (
                    <span className="text-[11px] font-semibold text-success px-2.5 py-1 rounded-full bg-success-quiet border border-success-line">
                      Activo
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Legal & Privacy Section */}
          <section className="space-y-2.5 pt-1 border-t border-border">
            <label className="font-heading text-xs font-bold text-text-secondary block pt-3">
              Legal y almacenamiento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => openLegal('terms')}
                className="p-2 rounded-xl border border-border bg-surface-muted text-xs font-semibold text-text interactive-surface cursor-pointer min-h-[44px] flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                data-testid="legal-terms-btn"
              >
                Términos +18
              </button>
              <button
                type="button"
                onClick={() => openLegal('privacy')}
                className="p-2 rounded-xl border border-border bg-surface-muted text-xs font-semibold text-text interactive-surface cursor-pointer min-h-[44px] flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                data-testid="legal-privacy-btn"
              >
                Privacidad
              </button>
              <button
                type="button"
                onClick={() => openLegal('storage')}
                className="p-2 rounded-xl border border-border bg-surface-muted text-xs font-semibold text-text interactive-surface cursor-pointer min-h-[44px] flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                data-testid="legal-storage-btn"
              >
                Cookies/LSSI
              </button>
            </div>
          </section>

          {/* Reset / Data Erasure */}
          <section className="pt-3 border-t border-border space-y-2">
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => {
                  soundService.playTap();
                  setShowClearConfirm(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-danger-line bg-danger-quiet text-danger text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer min-h-[44px]"
                data-testid="clear-data-prompt-btn"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Borrar datos locales y vaciar caché</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl border border-danger-line bg-danger-quiet space-y-2.5">
                <div className="flex items-center gap-2 text-danger text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>¿Confirmar borrado total?</span>
                </div>
                <p className="text-xs text-text-secondary leading-snug">
                  Se restablecerán las partidas, los nombres guardados y se vaciará la caché de cartas.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearAllData}
                    className="flex-1 min-h-[44px] py-2 rounded-xl bg-danger text-danger-ink font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    data-testid="clear-data-confirm-btn"
                  >
                    Sí, borrar todo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 min-h-[44px] py-2 rounded-xl bg-surface border border-border text-text text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              soundService.playTap();
              onClose();
            }}
            className="w-full min-h-[48px] py-3 rounded-2xl bg-action text-action-ink font-heading font-extrabold text-sm interactive-action active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer shrink-0"
            data-testid="modal-done-btn"
          >
            Guardar y cerrar
          </button>
        </div>
      </div>

      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        defaultTab={legalTab}
      />
    </>
  );
};

export default SettingsModal;
