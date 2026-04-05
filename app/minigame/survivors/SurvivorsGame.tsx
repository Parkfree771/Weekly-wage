'use client';

import { useEffect, useRef } from 'react';
import { GameEngine } from './engine';

export default function SurvivorsGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (engineRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;
    engine.init(containerRef.current);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <div style={{
      width: '100%',
      maxWidth: '720px',
      margin: '0 auto',
      padding: '10px',
    }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />
      <div style={{
        textAlign: 'center',
        marginTop: '10px',
        fontSize: '13px',
        opacity: 0.6,
        color: 'var(--text-color, #333)',
      }}>
        WASD / 방향키로 이동 | 1,2,3 무기 슬롯 전환 | 원소 오브를 주워서 무기 조합
      </div>
    </div>
  );
}
