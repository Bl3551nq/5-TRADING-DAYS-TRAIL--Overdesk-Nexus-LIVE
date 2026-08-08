import { useRef } from 'react';
import VariableProximity from './VariableProximity';

interface InteractiveNewsTitleProps {
  title: string;
  isLight: boolean;
}

export default function InteractiveNewsTitle({ title, isLight }: InteractiveNewsTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        fontSize: '11.5px',
        fontWeight: 700,
        color: isLight ? '#0f172a' : '#ffffff',
        fontFamily: "'Roboto Flex', sans-serif",
        lineHeight: '1.25',
        letterSpacing: '-0.015em',
        flex: 1,
        cursor: 'default',
        overflow: 'visible'
      }}
    >
      <VariableProximity
        label={title}
        fromFontVariationSettings="'wght' 500, 'opsz' 9"
        toFontVariationSettings="'wght' 1000, 'opsz' 40"
        containerRef={containerRef}
        radius={120}
        falloff="linear"
      />
    </div>
  );
}

export function InteractiveNewsHeader({ title, isLight }: InteractiveNewsHeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        fontSize: '21px',
        fontWeight: 800,
        fontFamily: "'Roboto Flex', sans-serif",
        letterSpacing: '-0.02em',
        color: isLight ? '#0f172a' : '#ffffff',
        margin: 0,
        lineHeight: '1.2',
        cursor: 'default',
        overflow: 'visible'
      }}
    >
      <VariableProximity
        label={title}
        fromFontVariationSettings="'wght' 800, 'opsz' 14"
        toFontVariationSettings="'wght' 1000, 'opsz' 40"
        containerRef={containerRef}
        radius={180}
        falloff="linear"
      />
    </div>
  );
}

interface InteractiveNewsHeaderProps {
  title: string;
  isLight: boolean;
}
