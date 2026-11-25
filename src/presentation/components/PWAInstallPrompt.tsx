import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { PWAHelper } from '../../infrastructure/registerSW';
import { soundService } from '../../infrastructure/soundService';

const DISMISS_KEY = 'previalo_a2hs_dismissed_until';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isDismissedInStorage = (): boolean => {
  try {
    if (typeof localStorage === 'undefined') return false;
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    return Boolean(dismissedUntil && Number(dismissedUntil) > Date.now());
  } catch {
    return false;
  }
};

export const PWAInstallPrompt: React.FC = () => {
  const [canInstallNative, setCanInstallNative] = useState(() => PWAHelper.isInstallable());
  const [showIOSDrawer, setShowIOSDrawer] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => isDismissedInStorage());

  useEffect(() => {
    setIsDismissed(isDismissedInStorage());

    // Subscribe to native installable state (Android / Chrome Desktop)
    const unsubInstall = PWAHelper.onInstallableChange((installable) => {
      setCanInstallNative(installable);
    });

    return () => {
      unsubInstall();
    };
  }, []);

  const handleDismiss = () => {
    soundService.playTap();
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    } catch {
      // Ignored
    }
    setIsDismissed(true);
    setShowIOSDrawer(false);
  };

  const handleNativeInstall = async () => {
    soundService.playTap();
    await PWAHelper.promptInstall();
  };

  const isIOS = PWAHelper.isIOS();
  const isStandalone = PWAHelper.isStandalone();

  // If already installed or currently dismissed, do not display floating prompt
  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Native Install Banner (Android / Chrome Desktop) */}
      {canInstallNative && (
        <div
          className="fixed top-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--accent-primary)]/40 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 text-left animate-in fade-in duration-300"
          data-testid="pwa-install-banner"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center shrink-0 text-[var(--accent-primary)]">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[var(--text-primary)] truncate">
                Instalar Previalo
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                Juega 100% offline a pantalla completa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleNativeInstall}
              className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-black font-extrabold text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer min-h-[36px]"
              data-testid="pwa-install-btn"
            >
              Instalar
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              aria-label="Cerrar aviso de instalación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Subtle Trigger Pill */}
      {isIOS && !showIOSDrawer && (
        <div
          className="fixed top-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm bg-[var(--bg-card)]/90 backdrop-blur-md border border-slate-700/60 rounded-2xl p-2.5 shadow-lg flex items-center justify-between gap-2 text-left"
          data-testid="ios-install-banner"
        >
          <div
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
            onClick={() => setShowIOSDrawer(true)}
          >
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-white">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                Instalar en Pantalla de Inicio
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                Toca para ver los 2 pasos en iOS
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* iOS Safari Guided Installation Drawer / Modal */}
      {showIOSDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
          data-testid="ios-install-modal"
          onClick={() => setShowIOSDrawer(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-700 bg-[var(--bg-surface)] p-5 shadow-2xl flex flex-col space-y-4 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-y-auto scroll-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Download className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-[var(--text-primary)]">
                  Instalar en iOS
                </h3>
              </div>
              <button
                onClick={() => setShowIOSDrawer(false)}
                className="p-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Cerrar guía"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-[var(--bg-elevated)] border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-black text-sm">
                1
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>Pulsa el botón Compartir</span>
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                </p>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  En la barra inferior de Safari, pulsa el icono cuadrado con la flecha hacia arriba.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-[var(--bg-elevated)] border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-sm">
                2
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>Añadir a pantalla de inicio</span>
                  <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                </p>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Desliza hacia abajo en el menú y selecciona «Añadir a pantalla de inicio».
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => setShowIOSDrawer(false)}
                className="w-full py-3 rounded-2xl bg-[var(--accent-primary)] text-black font-extrabold text-xs uppercase tracking-wider active:scale-98 transition-all cursor-pointer min-h-[44px]"
              >
                ¡Entendido!
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-2.5 rounded-2xl text-[var(--text-muted)] hover:text-white text-xs font-semibold cursor-pointer min-h-[44px]"
              >
                No volver a mostrar en 7 días
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
