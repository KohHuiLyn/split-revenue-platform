'use client';

import React from 'react';

interface BackgroundEffectsProps {
  variant?: 'default' | 'large' | 'small' | 'single-orb';
  intensity?: number;
}

export function BackgroundEffects({ variant = 'default', intensity = 0.05 }: BackgroundEffectsProps) {
  const config = {
    default: { orb1: 600, orb2: 500, orb2Color: '#ff6b4a' },
    large: { orb1: 800, orb2: 600, orb2Color: '#9b4dca' },
    small: { orb1: 500, orb2: 420, orb2Color: '#ff6b4a' },
    'single-orb': { orb1: 600, orb2: 0, orb2Color: '#ff6b4a' },
  }[variant];

  return (
    <>
      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      
      {/* Primary orb (cyan) */}
      <div 
        className="pointer-events-none absolute top-0 right-0 rounded-full" 
        style={{ 
          width: config.orb1, 
          height: config.orb1, 
          background: '#00d4ff',
          opacity: intensity,
          filter: 'blur(120px)'
        }} 
      />
      
      {/* Secondary orb (coral/purple) */}
      {config.orb2 > 0 && (
        <div 
          className="pointer-events-none absolute bottom-0 left-0 rounded-full" 
          style={{ 
            width: config.orb2, 
            height: config.orb2, 
            background: config.orb2Color,
            opacity: intensity,
            filter: 'blur(120px)'
          }} 
        />
      )}
    </>
  );
}