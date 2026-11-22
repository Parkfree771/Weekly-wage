'use client';

// 이관 미리보기 + 성장 시뮬 — 위에서 캐릭터를 검색하면 아래 시뮬이 그 캐릭의 이관 상태(등급 · 연마 · 슬롯 재련)에서 시작한다.
// 검색할 때마다 시뮬을 새로 띄운다(key).

import { useState } from 'react';
import GrowthMigration from './GrowthMigration';
import GrowthSimulator from './GrowthSimulator';
import { toSimStart, type SimStart } from './migration';

export default function GrowthLinked() {
  const [start, setStart] = useState<SimStart | undefined>(undefined);
  const [ver, setVer] = useState(0);
  return (
    <>
      <GrowthMigration onResult={m => { setStart(toSimStart(m)); setVer(v => v + 1); }} />
      <GrowthSimulator key={ver} start={start} />
    </>
  );
}
