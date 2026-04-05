'use client';

import dynamic from 'next/dynamic';

const SurvivorsGame = dynamic(() => import('./survivors/SurvivorsGame'), { ssr: false });

export default function MiniGamePage() {
  return <SurvivorsGame />;
}
