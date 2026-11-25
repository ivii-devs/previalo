import React from 'react';
import { motion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { soundService } from '../../infrastructure/soundService';

export interface Dice3DProps {
  rolling: boolean;
  value: number | null;
  onRoll: () => void;
  disabled?: boolean;
}

export const Dice3D: React.FC<Dice3DProps> = ({
  rolling,
  value,
  onRoll,
  disabled = false,
}) => {
  const handleClick = () => {
    if (disabled || rolling) return;
    soundService.playDice();
    soundService.vibrate(25);
    onRoll();
  };

  // Render pip dots for die face 1-6
  const renderPips = (face: number) => {
    const pips: React.ReactNode[] = [];
    const gridPositions: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const activeIndices = new Set(gridPositions[face] || [4]);

    for (let i = 0; i < 9; i++) {
      if (activeIndices.has(i)) {
        pips.push(
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-action"
          />
        );
      } else {
        pips.push(<div key={i} className="w-2.5 h-2.5" />);
      }
    }

    return pips;
  };

  const currentFace = value && value >= 1 && value <= 6 ? value : 1;

  return (
    <div
      className="flex items-center justify-between gap-3 w-full select-none"
      data-testid="dice-3d"
    >
      {/* Compact Tactile Matte Die Face (64x64px) */}
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={disabled || rolling}
        animate={
          rolling
            ? {
                rotateX: [0, 180, 360, 540, 720],
                rotateY: [0, 90, 270, 450, 720],
                rotateZ: [0, 45, 135, 225, 360],
                scale: [1, 1.08, 0.96, 1.04, 1],
              }
            : {
                rotateX: 0,
                rotateY: 0,
                rotateZ: 0,
                scale: 1,
              }
        }
        transition={
          rolling
            ? {
                duration: 0.7,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : { duration: 0.18 }
        }
        className={`w-16 h-16 shrink-0 rounded-2xl border-2 border-action bg-surface-muted p-2.5 grid grid-cols-3 grid-rows-3 place-items-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          disabled ? 'opacity-45 cursor-not-allowed' : 'active:scale-95'
        }`}
        aria-label="Tirar dado"
        data-testid="dice-face-btn"
      >
        {renderPips(currentFace)}
      </motion.button>

      {/* Wide Thumb-Zone Roll Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || rolling}
        className={`flex-1 min-h-[48px] py-3 px-4 rounded-2xl font-heading font-extrabold text-sm tracking-tight transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          disabled
            ? 'bg-surface-muted text-text-muted border border-border cursor-not-allowed'
            : rolling
            ? 'bg-surface-raised text-text border border-border-strong'
            : 'bg-action text-action-ink interactive-action active:scale-[0.98]'
        }`}
        data-testid="roll-dice-btn"
      >
        <Dices className="w-4 h-4 shrink-0" />
        <span>
          {rolling ? 'Lanzando...' : value ? `Dado: ${value} · Tirar` : 'Tirar dado'}
        </span>
      </button>
    </div>
  );
};

export default Dice3D;
