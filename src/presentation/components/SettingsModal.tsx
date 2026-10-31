import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Volume2,
  VolumeX,
  Vibrate,
  Sparkles,
  Zap,
  Flame,
  Beer,
  SunMedium,
  Bell,
  BellOff,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useSettingsStore, type Theme } from '../../application/useSettingsStore';
import { soundService } from '../../infrastructure/soundService';
import { notificationService, type NotificationStatus } from '../../infrastructure/notificationService';
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
  icon: React.ReactNode;
}

const THEMES: ThemeConfig[] = [
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    accent: '#ec4899',
    icon: <Sparkles className="w-4 h-4 text-[#ec4899]" />,
  },
  {
    id: 'electric-purple',
    name: 'Electric Purple',
    accent: '#a855f7',
    icon: <Zap className="w-4 h-4 text-[#a855f7]" />,
  },
  {
    id: 'acid-lime',
    name: 'Acid Lime',
    accent: '#84cc16',
    icon: <Beer className="w-4 h-4 text-[#84cc16]" />,
  },
  {
    id: 'sunset-hot',
    name: 'Sunset Hot',
    accent: '#f97316',
    icon: <Flame className="w-4 h-4 text-[#f97316]" />,
  },
  {
    id: 'day-mode',
    name: 'Day Mode',
    accent: '#db2777',
    icon: <SunMedium className="w-4 h-4 text-[#db2777]" />,
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
      // In web, permissions cannot be revoked programmatically once granted
      return;
    }

    const result = await notificationService.requestPermission();
    setNotificationStatus(result);
    if (result === 'granted') {
      await notificationService.showNotification('Previalo Activado', {
        body: '¡Notificaciones activadas con éxito para tus previas!',
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
        data-testid="settings-modal"
      >
        <div className="w-full max-w-sm rounded-3xl border-2 theme-border bg-[var(--bg-surface)] p-5 shadow-[var(--glow-shadow)] flex flex-col space-y-5 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-y-auto scroll-container">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b theme-border pb-3 shrink-0">
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5 theme-accent-primary" />
              <h3 className="text-lg font-black uppercase tracking-wider theme-text-primary">
                Configuración
              </h3>
            </div>
            <button
              onClick={() => {
                soundService.playTap();
                onClose();
              }}
              className="p-1.5 rounded-xl border theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Cerrar modal"
              data-testid="close-settings-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              Tema Visual Neón
            </label>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((item) => {
                const active = currentTheme === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTheme(item.id)}
                    style={{
                      borderColor: active ? item.accent : 'transparent',
                      boxShadow: active ? `0 0 10px ${item.accent}55` : 'none',
                    }}
                    className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left bg-[var(--bg-elevated)] cursor-pointer min-h-[44px] ${
                      active ? 'ring-1' : 'opacity-70 hover:opacity-100'
                    }`}
                    data-testid={`theme-option-${item.id}`}
                  >
                    <div className="shrink-0">{item.icon}</div>
                    <span className="truncate theme-text-primary">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio & Haptic Feedback Controls */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              Efectos y Respuestas
            </label>
            <div className="space-y-2">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl border theme-border bg-[var(--bg-elevated)] min-h-[52px]">
                <div className="flex items-center space-x-2.5">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-gray-400" />
                  )}
                  <div>
                    <div className="text-xs font-bold theme-text-primary">Sonido FX</div>
                    <div className="text-[10px] theme-text-muted">Audio procedural Web Audio</div>
                  </div>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer min-h-[24px]`}
                  style={{ backgroundColor: soundEnabled ? 'var(--accent-primary)' : '#374151' }}
                  data-testid="toggle-sound-btn"
                  aria-label="Alternar sonido"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      soundEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Haptics Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl border theme-border bg-[var(--bg-elevated)] min-h-[52px]">
                <div className="flex items-center space-x-2.5">
                  <Vibrate
                    className={`w-4 h-4 ${hapticsEnabled ? 'text-amber-400' : 'text-gray-400'}`}
                  />
                  <div>
                    <div className="text-xs font-bold theme-text-primary">Vibración Háptica</div>
                    <div className="text-[10px] theme-text-muted">Respuesta táctil en toques</div>
                  </div>
                </div>
                <button
                  onClick={handleToggleHaptics}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer min-h-[24px]`}
                  style={{ backgroundColor: hapticsEnabled ? 'var(--accent-primary)' : '#374151' }}
                  data-testid="toggle-haptics-btn"
                  aria-label="Alternar háptica"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      hapticsEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications Double Opt-in Toggle */}
              {notificationStatus !== 'unsupported' && (
                <div className="flex items-center justify-between p-3 rounded-2xl border theme-border bg-[var(--bg-elevated)] min-h-[52px]">
                  <div className="flex items-center space-x-2.5">
                    {notificationStatus === 'granted' ? (
                      <Bell className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <BellOff className="w-4 h-4 text-gray-400" />
                    )}
                    <div>
                      <div className="text-xs font-bold theme-text-primary">Notificaciones</div>
                      <div className="text-[10px] theme-text-muted">
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
                      onClick={handleToggleNotifications}
                      className="px-2.5 py-1 rounded-xl bg-[var(--accent-primary)] text-black font-extrabold text-[11px] cursor-pointer min-h-[36px]"
                      data-testid="enable-notifications-btn"
                    >
                      Activar
                    </button>
                  )}
                  {notificationStatus === 'granted' && (
                    <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                      Activo
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Legal & Privacy Section */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              Legal y Almacenamiento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => openLegal('terms')}
                className="p-2 rounded-xl border theme-border bg-[var(--bg-elevated)] text-[10px] font-bold theme-text-primary hover:bg-[var(--bg-surface)] cursor-pointer min-h-[44px] flex items-center justify-center text-center"
                data-testid="legal-terms-btn"
              >
                Términos +18
              </button>
              <button
                onClick={() => openLegal('privacy')}
                className="p-2 rounded-xl border theme-border bg-[var(--bg-elevated)] text-[10px] font-bold theme-text-primary hover:bg-[var(--bg-surface)] cursor-pointer min-h-[44px] flex items-center justify-center text-center"
                data-testid="legal-privacy-btn"
              >
                Privacidad
              </button>
              <button
                onClick={() => openLegal('storage')}
                className="p-2 rounded-xl border theme-border bg-[var(--bg-elevated)] text-[10px] font-bold theme-text-primary hover:bg-[var(--bg-surface)] cursor-pointer min-h-[44px] flex items-center justify-center text-center"
                data-testid="legal-storage-btn"
              >
                Cookies/LSSI
              </button>
            </div>
          </div>

          {/* Reset / Supresión de Datos */}
          <div className="pt-2 border-t theme-border space-y-2">
            {!showClearConfirm ? (
              <button
                onClick={() => {
                  soundService.playTap();
                  setShowClearConfirm(true);
                }}
                className="w-full py-2.5 px-3 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
                data-testid="clear-data-prompt-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar datos locales y vaciar caché</span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl border border-red-500/40 bg-red-500/15 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>¿Confirmar borrado total?</span>
                </div>
                <p className="text-[10px] text-red-200/80 leading-snug">
                  Se restablecerán las partidas, nombres guardados y se vaciará la caché de cartas.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearAllData}
                    className="flex-1 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs cursor-pointer min-h-[40px]"
                    data-testid="clear-data-confirm-btn"
                  >
                    Sí, borrar todo
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer min-h-[40px]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              soundService.playTap();
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-[var(--accent-primary)] text-black font-black text-xs uppercase tracking-wider shadow-[var(--glow-shadow)] hover:brightness-110 active:scale-95 transition-all cursor-pointer min-h-[44px] shrink-0"
            data-testid="modal-done-btn"
          >
            Guardar y Cerrar
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
