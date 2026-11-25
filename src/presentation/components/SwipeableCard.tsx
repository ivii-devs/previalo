import React from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Flame, Beer, Users, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import type { Card } from '../../domain/types/card';
import type { Player } from '../../domain/types/player';
import { CardEngine } from '../../domain/engines/CardEngine';
import { soundService } from '../../infrastructure/soundService';

export interface SwipeableCardProps {
  card: Card;
  interpolatedText: string;
  calculatedDrinks: number;
  assignedPlayers: Player[];
  onSwipeNext: () => void;
  disabled?: boolean;
}

const formatCardTypeLabel = (type?: string): string => {
  switch (type) {
    case 'rule':
      return 'Regla';
    case 'challenge':
      return 'Reto';
    case 'dare':
      return 'Reto';
    case 'truth':
      return 'Verdad';
    case 'never_have_i_ever':
    case 'yo_nunca':
      return 'Yo nunca';
    case 'would_you_rather':
    case 'que_prefieres':
      return '¿Qué prefieres?';
    case 'most_likely':
    case 'quien_es_mas_probable':
      return 'Votación';
    case 'versus':
      return 'Duelo';
    case 'team':
    case 'team_battle':
      return 'Equipos';
    case 'confession':
      return 'Confesión';
    case 'minigame':
      return 'Minijuego';
    case 'hot':
      return 'Picante';
    case 'question':
      return 'Pregunta';
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Previalo';
  }
};

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  card,
  interpolatedText,
  calculatedDrinks,
  assignedPlayers,
  onSwipeNext,
  disabled = false,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 0, 180], [-14, 0, 14]);
  const opacity = useTransform(x, [-240, -140, 0, 140, 240], [0.25, 1, 1, 1, 0.25]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (disabled) return;
    const swipeThreshold = 80;
    const velocityThreshold = 400;

    if (
      Math.abs(info.offset.x) > swipeThreshold ||
      Math.abs(info.velocity.x) > velocityThreshold
    ) {
      soundService.vibrate(15);
      onSwipeNext();
    }
  };

  const handleTap = () => {
    if (disabled) return;
    soundService.vibrate(10);
    onSwipeNext();
  };

  // Determine semantic card role
  const isResolver = CardEngine.isResolverOrCure(card);
  const isCure =
    isResolver && (card.chain?.chain_type === 'timed_virus' || card.type === 'virus');
  const isContinuation = isResolver && !isCure;
  const isVirus =
    CardEngine.isTimedVirusTrigger(card) || (Boolean(card.duration_rounds) && !isResolver);
  const isChallenge = card.type === 'challenge' && !isResolver;
  const intensity = card.intensity ?? 2;

  const cardSurfaceClass = isCure
    ? 'border-2 border-success-line bg-surface'
    : isContinuation
    ? 'border-2 border-warning-line bg-surface'
    : isVirus
    ? 'border-2 border-virus-line bg-surface'
    : isChallenge
    ? 'border-2 border-action/45 bg-surface'
    : 'border border-border-strong bg-surface';

  const topAccentClass = isCure
    ? 'bg-success'
    : isContinuation
    ? 'bg-warning'
    : isVirus
    ? 'bg-virus'
    : isChallenge
    ? 'bg-action'
    : 'bg-border-strong';

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      onClick={handleTap}
      whileDrag={{ willChange: 'transform' }}
      whileTap={{ scale: 0.985 }}
      className={`w-full max-w-sm min-h-[380px] sm:min-h-[440px] rounded-[20px] p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-card relative overflow-hidden select-none cursor-grab active:cursor-grabbing ${cardSurfaceClass}`}
      data-testid="swipeable-card"
    >
      {/* Crisp Semantic Top Accent Bar */}
      <div className={`absolute top-0 inset-x-0 h-1 ${topAccentClass}`} aria-hidden="true" />

      {/* Top Meta Bar: Semantic Badge & Intensity Flames */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {isCure ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success-quiet text-success border border-success-line">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Cura / Fin de virus</span>
            </span>
          ) : isContinuation ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warning-quiet text-warning border border-warning-line">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Continuación</span>
            </span>
          ) : isVirus ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-virus-quiet text-virus border border-virus-line">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Virus</span>
            </span>
          ) : isChallenge ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-selected text-action border border-action/30">
              {formatCardTypeLabel(card.type)}
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-surface-muted text-text-secondary border border-border">
              {formatCardTypeLabel(card.type)}
            </span>
          )}
        </div>

        {/* Intensity Flame Rating */}
        <div
          className="flex items-center gap-0.5 shrink-0"
          title={`Intensidad ${intensity} de 4`}
          aria-label={`Intensidad ${intensity} de 4`}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Flame
              key={i}
              className={`w-4 h-4 ${
                i < intensity
                  ? intensity >= 4
                    ? 'text-danger fill-danger'
                    : intensity === 3
                    ? 'text-action fill-action'
                    : 'text-warning fill-warning'
                  : 'text-border-strong'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Middle Zone: Primary Card Text */}
      <div className="my-auto py-4 flex flex-col justify-center items-center text-center">
        <p className="font-heading text-xl sm:text-2xl font-bold text-text leading-snug tracking-tight selectable">
          {interpolatedText || card.text}
        </p>

        {/* Options A and B if present */}
        {card.option_a && card.option_b && (
          <div className="mt-4 w-full space-y-2 text-left text-xs">
            <div className="px-3 py-2 rounded-xl bg-surface-muted border border-border text-text-secondary selectable">
              <span className="font-bold text-info mr-1.5">A)</span>
              <span>{card.option_a}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-surface-muted border border-border text-text-secondary selectable">
              <span className="font-bold text-action mr-1.5">B)</span>
              <span>{card.option_b}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Zone: Drink Penalty & Assigned Players */}
      <div className="space-y-3">
        {/* Matte Amber Drink Penalty Pill */}
        {calculatedDrinks > 0 && (
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-warning-quiet text-warning border border-warning-line">
              <Beer className="w-4 h-4 shrink-0" />
              <span className="font-heading font-bold text-sm">
                {calculatedDrinks} {calculatedDrinks === 1 ? 'trago' : 'tragos'}
              </span>
            </div>
          </div>
        )}

        {/* Assigned Players Chips (keeping emoji avatars) */}
        {assignedPlayers && assignedPlayers.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2.5 border-t border-border">
            <span className="text-xs text-text-muted font-medium flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>Para:</span>
            </span>
            {assignedPlayers.map((player) => (
              <span
                key={player.id}
                style={{ borderColor: player.color || 'var(--pv-border-strong)' }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-muted border text-text"
              >
                <span aria-hidden="true">{player.avatar || '👤'}</span>
                <span>{player.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Tap/Swipe Hint */}
        <div className="text-center text-[11px] text-text-muted">
          Desliza o toca para continuar
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeableCard;
