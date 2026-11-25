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

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Native Install Banner (Android / Chrome Desktop) */}
      {canInstallNative && (
        <div
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm bg-surface border border-border-strong rounded-2xl p-3 shadow-modal flex items-center justify-between gap-2 text-left"
          data-testid="pwa-install-banner"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-selected border border-action/30 flex items-center justify-center shrink-0 text-action">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-xs font-bold text-text truncate">
                Instalar Previalo
              </p>
              <p className="text-[11px] text-text-muted truncate">
                Juega 100% offline a pantalla completa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleNativeInstall}
              className="px-3 rounded-xl bg-action text-action-ink font-bold text-xs interactive-action active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer min-h-[44px]"
              data-testid="pwa-install-btn"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-xl text-text-muted hover:text-text min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm bg-surface border border-border-strong rounded-2xl p-2.5 shadow-modal flex items-center justify-between gap-2 text-left"
          data-testid="ios-install-banner"
        >
          <button
            type="button"
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 min-h-[44px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-xl px-1"
            onClick={() => setShowIOSDrawer(true)}
          >
            <div className="w-8 h-8 rounded-xl bg-surface-muted border border-border flex items-center justify-center shrink-0 text-text">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-xs font-bold text-text truncate">
                Instalar en Pantalla de Inicio
              </p>
              <p className="text-[11px] text-text-muted truncate">
                Toca para ver los 2 pasos en iOS
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl text-text-muted hover:text-text min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus shrink-0"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* iOS Safari Guided Installation Modal */}
      {showIOSDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/75 select-none"
          data-testid="ios-install-modal"
          onClick={() => setShowIOSDrawer(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-[20px] border border-border-strong bg-surface p-5 shadow-modal flex flex-col space-y-4 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-y-auto scroll-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-surface-muted border border-border flex items-center justify-center text-text">
                  <Download className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-base font-bold text-text">
                  Instalar en iOS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSDrawer(false)}
                className="rounded-xl border border-border bg-surface-muted text-text-secondary interactive-surface min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                aria-label="Cerrar guía"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-muted border border-border">
              <div className="w-8 h-8 rounded-xl bg-info-quiet border border-info-line text-info flex items-center justify-center shrink-0 font-mono font-bold text-sm">
                1
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-text flex items-center gap-1.5">
                  <span>Pulsa el botón Compartir</span>
                  <Share2 className="w-3.5 h-3.5 text-info" />
                </p>
                <p className="text-text-secondary leading-relaxed">
                  En la barra inferior de Safari, pulsa el icono cuadrado con la flecha hacia arriba.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-muted border border-border">
              <div className="w-8 h-8 rounded-xl bg-success-quiet border border-success-line text-success flex items-center justify-center shrink-0 font-mono font-bold text-sm">
                2
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-text flex items-center gap-1.5">
                  <span>Añadir a pantalla de inicio</span>
                  <PlusSquare className="w-3.5 h-3.5 text-success" />
                </p>
                <p className="text-text-secondary leading-relaxed">
                  Desliza hacia abajo en el menú y selecciona «Añadir a pantalla de inicio».
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowIOSDrawer(false)}
                className="w-full min-h-[48px] py-3 rounded-2xl bg-action text-action-ink font-heading font-extrabold text-sm interactive-action active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer"
              >
                Entendido
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full min-h-[44px] py-2.5 rounded-2xl text-text-muted hover:text-text text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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

export default PWAInstallPrompt;
