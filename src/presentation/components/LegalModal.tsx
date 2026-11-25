import React, { useState } from 'react';
import { X, ShieldAlert, FileText, Database, ShieldCheck } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
      data-testid="legal-modal"
    >
      <div className="w-full max-w-md rounded-3xl border-2 theme-border bg-[var(--bg-surface)] p-5 shadow-[var(--glow-shadow)] flex flex-col space-y-4 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b theme-border pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 theme-accent-primary" />
            <h3 className="text-base font-black uppercase tracking-wider theme-text-primary">
              Información Legal & Privacidad
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl border theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Cerrar modal legal"
            data-testid="close-legal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-2xl bg-[var(--bg-elevated)] p-1 border theme-border gap-1 shrink-0">
          <button
            onClick={() => handleTabChange('terms')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
              activeTab === 'terms'
                ? 'bg-[var(--accent-primary)] text-black shadow-sm'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
            data-testid="tab-legal-terms"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Términos (+18)</span>
          </button>
          <button
            onClick={() => handleTabChange('privacy')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
              activeTab === 'privacy'
                ? 'bg-[var(--accent-primary)] text-black shadow-sm'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
            data-testid="tab-legal-privacy"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Privacidad</span>
          </button>
          <button
            onClick={() => handleTabChange('storage')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
              activeTab === 'storage'
                ? 'bg-[var(--accent-primary)] text-black shadow-sm'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
            data-testid="tab-legal-storage"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Almacenamiento</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-container pr-1 space-y-3.5 text-xs text-[var(--text-secondary)] leading-relaxed selectable">
          {activeTab === 'terms' && (
            <div className="space-y-3" data-testid="legal-content-terms">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold space-y-1">
                <p className="flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <span>🔞 Uso exclusivo para mayores de edad</span>
                </p>
                <p className="text-[11px] font-normal text-amber-200/90">
                  Previalo es una aplicación de ocio social dirigida únicamente a mayores de edad (+18 años en España / según la mayoría de edad de tu país).
                </p>
              </div>

              <div>
                <h4 className="font-bold theme-text-primary text-sm mb-1">
                  1. Consumo Responsable y Voluntario
                </h4>
                <p>
                  El consumo de cualquier bebida o participación en retos es enteramente voluntario. Ningún jugador debe ser forzado o presionado a beber o actuar en contra de su voluntad. Se promueve el consumo responsable, la hidratación constante y la sustitución de bebidas alcohólicas por alternativas sin alcohol en cualquier momento del juego.
                </p>
              </div>

              <div>
                <h4 className="font-bold theme-text-primary text-sm mb-1">
                  2. Cero Tolerancia: Si bebes, no conduzcas
                </h4>
                <p>
                  Previalo condena tajantemente la conducción de vehículos bajo los efectos del alcohol. Si has consumido bebidas alcohólicas, utiliza transporte público, taxi o designa un conductor sobrio.
                </p>
              </div>

              <div>
                <h4 className="font-bold theme-text-primary text-sm mb-1">
                  3. Exención de Responsabilidad
                </h4>
                <p>
                  Los creadores y colaboradores de Previalo no se responsabilizan de conductas temerarias, daños materiales, personales o sanciones derivadas del uso de la aplicación.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3" data-testid="legal-content-privacy">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold space-y-1">
                <p className="flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <span>🔒 Privacidad Total y Arquitectura Local (RGPD)</span>
                </p>
                <p className="text-[11px] font-normal text-emerald-200/90">
                  Previalo es 100% frontend-only. Tus datos nunca salen de tu propio navegador.
                </p>
              </div>

              <div>
                <h4 className="font-bold theme-text-primary text-sm mb-1">
                  1. Cero Rastreo y Sin Servidores
                </h4>
                <p>
                  Previalo no posee bases de datos externas ni servidores que recopilen telemetría o información personal. Los nombres de jugadores, partidas, elecciones y estadísticas residen única y exclusivamente en la memoria local de tu dispositivo.
                </p>
              </div>

              <div>
                <h4 className="font-bold theme-text-primary text-sm mb-1">
                  2. Ausencia de Terceros y Publicidad
                </h4>
                <p>
                  No integramos Google Analytics, Facebook Pixel, redes publicitarias ni ningún software espía o de seguimiento de comportamiento.
                </p>
              </div>

              <div>
                <h4 className="font-bold theme-text-primary text-sm mb-1">
                  3. Derecho de Supresión
                </h4>
                <p>
                  Puedes ejercer tu derecho de borrado total en cualquier momento desde la pantalla de Configuración pulsando «Borrar datos locales y reiniciar caché».
                </p>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-3" data-testid="legal-content-storage">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold space-y-1">
                <p className="flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <span>💾 Almacenamiento Estrictamente Técnico (Art. 22.2 LSSI)</span>
                </p>
                <p className="text-[11px] font-normal text-cyan-200/90">
                  Exento de banners molestos de consentimiento por ser técnicamente imprescindible para la prestación del servicio.
                </p>
              </div>

              <div>
                <h4 className="font-bold theme-text-primary text-sm mb-1">
                  1. Uso de LocalStorage
                </h4>
                <p>
                  Se utiliza para recordar tus preferencias operativas básicas: selección de tema visual, activación de efectos de sonido y vibración háptica, y estado del aviso de instalación.
                </p>
              </div>

              <div>
                <h4 className="font-bold theme-text-primary text-sm mb-1">
                  2. Uso de IndexedDB & Caché PWA
                </h4>
                <p>
                  Se utiliza a través de IndexedDB (clave-valor) y el Service Worker para descargar y conservar las cartas y tableros en tu dispositivo, permitiendo jugar en aviones, playas o zonas sin cobertura móvil (modo Offline-First).
                </p>
              </div>

              <div>
                <h4 className="font-bold theme-text-primary text-sm mb-1">
                  3. Cumplimiento Normativo
                </h4>
                <p>
                  Al no utilizarse cookies de seguimiento publicitario ni perfiles analíticos, el almacenamiento técnico cumple escrupulosamente con el artículo 22.2 de la Ley 34/2002 (LSSI-CE) y las directrices de la Agencia Española de Protección de Datos (AEPD).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div className="pt-2 border-t theme-border shrink-0">
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-2xl bg-[var(--accent-primary)] text-black font-extrabold text-xs uppercase tracking-wider active:scale-98 transition-all cursor-pointer min-h-[44px]"
            data-testid="legal-close-btn"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
