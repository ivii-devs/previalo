import React from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Flame, Beer, Users, ShieldAlert } from 'lucide-react';
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

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  card,
  interpolatedText,
  calculatedDrinks,
  assignedPlayers,
  onSwipeNext,
  disabled = false,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 0, 180], [-16, 0, 16]);
  const opacity = useTransform(x, [-250, -150, 0, 150, 250], [0.2, 1, 1, 1, 0.2]);

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

  // Determine card category styling
  const isResolver = CardEngine.isResolverOrCure(card);
  const isCure =
    isResolver && (card.chain?.chain_type === 'timed_virus' || card.type === 'virus');
  const isContinuation = isResolver && !isCure;
  const isVirus = (card.type === 'virus' || Boolean(card.duration_rounds)) && !isResolver;
  const isChallenge = card.type === 'challenge' && !isResolver;
  const intensity = card.intensity ?? 2;

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      onDragEnd={handleDragEnd}
      onClick={handleTap}
      whileTap={{ scale: 0.98 }}
      className={`w-full max-w-sm aspect-[3/4.2] rounded-3xl p-6 border-2 flex flex-col justify-between shadow-2xl relative select-none cursor-grab active:cursor-grabbing backdrop-blur-md transition-shadow ${
        isCure
          ? 'bg-gradient-to-b from-[#0d281e] via-[var(--bg-surface)] to-[var(--bg-surface)] border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
          : isContinuation
          ? 'bg-gradient-to-b from-[#2c2210] via-[var(--bg-surface)] to-[var(--bg-surface)] border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
          : isVirus
          ? 'bg-gradient-to-b from-[#1f132e] via-[var(--bg-surface)] to-[var(--bg-surface)] border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)]'
          : isChallenge
          ? 'bg-gradient-to-b from-[#2e151a] via-[var(--bg-surface)] to-[var(--bg-surface)] border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
          : 'bg-gradient-to-b from-[var(--bg-elevated)] via-[var(--bg-surface)] to-[var(--bg-surface)] theme-border shadow-[var(--glow-shadow)]'
      }`}
      data-testid="swipeable-card"
    >
      {/* Decorative Corner Glow */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
          isCure
            ? 'bg-emerald-500/15'
            : isContinuation
            ? 'bg-amber-500/15'
            : isVirus
            ? 'bg-purple-500/15'
            : 'bg-[var(--accent-primary)]/10'
        }`}
      />

      {/* Top Meta Bar: Category Chip & Intensity Flames */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-1.5">
          {isCure ? (
            <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <span className="text-xs shrink-0">💊</span>
              <span>Cura / Fin de Virus</span>
            </span>
          ) : isContinuation ? (
            <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <span className="text-xs shrink-0">⚡</span>
              <span>Continuación</span>
            </span>
          ) : isVirus ? (
            <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Virus</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[var(--accent-primary)]/20 theme-accent-primary border border-[var(--accent-primary)]/30">
              {card.type ? card.type.toUpperCase() : 'PREVIALO'}
            </span>
          )}

          {card.pack_id && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-text-muted bg-[var(--bg-elevated)] border theme-border">
              {card.pack_id}
            </span>
          )}
        </div>

        {/* Intensity Flame Rating */}
        <div className="flex items-center space-x-0.5" title={`Intensidad ${intensity} de 4`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Flame
              key={i}
              className={`w-4 h-4 transition-colors ${
                i < intensity
                  ? intensity >= 4
                    ? 'text-red-500 fill-red-500 animate-pulse'
                    : intensity === 3
                    ? 'text-orange-500 fill-orange-500'
                    : 'text-amber-400 fill-amber-400'
                  : 'text-gray-600/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Middle Zone: Primary Card Text */}
      <div className="my-auto py-4 flex flex-col justify-center items-center text-center z-10">
        <p className="text-xl sm:text-2xl font-black theme-text-primary leading-snug tracking-tight selectable">
          {interpolatedText || card.text}
        </p>

        {/* Options A and B if present */}
        {card.option_a && card.option_b && (
          <div className="mt-3 flex flex-col space-y-1 text-xs theme-text-muted">
            <span className="font-semibold text-cyan-300">A) {card.option_a}</span>
            <span className="font-semibold text-rose-300">B) {card.option_b}</span>
          </div>
        )}
      </div>

      {/* Bottom Zone: Assigned Players & Drink Penalty */}
      <div className="space-y-3 z-10">
        {/* Drink Penalty Pill */}
        {calculatedDrinks > 0 && (
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-1.5 px-4 py-1.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-bounce">
              <Beer className="w-4 h-4 text-amber-400" />
              <span className="font-black text-sm">
                {calculatedDrinks} {calculatedDrinks === 1 ? 'Trago' : 'Tragos'}
              </span>
            </div>
          </div>
        )}

        {/* Assigned Players Chips */}
        {assignedPlayers && assignedPlayers.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t theme-border">
            <span className="text-[10px] theme-text-muted font-bold flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Para:</span>
            </span>
            {assignedPlayers.map((player) => (
              <span
                key={player.id}
                style={{ borderColor: player.color || '#ec4899' }}
                className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[var(--bg-elevated)] border shadow-xs"
              >
                <span>{player.avatar || '👤'}</span>
                <span className="theme-text-primary">{player.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Tap/Swipe Hint */}
        <div className="text-center text-[10px] theme-text-muted opacity-60">
          Desliza o toca para continuar
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeableCard;
