'use client';

import dynamic from 'next/dynamic';

const SignalGame = dynamic(() => import('./signal/SignalGame'), { ssr: false });

export default function MiniGamePage() {
  return <SignalGame />;
}
