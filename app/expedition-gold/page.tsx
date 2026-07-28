'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Container, Row, Col } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import { PriceProvider } from '@/contexts/PriceContext';
import AdBanner from '@/components/ads/AdBanner';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';
// 제목·검색창·카드 톤을 주간 골드 페이지와 동일하게 맞춘다 (같은 래퍼 스타일 재사용).
import styles from '@/app/weekly-gold/weekly-gold.module.css';

const expeditionGoldGuideSections = [
  {
    heading: '레벨업 이득을 "전후 통째로 다시 계산"하는 이유',
    paragraphs: [
      '로스트아크의 주간 골드에는 두 가지 상한이 걸려 있습니다. 캐릭터 1명이 주간 골드를 받을 수 있는 레이드는 3개까지이고, 원정대에서 주간 골드가 인정되는 캐릭터는 6명까지입니다. 이 두 제한 때문에 레벨업 이득을 "새로 열린 레이드의 골드"로 계산하면 실제보다 크게 나옵니다.',
      '새 레이드가 상위 3개 안에 들어오는 순간, 원래 세고 있던 레이드 중 가장 낮은 하나가 밀려나기 때문입니다. 실제 이득은 새 레이드의 골드가 아니라 새 레이드와 밀려난 레이드의 차액입니다. 캐릭터 단위에서도, 원정대 상위 6캐릭 단위에서도 같은 일이 일어납니다.',
      '그래서 이 시뮬은 증분을 더하는 방식을 쓰지 않고, 레벨업 전 원정대와 레벨업 후 원정대의 주간 골드를 각각 처음부터 끝까지 다시 계산한 다음 그 차이를 냅니다. 계산이 조금 무겁더라도 상한이 걸린 구조에서는 이 방식만 정확한 값을 냅니다.',
    ],
  },
  {
    heading: '올려도 소득이 없는 구간 (레벨 구간별 손익분기)',
    paragraphs: [
      '주급은 아이템 레벨에 비례해 매끄럽게 오르지 않습니다. 새 레이드의 입장 레벨을 넘는 순간에만 계단식으로 오르고, 그 사이 구간은 아무리 올려도 그대로입니다. 재련 비용은 레벨이 오를수록 가파르게 비싸지므로, 어디까지 올려야 본전인지 아는 것이 중요합니다.',
      '시뮬은 캐릭터마다 다음에 도달 가능한 레벨 구간들을 나열하면서, 그 레벨로 올렸을 때 원정대 주급이 얼마나 바뀌는지를 함께 보여줍니다. 상위 3레이드 구성이 그대로라 골드가 변하지 않는 구간은 따로 표시되므로, 목표를 한 칸 더 위로 잡아야 할지 바로 판단할 수 있습니다.',
    ],
    bullets: [
      '레이드 입장 레벨을 넘기 전까지는 주급이 오르지 않습니다',
      '상위 3레이드 구성이 안 바뀌면 새 레이드가 열려도 골드는 그대로일 수 있습니다',
      '원정대 상위 6캐릭에 들지 못하는 캐릭터는 올려도 원정대 주급에 반영되지 않습니다',
    ],
  },
  {
    heading: '골드만 볼지, 재련 재료까지 볼지',
    paragraphs: [
      '"골드만" 탭은 레이드 클리어로 받는 순수 골드만 계산합니다. 더보기 비용은 넣지 않습니다. 더보기는 골드를 내고 재료를 더 받는 선택이라 그날 시세와 개인 성향에 따라 손익이 달라지고, 레벨업 효과만 비교할 때는 변수를 빼는 편이 정확하기 때문입니다.',
      '"골드 + 재련 재료" 탭은 여기에 재련 재료 수급 변화를 거래소 실시간 시세로 환산해 더합니다. 레이드 클리어 보상뿐 아니라 균열·전선(주 7회), 가디언 토벌(주 7회), 할의 모래시계(주 1회, 보상 강화 1단계 기준), 원정대 대표 캐릭터만 받는 카오스 게이트·필드보스까지 포함합니다.',
      '레벨업의 실제 이득이 골드가 아니라 재료 쪽에서 나오는 경우가 많습니다. 균열이나 가디언 토벌의 재료 티어가 한 단계 올라가면 주간 수급량이 눈에 띄게 달라지기 때문에, 골드만 보고 "올려도 의미 없다"고 판단하기 전에 재료 탭도 함께 확인하는 편이 좋습니다.',
    ],
  },
  {
    heading: '귀속 골드와 유통 골드를 나눠 보는 이유',
    paragraphs: [
      '레이드 보상 골드에는 거래소·경매장에서 자유롭게 쓸 수 있는 일반 골드와, 캐릭터에 묶여 재련 재료 구매 등 제한된 용도로만 쓰는 귀속 골드가 섞여 있습니다. 지평의 성당처럼 관문 골드가 전액 귀속으로 지급되는 레이드도 있습니다.',
      '그래서 상위 3레이드를 고르는 기준을 두 가지로 나눠 두었습니다. 순수 골드 기준은 귀속·유통 구분 없이 총량이 많은 순으로, 유통 골드 기준은 실제로 거래에 쓸 수 있는 골드가 많은 순으로 고릅니다. 재료를 직접 사려고 골드를 모으는 중이라면 유통 골드 기준이 현실에 더 가깝습니다.',
    ],
  },
];

const GoldProjection = dynamic(() => import('@/components/GoldProjection'), {
  loading: () => (
    <div className="text-center py-5" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">로딩중...</span>
      </div>
    </div>
  )
});

type Character = {
  characterName: string;
  itemLevel: number;
};

export default function ExpeditionGoldPage() {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [searched, setSearched] = useState(false);
  const [autoSearchName, setAutoSearchName] = useState<string | undefined>(undefined);

  // 주간 레이드 페이지에 저장해 둔 검색 닉네임이 있으면 그대로 자동 검색
  useEffect(() => {
    try {
      const raw = localStorage.getItem('weekly-gold-settings');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.searchName) {
          setAutoSearchName(saved.searchName);
        }
      }
    } catch {}
  }, []);

  return (
    <div className={styles.pageWrapper} style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            <div className="text-center mb-3" style={{ marginTop: 0 }}>
              <h1
                style={{
                  fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: 0,
                  marginBottom: '0.5rem'
                }}
              >
                원정대 수급 골드 시뮬
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                캐릭터를 레벨업하면 원정대 주간 클리어 골드와 재련 재료 수급이 얼마나 늘어나는지 계산해보세요
              </p>
            </div>

            {/* 캐릭터 검색 */}
            <CharacterSearch
              onSelectionChange={setSelectedCharacters}
              onCharactersLoaded={setAllCharacters}
              onSearch={() => setSearched(true)}
              searched={searched}
              autoSearchName={autoSearchName}
            />

            {!searched && (
              <>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>
                  검색해서 레벨업 시 골드·재료 수급 변화 확인하기
                </p>
                {/* 검색 전에도 이 도구가 무엇을 계산하는지 본문으로 읽히도록 둔다 (빈 화면 방지) */}
                <div
                  style={{
                    maxWidth: '880px',
                    margin: 'clamp(1.5rem, 4vw, 2.25rem) auto 0',
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    borderRadius: '12px',
                    backgroundColor: 'var(--card-body-bg-blue)',
                  }}
                >
                  <h2 className="h6 text-primary mb-3">레벨업, 올리기 전에 먼저 계산해보세요</h2>
                  <p className="small mb-2">
                    재련은 레벨이 오를수록 비용이 가파르게 뜁니다. 그런데 정작 주간 골드는 아이템 레벨에 비례해서
                    오르지 않고, 새 레이드의 입장 레벨을 넘는 순간에만 계단식으로 오릅니다. 그 사이 구간은 아무리
                    올려도 주급이 그대로라, 어디까지 올려야 실제로 이득인지 미리 아는 것이 중요합니다.
                  </p>
                  <p className="small mb-3">
                    캐릭터명을 검색하면 원정대 전체의 아이템 레벨을 불러와, 지금 받는 주간 골드와 목표 레벨에서 받게 될
                    주간 골드를 각각 계산해 그 차이를 보여줍니다. 캐릭터 1명당 골드 레이드 3개, 원정대 골드 인정 6캐릭터
                    제한을 그대로 반영하기 때문에, 새로 열리는 레이드의 골드를 그냥 더하는 계산과는 결과가 다릅니다.
                  </p>
                  <ul className="small mb-0">
                    <li>목표 레벨별 원정대 주간 골드 증가분 (귀속·유통 골드 구분)</li>
                    <li>올려도 주급이 변하지 않는 구간 표시 — 헛돈 쓰지 않게</li>
                    <li>레이드·균열·가디언 토벌·모래시계 재련 재료 수급 변화를 실시간 시세로 환산</li>
                    <li>골드가 인정되는 6캐릭터 자동 선정 (직접 변경 가능)</li>
                  </ul>
                </div>
              </>
            )}

            {/* 재료 환산에 거래소 시세가 필요하다 */}
            <PriceProvider>
              {searched && selectedCharacters.length > 0 && (
                <div style={{ maxWidth: '1180px', margin: 'clamp(2rem, 4vw, 2.5rem) auto 0' }}>
                  <GoldProjection selectedCharacters={selectedCharacters} allCharacters={allCharacters} />
                </div>
              )}
            </PriceProvider>

            {/* 이용 가이드 · FAQ — 검색 여부와 무관하게 항상 노출 */}
            <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
              <GuideFaq
                relatedGuides={['/guide/weekly-gold', '/guide/raid-rewards']}
                sections={expeditionGoldGuideSections}
                faqs={faqData}
              />
            </div>

            {/* 모바일 인-콘텐츠 광고 (앱 배치와 유사) */}
            <div className="d-block d-lg-none my-3">
              <AdBanner slot="8616653628" />
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
