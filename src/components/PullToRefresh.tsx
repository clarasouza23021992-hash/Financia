import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowDown, CheckCircle2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  isRefreshing?: boolean;
}

const PULL_THRESHOLD = 60;
const MAX_PULL = 90;

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  isRefreshing: externalRefreshing = false,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isRefreshing = externalRefreshing || internalRefreshing;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull-to-refresh if we are at the top of the page
      const scrollTop = window.scrollY || document.documentElement.scrollTop || (containerRef.current?.scrollTop ?? 0);
      if (scrollTop <= 2 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || (containerRef.current?.scrollTop ?? 0);

      if (diff > 0 && scrollTop <= 2) {
        // Apply friction dampening
        const damped = Math.min(MAX_PULL, diff * 0.45);
        setPullDistance(damped);

        // Prevent native rubber-banding if we are actively pulling
        if (damped > 10 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
        isPullingRef.current = false;
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current && pullDistance === 0) return;
      isPullingRef.current = false;

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setPullDistance(PULL_THRESHOLD);
        setInternalRefreshing(true);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(20);
          } catch {
            // Ignore if vibration not permitted
          }
        }

        try {
          await onRefresh();
          setRefreshSuccess(true);
          setTimeout(() => {
            setRefreshSuccess(false);
            setInternalRefreshing(false);
            setPullDistance(0);
          }, 600);
        } catch {
          setInternalRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    const target = containerRef.current || window;
    target.addEventListener('touchstart', handleTouchStart as any, { passive: true });
    target.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    target.addEventListener('touchend', handleTouchEnd as any, { passive: true });
    target.addEventListener('touchcancel', handleTouchEnd as any, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart as any);
      target.removeEventListener('touchmove', handleTouchMove as any);
      target.removeEventListener('touchend', handleTouchEnd as any);
      target.removeEventListener('touchcancel', handleTouchEnd as any);
    };
  }, [isRefreshing, onRefresh, pullDistance]);

  const rotation = Math.min(180, (pullDistance / PULL_THRESHOLD) * 180);
  const opacity = Math.min(1, pullDistance / (PULL_THRESHOLD * 0.6));

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Pull Indicator Container */}
      <div
        id="pull-to-refresh-indicator"
        className="overflow-hidden transition-all ease-out flex items-center justify-center pointer-events-none"
        style={{
          height: isRefreshing ? '48px' : `${pullDistance}px`,
          transitionDuration: isPullingRef.current ? '0ms' : '220ms',
          opacity: isRefreshing || pullDistance > 8 ? 1 : 0,
        }}
      >
        <div
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          style={{ opacity: isRefreshing ? 1 : opacity }}
        >
          {refreshSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-scale" />
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Atualizado com sucesso!</span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin" />
              <span>Sincronizando com a casa...</span>
            </>
          ) : pullDistance >= PULL_THRESHOLD ? (
            <>
              <RefreshCw className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-teal-600 dark:text-teal-400 font-bold">Solte para atualizar</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="w-4 h-4 text-slate-500 transition-transform duration-100"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <span className="text-slate-500 dark:text-slate-400">Puxe para atualizar</span>
            </>
          )}
        </div>
      </div>

      {/* Main wrapped content */}
      <div
        style={{
          transform: pullDistance > 0 && !isRefreshing ? `translateY(${Math.min(pullDistance * 0.4, 25)}px)` : 'none',
          transition: isPullingRef.current ? 'none' : 'transform 220ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};
