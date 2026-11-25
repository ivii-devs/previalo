import React, { useState } from 'react';
import { X, ShieldAlert, FileText, Database, ShieldCheck, Lock } from 'lucide-react';
import { soundService } from '../../infrastructure/soundService';

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'terms' | 'privacy' | 'storage';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'storage'>(defaultTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const handleTabChange = (tab: 'terms' | 'privacy' | 'storage') => {
    soundService.playTap();
    setActiveTab(tab);
  };

  const handleClose = () => {
    soundService.playTap();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/75 select-none"
      data-testid="legal-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="w-full max-w-md rounded-[20px] border border-border-strong bg-surface p-5 shadow-modal flex flex-col space-y-4 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-action shrink-0" />
            <h3 id="legal-modal-title" className="font-heading text-base font-bold text-text">
              Información legal y privacidad
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-w-[44px] min-h-[44px] -mr-1 rounded-xl border border-border bg-surface-muted text-text-secondary interactive-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Cerrar modal legal"
            data-testid="close-legal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 rounded-2xl bg-surface-muted p-1 border border-border gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('terms')}
            className={`py-1.5 px-1.5 rounded-xl text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              activeTab === 'terms'
                ? 'bg-action text-action-ink font-bold'
                : 'text-text-secondary hover:text-text'
            }`}
            data-testid="tab-legal-terms"
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-tight whitespace-nowrap">Términos (+18)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('privacy')}
            className={`py-1.5 px-1.5 rounded-xl text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              activeTab === 'privacy'
                ? 'bg-action text-action-ink font-bold'
                : 'text-text-secondary hover:text-text'
            }`}
            data-testid="tab-legal-privacy"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-tight whitespace-nowrap">Privacidad</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('storage')}
            className={`py-1.5 px-1.5 rounded-xl text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              activeTab === 'storage'
                ? 'bg-action text-action-ink font-bold'
                : 'text-text-secondary hover:text-text'
            }`}
            data-testid="tab-legal-storage"
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-tight whitespace-nowrap">Datos</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-container pr-1 space-y-4 text-xs text-text-secondary leading-relaxed selectable">
          {activeTab === 'terms' && (
            <div className="space-y-3.5" data-testid="legal-content-terms">
              <div className="p-3.5 rounded-2xl bg-warning-quiet border border-warning-line text-warning space-y-1">
                <p className="flex items-center gap-1.5 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Uso exclusivo para mayores de edad (+18)</span>
                </p>
                <p className="text-xs font-normal text-text-secondary">
                  Previalo es una aplicación de ocio social dirigida únicamente a mayores de edad (+18 años en España o según la mayoría de edad de tu país).
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-text text-sm mb-1">
                  1. Consumo responsable y voluntario
                </h4>
                <p>
                  El consumo de cualquier bebida o participación en retos es enteramente voluntario. Ningún jugador debe ser forzado o presionado a beber o actuar en contra de su voluntad. Se promueve el consumo responsable, la hidratación constante y la sustitución de bebidas alcohólicas por alternativas sin alcohol en cualquier momento del juego.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-text text-sm mb-1">
                  2. Cero tolerancia: si bebes, no conduzcas
                </h4>
                <p>
                  Previalo condena tajantemente la conducción de vehículos bajo los efectos del alcohol. Si has consumido bebidas alcohólicas, utiliza transporte público, taxi o designa un conductor sobrio.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-text text-sm mb-1">
                  3. Exención de responsabilidad
                </h4>
                <p>
                  Los creadores y colaboradores de Previalo no se responsabilizan de conductas temerarias, daños materiales, personales o sanciones derivadas del uso de la aplicación.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3.5" data-testid="legal-content-privacy">
              <div className="p-3.5 rounded-2xl bg-success-quiet border border-success-line text-success space-y-1">
                <p className="flex items-center gap-1.5 font-bold text-xs">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Privacidad total y arquitectura local (RGPD)</span>
                </p>
                <p className="text-xs font-normal text-text-secondary">
                  Previalo es 100% frontend-only. Tus datos nunca salen de tu propio navegador.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-text text-sm mb-1">
                  1. Cero rastreo y sin servidores
                </h4>
                <p>
                  Previalo no posee bases de datos externas ni servidores que recopilen telemetría o información personal. Los nombres de jugadores, partidas, elecciones y estadísticas residen única y exclusivamente en la memoria local de tu dispositivo.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-text text-sm mb-1">
                  2. Ausencia de terceros y publicidad
                </h4>
                <p>
                  No integramos Google Analytics, Facebook Pixel, redes publicitarias ni ningún software espía o de seguimiento de comportamiento.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-text text-sm mb-1">
                  3. Derecho de supresión
                </h4>
                <p>
                  Puedes ejercer tu derecho de borrado total en cualquier momento desde la pantalla de Configuración pulsando «Borrar datos locales y vaciar caché».
                </p>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-3.5" data-testid="legal-content-storage">
              <div className="p-3.5 rounded-2xl bg-info-quiet border border-info-line text-info space-y-1">
                <p className="flex items-center gap-1.5 font-bold text-xs">
                  <Database className="w-4 h-4 shrink-0" />
                  <span>Almacenamiento estrictamente técnico (Art. 22.2 LSSI)</span>
                </p>
                <p className="text-xs font-normal text-text-secondary">
                  Exento de banners molestos de consentimiento por ser técnicamente imprescindible para la prestación del servicio.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-text text-sm mb-1">
                  1. Uso de LocalStorage
                </h4>
                <p>
                  Se utiliza para recordar tus preferencias operativas básicas: selección de tema visual, activación de efectos de sonido y vibración háptica, y estado del aviso de instalación.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-text text-sm mb-1">
                  2. Uso de IndexedDB y caché PWA
                </h4>
                <p>
                  Se utiliza a través de IndexedDB (clave-valor) y el Service Worker para descargar y conservar las cartas y tableros en tu dispositivo, permitiendo jugar en aviones, playas o zonas sin cobertura móvil (modo Offline-First).
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-text text-sm mb-1">
                  3. Cumplimiento normativo
                </h4>
                <p>
                  Al no utilizarse cookies de seguimiento publicitario ni perfiles analíticos, el almacenamiento técnico cumple escrupulosamente con el artículo 22.2 de la Ley 34/2002 (LSSI-CE) y las directrices de la Agencia Española de Protección de Datos (AEPD).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div className="pt-2 border-t border-border shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="w-full min-h-[48px] py-3 rounded-2xl bg-action text-action-ink font-heading font-extrabold text-sm interactive-action active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer"
            data-testid="legal-close-btn"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
