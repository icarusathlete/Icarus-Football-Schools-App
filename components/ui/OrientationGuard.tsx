import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const OrientationGuard: React.FC = () => {
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  useEffect(() => {
    const orientation = window.screen && window.screen.orientation;
    if (orientation && typeof (orientation as any).lock === 'function') {
      (orientation as any).lock('portrait').catch((err: any) => {
        // Ignored safely if standard web context/browser security denies permission.
        console.debug('Programmatic screen orientation lock skipped:', err);
      });
    }

    const checkOrientation = () => {
      // Standard mobile phones in landscape mode have extremely small heights (usually < 480px)
      // Whereas tablets (iPad mini, iPad) and desktops have heights >= 600px.
      // This query prevents false-positives on wider devices while accurately detecting phones in landscape.
      const isMobileLandscape = window.matchMedia('(max-height: 480px) and (orientation: landscape)').matches;
      setIsLandscapeMobile(isMobileLandscape);
    };

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscapeMobile) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-brand-950 p-6 overflow-hidden select-none animate-in fade-in duration-300">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />
      
      {/* Glowing Accents matching brand palette */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-brand-primary/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-brand-accent/5 rounded-full blur-[60px] pointer-events-none" />

      {/* Glass HUD Container */}
      <div className="relative max-w-sm w-full p-8 rounded-3xl bg-gradient-to-br from-brand-950/98 to-brand-900/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,200,255,0.15)] flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
        
        {/* HUD Reticle Corners */}
        <div className="hud-reticle-corner corner-tl opacity-80" />
        <div className="hud-reticle-corner corner-tr opacity-80" />
        <div className="hud-reticle-corner corner-bl opacity-80" />
        <div className="hud-reticle-corner corner-br opacity-80" />

        {/* Dynamic Rotation Icon Assembly */}
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 border border-brand-primary/10 rounded-full scale-100 animate-pulse" />
          <div className="absolute inset-2 border border-brand-accent/10 rounded-full scale-110 animate-ping opacity-30 duration-1000" />
          
          <div className="relative flex items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-2xl">
            <Smartphone 
              className="w-8 h-8 text-white animate-rotate-prompt" 
              style={{ filter: 'drop-shadow(0 0 8px rgba(0, 200, 255, 0.4))' }}
            />
            <RotateCw className="absolute -top-1 -right-1 w-4 h-4 text-brand-accent animate-spin-slow" />
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-3 z-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary italic">
            Device Check Required
          </h2>
          <h1 className="text-xl font-black uppercase tracking-wider text-white italic">
            Portrait Mode Required
          </h1>
          <p className="text-xs text-white/60 font-medium leading-relaxed max-w-[260px] mx-auto">
            Please rotate your device back to portrait orientation to experience Academy Portal properly.
          </p>
        </div>

        {/* HUD Pulse Status */}
        <div className="mt-6 pt-4 border-t border-white/5 w-full flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-accent/80 italic">
            Awaiting Rotation...
          </span>
        </div>
      </div>
    </div>
  );
};
