import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  threshold?: number; // ms to trigger long press (default: 450ms)
}

export function useLongPress({
  onLongPress,
  onClick,
  threshold = 450,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isLongPressRef.current = false;
      const point = 'touches' in e ? e.touches[0] : e;
      startPosRef.current = { x: point.clientX, y: point.clientY };

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(40);
          } catch {}
        }
        onLongPress(e);
      }, threshold);
    },
    [onLongPress, threshold]
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const move = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!startPosRef.current) return;
      const point = 'touches' in e ? e.touches[0] : e;
      const dx = Math.abs(point.clientX - startPosRef.current.x);
      const dy = Math.abs(point.clientY - startPosRef.current.y);
      // Cancel if user scrolled or moved touch more than 10 pixels
      if (dx > 10 || dy > 10) {
        clear();
      }
    },
    [clear]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isLongPressRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isLongPressRef.current = false;
        return;
      }
      if (onClick) {
        onClick(e);
      }
    },
    [onClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Right click also opens context menu
      e.preventDefault();
      e.stopPropagation();
      onLongPress(e);
    },
    [onLongPress]
  );

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: move,
    onClick: handleClick,
    onContextMenu: handleContextMenu,
  };
}
