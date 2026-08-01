import { useEffect, useRef } from 'react';

/**
 * WebGL 只是 Hero 的渐进增强：移动端、低内存设备和减少动态效果偏好会直接跳过。
 * 渲染器使用动态 import，首屏文字和 CTA 不等待任何图形代码。
 */
export default function HeroVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canvas || reduced || window.innerWidth < 768 || memory <= 4) return;

    let dispose: () => void = () => undefined;
    let cancelled = false;
    void import('@/lib/hero-webgl').then(({ createHeroRenderer }) => {
      if (cancelled) return;
      dispose = createHeroRenderer(canvas);
    });

    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-canvas" />;
}
