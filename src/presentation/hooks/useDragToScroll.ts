import { useEffect, type RefObject } from 'react';

/**
 * Hook to enable smooth click-and-drag scrolling on desktop/laptop mouse interactions
 * for any `.scroll-container` without breaking native mobile touch behavior or button clicks.
 */
export function useDragToScroll(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isDown = false;
    let startY = 0;
    let startScrollTop = 0;
    let isDragging = false;

    const onMouseDown = (e: MouseEvent) => {
      // Only respond to primary (left) mouse button
      if (e.button !== 0) return;
      isDown = true;
      isDragging = false;
      startY = e.pageY;
      startScrollTop = el.scrollTop;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const deltaY = e.pageY - startY;
      if (Math.abs(deltaY) > 5) {
        isDragging = true;
        el.scrollTop = startScrollTop - deltaY;
      }
    };

    const onMouseUp = () => {
      isDown = false;
    };

    // Capture click to suppress trigger on child buttons if dragged
    const onClickCapture = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('click', onClickCapture, { capture: true });

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('click', onClickCapture, { capture: true });
    };
  }, [containerRef]);
}
