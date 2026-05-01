import React from 'react';

/**
 * Wraps post body; shows tap-to-reveal overlay when poop ratio is very high.
 */
export default function BlurredPost({ bananas, poops, blurRevealed, onReveal, children }) {
  const totalReactions = bananas + poops;
  const poopRatio = totalReactions > 5 ? poops / totalReactions : 0;
  const showBlur = poopRatio > 0.8 && !blurRevealed;

  return (
    <>
      {showBlur && (
        <div className="blur-overlay" onClick={onReveal}>
          <span>💩 This post is {Math.round(poopRatio * 100)}% poop — tap to view anyway</span>
        </div>
      )}
      {children}
    </>
  );
}
