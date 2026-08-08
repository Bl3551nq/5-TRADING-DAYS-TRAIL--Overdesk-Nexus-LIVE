import React, { useRef, useEffect, useState } from 'react';
import './GooeyNav.css';

export interface GooeyNavItem {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
  value?: any;
}

export interface GooeyNavProps {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
  activeIndex?: number;
  onChange?: (index: number, item: GooeyNavItem) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const triggerGooeyParticles = (
  element: HTMLElement,
  accentColor: string = 'var(--accent, #3b82f6)',
  particleCount = 15
) => {
  if (!element || document.body.classList.contains('animations-disabled')) return;
  const rect = element.getBoundingClientRect();
  const filterOverlay = document.createElement('div');
  filterOverlay.style.position = 'fixed';
  filterOverlay.style.left = `${rect.left}px`;
  filterOverlay.style.top = `${rect.top}px`;
  filterOverlay.style.width = `${rect.width}px`;
  filterOverlay.style.height = `${rect.height}px`;
  filterOverlay.style.pointerEvents = 'none';
  filterOverlay.style.zIndex = '9999';
  filterOverlay.className = 'gooey-nav-particle-overlay';

  document.body.appendChild(filterOverlay);

  const colors = [accentColor, '#38bdf8', '#818cf8', '#ffffff'];
  const noise = (n = 1) => n / 2 - Math.random() * n;
  const particleDistances: [number, number] = [80, 10];
  const particleR = 100;
  const animationTime = 600;

  for (let i = 0; i < particleCount; i++) {
    const angle = ((360 + noise(8)) / particleCount) * i * (Math.PI / 180);
    const startX = particleDistances[0] * Math.cos(angle);
    const startY = particleDistances[0] * Math.sin(angle);
    const endX = (particleDistances[1] + noise(7)) * Math.cos(angle);
    const endY = (particleDistances[1] + noise(7)) * Math.sin(angle);
    const scale = 1 + noise(0.2);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const rotate = noise(particleR / 10) * 10;

    const particle = document.createElement('span');
    const point = document.createElement('span');
    particle.className = 'particle';
    particle.style.setProperty('--start-x', `${startX}px`);
    particle.style.setProperty('--start-y', `${startY}px`);
    particle.style.setProperty('--end-x', `${endX}px`);
    particle.style.setProperty('--end-y', `${endY}px`);
    particle.style.setProperty('--time', `${animationTime}ms`);
    particle.style.setProperty('--scale', `${scale}`);
    particle.style.setProperty('--color', color);
    particle.style.setProperty('--rotate', `${rotate}deg`);

    point.className = 'point';
    particle.appendChild(point);
    filterOverlay.appendChild(particle);
  }

  setTimeout(() => {
    if (document.body.contains(filterOverlay)) {
      document.body.removeChild(filterOverlay);
    }
  }, animationTime + 150);
};

const GooeyNav: React.FC<GooeyNavProps> = ({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
  activeIndex: controlledActiveIndex,
  onChange,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLUListElement | null>(null);
  const filterRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [internalActiveIndex, setInternalActiveIndex] = useState(initialActiveIndex);

  const activeIndex = controlledActiveIndex !== undefined ? controlledActiveIndex : internalActiveIndex;

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i: number, t: number, d: [number, number] | number[], r: number) => {
    const rotate = noise(r / 10);
    const d0 = d[0] ?? 90;
    const d1 = d[1] ?? 10;
    return {
      start: getXY(d0, particleCount - i, particleCount),
      end: getXY(d1 + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  };

  const makeParticles = (element: HTMLElement) => {
    if (document.body.classList.contains('animations-disabled') || particleCount === 0) return;
    const d = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);

    element.classList.remove('active');

    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);

      const particle = document.createElement('span');
      const point = document.createElement('span');
      particle.classList.add('particle');
      particle.style.setProperty('--start-x', `${p.start[0]}px`);
      particle.style.setProperty('--start-y', `${p.start[1]}px`);
      particle.style.setProperty('--end-x', `${p.end[0]}px`);
      particle.style.setProperty('--end-y', `${p.end[1]}px`);
      particle.style.setProperty('--time', `${p.time}ms`);
      particle.style.setProperty('--scale', `${p.scale}`);
      particle.style.setProperty('--color', `var(--color-${p.color}, var(--accent, #3b82f6))`);
      particle.style.setProperty('--rotate', `${p.rotate}deg`);

      point.classList.add('point');
      particle.appendChild(point);
      element.appendChild(particle);

      setTimeout(() => {
        try {
          if (element.contains(particle)) {
            element.removeChild(particle);
          }
        } catch {
          // Ignore if removed
        }
      }, t);
    }

    requestAnimationFrame(() => {
      element.classList.add('active');
    });
  };

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current) return;
    const container = containerRef.current;
    const cRect = container.getBoundingClientRect();
    const eRect = element.getBoundingClientRect();

    const scaleX = container.offsetWidth > 0 ? cRect.width / container.offsetWidth : 1;
    const scaleY = container.offsetHeight > 0 ? cRect.height / container.offsetHeight : 1;

    const left = (eRect.left - cRect.left) / (scaleX || 1);
    const top = (eRect.top - cRect.top) / (scaleY || 1);
    const width = eRect.width / (scaleX || 1);
    const height = eRect.height / (scaleY || 1);

    const styles = {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    };
    Object.assign(filterRef.current.style, styles);
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>, index: number) => {
    const liEl = (e.currentTarget.tagName === 'LI' ? e.currentTarget : e.currentTarget.closest('li')) as HTMLElement;
    if (!liEl) return;

    if (controlledActiveIndex === undefined) {
      setInternalActiveIndex(index);
    }

    items[index]?.onClick?.();
    onChange?.(index, items[index]);

    updateEffectPosition(liEl);

    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll('.particle');
      particles.forEach(p => {
        if (filterRef.current?.contains(p)) {
          filterRef.current.removeChild(p);
        }
      });
    }

    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }

    if (filterRef.current) {
      makeParticles(filterRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e as unknown as React.MouseEvent<HTMLElement>, index);
    }
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex];
    if (activeLi) {
      updateEffectPosition(activeLi as HTMLElement);
      textRef.current?.classList.add('active');
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex];
      if (currentActiveLi) {
        updateEffectPosition(currentActiveLi as HTMLElement);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex, items.length]);

  return (
    <div className={`gooey-nav-container ${className}`} ref={containerRef} style={style}>
      <nav>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li key={index} className={activeIndex === index ? 'active' : ''}>
              <button
                type="button"
                onClick={(e) => handleClick(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <span className="effect filter" ref={filterRef} />
      <span className="effect text" ref={textRef} />
    </div>
  );
};

export default GooeyNav;
