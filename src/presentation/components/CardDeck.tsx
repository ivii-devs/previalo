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
      className="relative w-full max-w-sm mx-auto flex items-center justify-center select-none pb-2"
      style={{ perspective: 1000 }}
      data-testid="card-deck"
    >
      {/* Background Deck Layer 2 */}
      {hasMoreThanTwo && (
        <div
          className="absolute inset-x-0 top-0 bottom-2 w-full rounded-[20px] border border-border bg-surface-muted opacity-50 pointer-events-none transform translate-y-3 -rotate-2 scale-[0.93] transition-transform"
          aria-hidden="true"
        />
      )}

      {/* Background Deck Layer 1 */}
      {hasMoreThanOne && (
        <div
          className="absolute inset-x-0 top-0 bottom-2 w-full rounded-[20px] border border-border bg-surface opacity-85 pointer-events-none transform translate-y-1.5 rotate-1 scale-[0.97] transition-transform"
          aria-hidden="true"
        />
      )}

      {/* Foreground Interactive Card */}
      <div className="relative z-10 w-full flex justify-center">
        {children}
      </div>
    </div>
  );
};

export default CardDeck;
