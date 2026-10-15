import React from 'react';
import { X, Palette, Volume2, VolumeX, Vibrate, Sparkles, Zap, Flame, Beer, SunMedium } from 'lucide-react';
import { useSettingsStore, type Theme } from '../../application/useSettingsStore';
import { soundService } from '../../infrastructure/soundService';

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

  if (!isOpen) return null;

  const handleSelectTheme = (theme: Theme) => {
    soundService.playTap();
    soundService.vibrate(10);
    setTheme(theme);
  };

  const handleToggleSound = () => {
    toggleSound();
    // Provide audio feedback if newly enabled
    if (!soundEnabled) {
      setTimeout(() => soundService.playTap(), 50);
    }
  };

  const handleToggleHaptics = () => {
    toggleHaptics();
    // Provide haptic feedback if newly enabled
    if (!hapticsEnabled) {
      soundService.vibrate(20);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
      data-testid="settings-modal"
    >
      <div className="w-full max-w-sm rounded-3xl border-2 theme-border bg-[var(--bg-surface)] p-5 shadow-[var(--glow-shadow)] flex flex-col space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b theme-border pb-3">
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
            className="p-1.5 rounded-xl border theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white transition-all cursor-pointer"
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
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left bg-[var(--bg-elevated)] cursor-pointer ${
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
            <div className="flex items-center justify-between p-3 rounded-2xl border theme-border bg-[var(--bg-elevated)]">
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
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  soundEnabled ? 'bg-[var(--accent-primary)]' : 'bg-gray-700'
                }`}
                data-testid="toggle-sound-btn"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    soundEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Haptics Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl border theme-border bg-[var(--bg-elevated)]">
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
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  hapticsEnabled ? 'bg-[var(--accent-primary)]' : 'bg-gray-700'
                }`}
                data-testid="toggle-haptics-btn"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    hapticsEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            soundService.playTap();
            onClose();
          }}
          className="w-full py-2.5 rounded-2xl bg-[var(--accent-primary)] text-white font-black text-xs uppercase tracking-wider shadow-[var(--glow-shadow)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          data-testid="modal-done-btn"
        >
          Guardar y Cerrar
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
