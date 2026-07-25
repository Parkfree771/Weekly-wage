import CharacterPageClient from './CharacterPageClient';
import { listRanking } from '@/lib/character-cache';
import type { RankingEntry } from '@/components/character/CharacterRanking';

// 랭킹 첫 페이지를 서버에서 미리 조회해 HTML에 포함 — JS 로드·하이드레이션·API 왕복을
// 기다리지 않고 첫 페인트에 랭킹이 바로 그려진다. 5분마다 백그라운드 재생성(ISR).
export const revalidate = 300;

export default async function CharacterPage() {
  let initialRanking: RankingEntry[] = [];
  try {
    const rows = await listRanking({ limit: 30, slimCores: true });
    // Date 등 비직렬화 값 정리 (클라이언트 컴포넌트 props는 JSON 직렬화 가능해야 함)
    initialRanking = JSON.parse(JSON.stringify(rows));
  } catch {
    // DB 장애 시에도 페이지는 뜬다 — 클라이언트 fetch가 기존 방식대로 채움
  }
  return <CharacterPageClient initialRanking={initialRanking} />;
}
