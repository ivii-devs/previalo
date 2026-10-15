import React from 'react';

export interface CardDeckProps {
  children: React.ReactNode;
  remainingCount?: number;
}

export const CardDeck: React.FC<CardDeckProps> = ({ children, remainingCount }) => {
  const hasMoreThanOne = (remainingCount ?? 2) > 1;
  const hasMoreThanTwo = (remainingCount ?? 3) > 2;

  return (
    <div
      className="relative w-full max-w-sm mx-auto flex items-center justify-center select-none"
      style={{ perspective: 1000 }}
      data-testid="card-deck"
    >
      {/* Background Shadow Card 2 (Bottom layer) */}
      {hasMoreThanTwo && (
        <div
          className="absolute inset-0 w-full aspect-[3/4.2] rounded-3xl border theme-border bg-[var(--bg-elevated)] opacity-30 shadow-lg pointer-events-none transform translate-y-3.5 -rotate-2 scale-[0.92] transition-transform"
          aria-hidden="true"
        />
      )}

      {/* Background Shadow Card 1 (Middle layer) */}
      {hasMoreThanOne && (
        <div
          className="absolute inset-0 w-full aspect-[3/4.2] rounded-3xl border theme-border bg-[var(--bg-surface)] opacity-70 shadow-xl pointer-events-none transform translate-y-1.5 rotate-1.5 scale-[0.96] transition-transform"
          aria-hidden="true"
        />
      )}

      {/* Foreground Interactive Card (Top layer) */}
      <div className="relative z-10 w-full flex justify-center">
        {children}
      </div>
    </div>
  );
};

export default CardDeck;
