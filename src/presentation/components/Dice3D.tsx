import React from 'react';
import { motion } from 'framer-motion';
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
    // 3x3 grid layout positions for dice dots
    const gridPositions: Record<number, number[]> = {
      1: [4], // Center
      2: [0, 8], // Top-left, bottom-right
      3: [0, 4, 8], // Diagonal
      4: [0, 2, 6, 8], // Four corners
      5: [0, 2, 4, 6, 8], // Corners + center
      6: [0, 2, 3, 5, 6, 8], // Two columns of three
    };

    const activeIndices = new Set(gridPositions[face] || [4]);

    for (let i = 0; i < 9; i++) {
      if (activeIndices.has(i)) {
        pips.push(
          <div
            key={i}
            className="w-3.5 h-3.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]"
          />
        );
      } else {
        pips.push(<div key={i} className="w-3.5 h-3.5" />);
      }
    }

    return pips;
  };

  const currentFace = value && value >= 1 && value <= 6 ? value : 1;

  return (
    <div className="flex flex-col items-center justify-center space-y-3 select-none" data-testid="dice-3d">
      {/* 3D Dice Face */}
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
                scale: [1, 1.15, 0.95, 1.1, 1],
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
            : { duration: 0.2 }
        }
        className={`w-24 h-24 rounded-3xl border-2 border-[var(--accent-primary)] bg-gradient-to-br from-[var(--bg-elevated)] via-[var(--bg-surface)] to-[var(--bg-base)] p-3.5 grid grid-cols-3 grid-rows-3 place-items-center shadow-[0_0_25px_var(--border-color)] transition-all cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
        }`}
        aria-label="Tirar dado"
        data-testid="dice-face-btn"
      >
        {renderPips(currentFace)}
      </motion.button>

      {/* Action Button & Value Text */}
      <div className="text-center">
        <button
          onClick={handleClick}
          disabled={disabled || rolling}
          className={`px-5 py-2 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-md cursor-pointer ${
            disabled
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : rolling
              ? 'bg-[var(--accent-secondary)] text-white animate-pulse'
              : 'bg-[var(--accent-primary)] text-white hover:brightness-110 active:scale-95 shadow-[var(--glow-shadow)]'
          }`}
          data-testid="roll-dice-btn"
        >
          {rolling ? 'Lanzando...' : value ? `Dado: ${value} (Tirar)` : 'Tirar Dado'}
        </button>
      </div>
    </div>
  );
};

export default Dice3D;
