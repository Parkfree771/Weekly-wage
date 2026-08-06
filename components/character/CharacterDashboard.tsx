'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterData, EngravingInfo, GemInfo, SiblingCharacter } from '@/lib/characterData';
import { getGradeColor } from '@/lib/grade-color';
import { ENGRAVING_ICONS } from '@/lib/engraving-icons.generated';
import { WANGAP_ITEM_IMAGES, type WangapGrade } from '@/lib/wangap-item-images';
import styles from '@/app/character/character.module.css';
import TitleBadge from './TitleBadge';

type Props = {
  data: CharacterData;
  onCharacterSelect?: (name: string) => void;
};

function getQualityColor(q: number): string {
  if (q >= 100) return '#ff9800';
  if (q >= 90) return '#9c27b0';
  if (q >= 70) return '#2196f3';
  if (q >= 30) return '#4caf50';
  return '#9e9e9e';
}

// 로아 API 아이콘은 배경이 없는(투명) 이미지라 그냥 두면 카드 위에 둥둥 뜬다.
// 게임 안 아이템 배경과 같게 보이도록, 등급별 완갑 이미지(wangap-*6.webp)의 배경을
// 세로 위치별로 실측해서 그대로 그라디언트로 재현한다.
// (영웅/전설/유물/고대 = 실측값 / 희귀·에스더는 완갑 이미지가 없어 같은 톤으로 맞춘 값)
const GRADE_ICON_BG: Record<string, string> = {
  '영웅': 'linear-gradient(180deg, #06070a 0%, #16051e 25%, #340344 75%, #3c034d 100%)',
  '전설': 'linear-gradient(180deg, #110f0d 0%, #231405 25%, #5a3305 75%, #613806 100%)',
  '유물': 'linear-gradient(180deg, #120d0b 0%, #331607 25%, #5b2004 75%, #6f2704 100%)',
  '고대': 'linear-gradient(180deg, #10100d 0%, #221d12 25%, #957749 75%, #b6985f 100%)',
  '희귀': 'linear-gradient(180deg, #0b0f0d 0%, #123023 25%, #145f45 75%, #14684a 100%)',
  '에스더': 'linear-gradient(180deg, #08100f 0%, #103330 25%, #1b716d 75%, #1d7a76 100%)',
};
const FALLBACK_ICON_BG = 'linear-gradient(180deg, #0d0e10 0%, #1e2128 25%, #353a44 75%, #3a3f4a 100%)';

// 에스더 아이콘은 API 이미지가 이미 자체 배경/이펙트를 갖고 있어 아무것도 덧입히지 않는다.
// 완갑도 마찬가지(자체 배경 있는 우리 이미지).
const hasOwnBackground = (grade: string) => grade === '에스더';

function iconStyle(grade: string): React.CSSProperties {
  return { background: GRADE_ICON_BG[grade] || FALLBACK_ICON_BG };
}

// 링(테두리)이 디자인의 일부인 요소 — 어빌리티 스톤, 프로필 보주 미니
function ringedIconStyle(grade: string): React.CSSProperties {
  return { ...iconStyle(grade), borderColor: getGradeColor(grade) };
}

// 연마 효과 축약 표기 (모바일 — 긴 옵션명 잘림 방지). 긴 키워드부터 치환한다.
const GRIND_ABBR: [string, string][] = [
  ['세레나데, 신앙, 조화 게이지 획득량', '아덴 획득'],
  ['아군 공격력 강화 효과', '아공강'],
  ['아군 피해량 강화 효과', '아피강'],
  ['상태이상 공격 지속시간', '상태이상'],
  ['전투 중 생명력 회복량', '전투 생회'],
  ['파티원 회복 효과', '파티 회복'],
  ['파티원 회복', '파티 회복'],
  ['치명타 적중률', '치적'],
  ['치명타 피해', '치피'],
  ['적에게 주는 피해', '적주피'],
  ['무기 공격력', '무공'],
  ['추가 피해', '추피'],
  ['최대 생명력', '최생'],
  ['최대 마나', '최마'],
];
const abbrGrindText = (text: string): string => {
  for (const [full, short] of GRIND_ABBR) {
    if (text.includes(full)) return text.replace(full, short);
  }
  return text;
};

// 완갑 아이콘은 API 아이콘 대신 완갑 시뮬과 같은 자체 이미지(등급별)를 쓴다.
const WANGAP_GRADES: WangapGrade[] = ['영웅', '전설', '유물', '고대'];
const wangapIcon = (grade: string): string =>
  WANGAP_ITEM_IMAGES[(WANGAP_GRADES as string[]).includes(grade) ? (grade as WangapGrade) : '영웅'];

// 고대 악세 기본 힘/민/지 구간 — 연마 3단계 기준 [최소, 최대]
// (대부분 유저가 3단계라 연마단계 무시하고 이 구간을 3등분해 상/중/하 판정)
const ACC_STAT_RANGE: Record<string, [number, number]> = {
  '반지':   [10962, 12897],
  '귀걸이': [11806, 13889],
  '목걸이': [15178, 17857],
};

// 힘/민/지 값 → 해당 부위 3단계 구간을 3등분해 상/중/하 (고대 전용)
function accStatGrade(type: string, grade: string, value: number): string {
  if (grade !== '고대') return '';
  const slot = type.includes('목걸이') ? '목걸이' : type.includes('귀걸이') ? '귀걸이' : type.includes('반지') ? '반지' : '';
  const row = ACC_STAT_RANGE[slot];
  if (!row) return '';
  const [min, max] = row;
  if (value <= min) return '하';
  if (value >= max) return '상';
  const third = (max - min) / 3;
  if (value < min + third) return '하';
  if (value < min + 2 * third) return '중';
  return '상';
}

// 아크그리드 코어 등급별 배경 (로아 등급 색 기준, 같은 색조 안에서 dark→light)
function getCoreGradeGradient(grade: string): string {
  switch (grade) {
    case '고대':
      return 'linear-gradient(180deg, #f5e8c8 0%, #c19a5c 100%)'; // 베이지
    case '유물':
      return 'linear-gradient(180deg, #7c2d12 0%, #d97706 100%)'; // 어두운 주황
    case '전설':
      return 'linear-gradient(180deg, #713f12 0%, #ca8a04 100%)'; // 어두운 노랑
    case '영웅':
      return 'linear-gradient(180deg, #4c1d95 0%, #a855f7 100%)'; // 보라
    case '희귀':
      return 'linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%)'; // 파랑
    default:
      return 'var(--card-body-bg-stone)';
  }
}

// 코어 진영(질서/혼돈) 색상 추출 — 이름에 포함된 키워드로 판단
// (질서=빨강, 혼돈=파랑 — 사용자 요청)
function getFactionColor(coreName: string): { color: string; label: string } {
  if (coreName.includes('질서')) return { color: '#ef4444', label: '질서' };
  if (coreName.includes('혼돈')) return { color: '#3b82f6', label: '혼돈' };
  return { color: 'var(--text-muted)', label: '' };
}

function gradeColor(grade: string): string {
  if (grade === '상') return 'var(--grade-high, #f59e0b)';
  if (grade === '중') return 'var(--grade-mid, #7c3aed)';
  if (grade === '하') return 'var(--grade-low, #2563eb)';
  return 'var(--text-secondary)';
}

// 상/중/하 등급 배지 (둥근 네모, 등급 색 채움)
// 등급이 없으면 같은 크기의 빈 자리로 렌더 → 배지 없는 줄도 텍스트 정렬 유지
function GradeBadge({ grade }: { grade?: string }) {
  const valid = grade === '상' || grade === '중' || grade === '하';
  return (
    <span
      className={styles.gradeBadge}
      style={valid ? { background: gradeColor(grade as string) } : { visibility: 'hidden' }}
      aria-hidden={!valid}
    >
      {valid ? grade : ''}
    </span>
  );
}

function GrindingEffect({ text, grade }: { text: string; grade: string }) {
  const m = text.match(/^(.+?)\s*([\+\-]?\s*[\d,]+\.?\d*\s*%?)$/);
  if (m) {
    return (
      <span className={styles.effectLine}>
        <GradeBadge grade={grade} />
        <span className={styles.effectLabel}>{m[1]} </span>
        <span className={styles.effectVal} style={{ color: gradeColor(grade) }}>{m[2]}</span>
      </span>
    );
  }
  return <span className={styles.effectLine}><GradeBadge grade={grade} />{text}</span>;
}

function BraceletEffectLine({ text, grade }: { text: string; grade?: string }) {
  if (!grade) return <span className={styles.braceletEffText}>{text}</span>;
  // 한 효과는 (여러 문장이라도) 하나의 단락으로 이어서 표시, 수치만 강조
  return (
    <span className={styles.braceletEffText}>
      {text.split(/([\d,]+\.?\d*\s*%?)/g).map((part, i) =>
        /^[\d,]+\.?\d*\s*%?$/.test(part)
          ? <span key={i} style={{ color: gradeColor(grade), fontWeight: 800 }}>{part}</span>
          : part
      )}
    </span>
  );
}

/* ═══════════════════════════════════════ */
export default function CharacterDashboard({ data, onCharacterSelect }: Props) {
  const { profile, combatStats } = data;

  // 보석 hover 툴팁
  const [hoveredGem, setHoveredGem] = useState<{ gem: GemInfo; x: number; y: number } | null>(null);

  // 원정대 펼치기
  const [siblingsExpanded, setSiblingsExpanded] = useState(false);

  // 모바일 여부 (원정대 기본 접힘 등에 사용)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleGemEnter = (e: React.MouseEvent<HTMLDivElement>, gem: GemInfo) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHoveredGem({ gem, x: r.left + r.width / 2, y: r.top });
  };
  const handleGemLeave = () => setHoveredGem(null);

  // 힘/민/지 중 해당 캐릭의 주 스탯만 표시하도록 필터
  const filterStatsByMain = useCallback((stats: string[]) => {
    return stats.filter(s => {
      const m = s.match(/^(힘|민첩|지능)/);
      return !m || m[1] === profile.mainStatType;
    });
  }, [profile.mainStatType]);

  const braceletKeywords = data.braceletItem?.keywords || [];

  const gems = data.gems;

  // 같은 스킬 보석이 시각적으로 인접한 슬롯에 들어가도록 배치
  // 다이아몬드 슬롯: 상단 4(0~3, 페어 [0,1]/[2,3]) + 중앙 3(4~6) + 하단 4(7~10, 페어 [7,8]/[9,10])
  const gemSlots: (GemInfo | null)[] = (() => {
    const typeOrder: Record<string, number> = { '겁화': 0, '멸화': 0, '작열': 1, '홍염': 1 };

    // 스킬별 그룹핑
    const groupsMap = new Map<string, GemInfo[]>();
    gems.forEach((g, i) => {
      const key = g.skillName || `__lone_${i}__`;
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(g);
    });
    // 각 그룹 내부: 공격형(겁화/멸화) → 쿨감형(작열/홍염)
    groupsMap.forEach((list) =>
      list.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99)),
    );

    const groups = Array.from(groupsMap.values());
    const pairs = groups.filter((g) => g.length === 2);
    const others = groups.filter((g) => g.length !== 2);
    // 페어는 총 레벨 내림차순 (높은 레벨 페어가 위쪽으로)
    pairs.sort((a, b) => b[0].level + b[1].level - (a[0].level + a[1].level));

    const result: (GemInfo | null)[] = Array(11).fill(null);
    const pairSlotPairs: [number, number][] = [[0, 1], [2, 3], [7, 8], [9, 10]];
    let pairIdx = 0;

    // 페어 우선: 4개 페어 슬롯에 채움
    while (pairIdx < pairSlotPairs.length && pairs.length > 0) {
      const pair = pairs.shift()!;
      const [s1, s2] = pairSlotPairs[pairIdx++];
      result[s1] = pair[0];
      result[s2] = pair[1];
    }

    // 남은 보석 (페어 오버플로우 + 단일/3+): 중앙 3슬롯 우선 충전 (스킬 단위로 인접 유지)
    const remaining: GemInfo[] = [];
    pairs.forEach((p) => remaining.push(...p));
    others.forEach((o) => remaining.push(...o));

    const midSlots = [4, 5, 6];
    let midIdx = 0;
    while (midIdx < midSlots.length && remaining.length > 0) {
      result[midSlots[midIdx++]] = remaining.shift()!;
    }
    // 그래도 남으면 비어있는 페어 슬롯에 채움
    while (remaining.length > 0 && pairIdx < pairSlotPairs.length) {
      const [s1, s2] = pairSlotPairs[pairIdx++];
      if (remaining.length > 0) result[s1] = remaining.shift()!;
      if (remaining.length > 0) result[s2] = remaining.shift()!;
    }

    return result;
  })();

  const engSlots: (EngravingInfo | null)[] = [];
  for (let i = 0; i < 5; i++) engSlots.push(data.engravings[i] || null);

  // 완갑 — 아직 공식 API가 내려주지 않는다.
  // 모든 유저가 영웅 완갑에서 시작하므로, 응답에 없으면 영웅 +0 으로 채워 장비 칸 맨 아래에 노출한다.
  // API가 완갑을 내려주기 시작하면 parseEquipmentItems 가 그대로 담아오고 이 보정은 자동으로 비활성.
  const equipRows: typeof data.equipmentItems = data.equipmentItems.some(e => e.type === '완갑')
    ? data.equipmentItems
    : [
        ...data.equipmentItems,
        {
          type: '완갑',
          name: '완갑',
          icon: '',
          grade: '영웅',
          quality: 0,
          itemLevel: 0,
          enhanceLevel: 0,
          advancedLevel: 0,
          transcendence: 0,
          elixir: [],
          setName: '',
          mainStat: 0,
        },
      ];

  const renderGemCell = (gem: GemInfo | null, idx: number) => {
    if (!gem) return <div key={`empty-${idx}`} className={styles.gemCellEmpty} style={{ width: 120 }} />;
    const isAtk = gem.type === '멸화' || gem.type === '겁화';
    const gc = isAtk ? '#ef4444' : '#3b82f6';
    return (
      <div
        key={idx}
        className={styles.gemCell}
        style={{ width: 120, gap: '0.35rem' }}
        onMouseEnter={(e) => handleGemEnter(e, gem)}
        onMouseLeave={handleGemLeave}
      >
        <div className={styles.gemCellIconWrap} style={{ boxShadow: `0 2px 8px ${gc}30` }}>
          {gem.icon && <img loading="lazy" decoding="async" src={gem.icon} alt={gem.type} className={styles.gemCellImg} style={{ borderColor: gc }} />}
          <span className={styles.gemCellLv} style={{ background: gc }}>{gem.level}</span>
        </div>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: gc, lineHeight: 1.2 }}>{gem.type}</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: '100%',
            minWidth: 0,
          }}
          title={gem.skillName}
        >
          {gem.skillIcon && (
            <img loading="lazy" decoding="async"
              src={gem.skillIcon}
              alt={gem.skillName || '스킬'}
              style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {gem.skillName || '-'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className={styles.mainLayout}>
        <aside className={styles.profileCol}>
          <div className={styles.profileCard}>
            <div className={styles.profileImgWrap}>
              {profile.characterImage ? (
                <img
                  src={profile.characterImage}
                  alt={profile.characterName}
                  className={styles.profileImg}
                />
              ) : (
                <div className={styles.profileImgEmpty}>?</div>
              )}
              {profile.emblems && profile.emblems.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2%',
                    left: '2%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    zIndex: 2,
                    pointerEvents: 'none',
                  }}
                >
                  {profile.emblems.map((url, i) => (
                    <img loading="lazy" decoding="async"
                      key={i}
                      src={url}
                      alt="휘장"
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.5))',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className={styles.profileBody}>
              <div className={styles.profileTopRow}>
                <div className={styles.profileTopInfo}>
              {profile.title && (
                <div style={{ marginBottom: 4 }}>
                  <TitleBadge title={profile.title} />
                </div>
              )}
              <h2 className={styles.profileName} style={{ marginBottom: 4 }}>
                {profile.characterName}
              </h2>
              {/* 부속 정보: 데스크탑은 직업·서버·길드 inline, 모바일은 각 줄 */}
              <div className={styles.profileMetaInline}>
                <span className={styles.profileMetaClass}>{profile.className}</span>
                {profile.serverName && (
                  <>
                    <span className={styles.profileMetaDot}>·</span>
                    <span>{profile.serverName}</span>
                  </>
                )}
                {profile.guildName && (
                  <>
                    <span className={styles.profileMetaDot}>·</span>
                    <span className={styles.profileMetaGuild}>{profile.guildName}</span>
                  </>
                )}
              </div>
              {/* 원정대 레벨 (직업 라인 바로 아래) */}
              <div
                className={styles.profileExpeditionLine}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  marginBottom: '0.9rem',
                  lineHeight: 1.3,
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>원정대</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Lv. {profile.expeditionLevel || '-'}</span>
              </div>
                </div>

              {/* 메인 스탯: 아이템 레벨 + 전투력 (메인 페이지 입체 그림자 스타일) */}
              <div className={styles.profileMainStats}>
                <div
                  className={styles.profileMainStatCard}
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 80, 181, 0.14) 0%, rgba(90, 111, 214, 0.04) 60%, transparent 100%)',
                    border: '2px solid rgba(59, 80, 181, 0.35)',
                    boxShadow:
                      '2px 2px 0 0 rgba(59, 80, 181, 0.3), 4px 4px 0 0 rgba(59, 80, 181, 0.18), 6px 6px 0 0 rgba(59, 80, 181, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <div className={styles.profileMainStatLabel}>아이템 레벨</div>
                  <div
                    className={styles.profileMainStatValue}
                    style={{
                      background: 'linear-gradient(135deg, #3b50b5 0%, #5a6fd6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {profile.itemLevel.toLocaleString()}
                  </div>
                </div>

                <div
                  className={styles.profileMainStatCard}
                  style={{
                    background: 'linear-gradient(135deg, rgba(232, 114, 42, 0.16) 0%, rgba(245, 158, 11, 0.04) 60%, transparent 100%)',
                    border: '2px solid rgba(232, 114, 42, 0.4)',
                    boxShadow:
                      '2px 2px 0 0 rgba(232, 114, 42, 0.32), 4px 4px 0 0 rgba(232, 114, 42, 0.18), 6px 6px 0 0 rgba(232, 114, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <div className={styles.profileMainStatLabel}>전투력</div>
                  <div
                    className={styles.profileMainStatValue}
                    style={{
                      background: 'linear-gradient(135deg, #e8722a 0%, #f59e0b 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {profile.combatPower > 0 ? profile.combatPower.toLocaleString() : '-'}
                  </div>
                </div>
              </div>
              </div>

              {/* 보조 스탯: 전투 특성 6종 (원정대는 위 직업 라인 아래로 이동) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>치명</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.crit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>특화</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.specialization}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>신속</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.swiftness}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>제압</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.domination}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>인내</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.endurance}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>숙련</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.expertise}</span>
                </div>
              </div>

              {/* 보주 — 장비 칸(완갑 자리)에서 여기 특성 아래로 이동 */}
              {data.orb && data.orb.icon && (
                <div className={styles.orbMini}>
                  <img loading="lazy" decoding="async"
                    src={data.orb.icon}
                    alt="보주"
                    className={styles.orbMiniIcon}
                    style={ringedIconStyle(data.orb.grade)}
                  />
                  <div className={styles.orbMiniBody}>
                    <div className={styles.orbMiniName} style={{ color: getGradeColor(data.orb.grade) }}>
                      {data.orb.name}
                    </div>
                    {data.orb.paradisePower > 0 && (
                      <div className={styles.orbMiniStat}>
                        {data.orb.season > 0 ? `시즌${data.orb.season} ` : ''}최대 낙원력 {data.orb.paradisePower.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══ 누적 칭호 (사이드바 폭) ══ */}
          {data.titlesHistory && data.titlesHistory.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>획득 칭호</h3>
                <span className={styles.badge}>{data.titlesHistory.length}</span>
              </div>
              <div
                className={styles.cardBody}
                style={{
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                {data.titlesHistory.map((t, i) => (
                  <div
                    key={`${t.title}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '2.1em',
                    }}
                  >
                    <TitleBadge title={t.title} fontSize="0.95rem" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ══ 아크 그리드 (사이드바 폭) ══ */}
          {data.arkGrid && data.arkGrid.cores.length > 0 && (
            <section className={styles.card} style={{ overflow: 'visible' }}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>아크 그리드</h3>
                <span className={styles.badge}>{data.arkGrid.cores.length}코어</span>
              </div>
              <div className={styles.cardBody} style={{ padding: '0.85rem', overflow: 'visible' }}>
                {/* 질서 1줄 / 혼돈 1줄 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {(['질서', '혼돈'] as const).map(factionKey => {
                    // 착용 순서 무시 — 항상 해·달·별 순으로 표시 (구 캐시 데이터까지 보장)
                    const celestialOrder = (n: string) => n.includes('해') ? 0 : n.includes('달') ? 1 : n.includes('별') ? 2 : 3;
                    const factionCores = data.arkGrid!.cores
                      .filter(c => c.name.includes(factionKey))
                      .sort((a, b) => celestialOrder(a.name) - celestialOrder(b.name));
                    if (factionCores.length === 0) return null;
                    return (
                      <div
                        key={factionKey}
                        className={styles.coreFactionRow}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${factionCores.length}, 1fr)`,
                          gap: '0.4rem',
                        }}
                      >
                        {factionCores.map((core, i) => {
                          const gradeColor = getGradeColor(core.grade);
                          const faction = getFactionColor(core.name);
                          const bgGradient = getCoreGradeGradient(core.grade);
                          const isLightBg = core.grade === '고대';
                          const cleanCoreName = core.name.replace(/.*코어\s*:\s*/, '');
                          return (
                            <div
                              key={i}
                              className={styles.coreWrapper}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 3,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  position: 'relative',
                                  width: 60,
                                  height: 60,
                                  borderRadius: '50%',
                                  background: bgGradient,
                                  border: `2.5px solid ${faction.color}`,
                                  boxShadow: `0 0 12px ${faction.color}55`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <img loading="lazy" decoding="async"
                                  src={core.icon}
                                  alt={core.name}
                                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'contain' }}
                                />
                                {faction.label && (
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: -6,
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      fontSize: '0.55rem',
                                      fontWeight: 800,
                                      color: '#fff',
                                      background: faction.color,
                                      padding: '0.05rem 0.4rem',
                                      borderRadius: 5,
                                      letterSpacing: '0.02em',
                                      whiteSpace: 'nowrap',
                                      boxShadow: `0 1px 4px ${faction.color}66`,
                                    }}
                                  >
                                    {faction.label}
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  width: '100%',
                                  marginTop: 4,
                                }}
                                title={cleanCoreName}
                              >
                                {cleanCoreName}
                              </div>
                              {core.grade && (
                                <div
                                  style={{
                                    fontSize: '0.55rem',
                                    fontWeight: 800,
                                    color: isLightBg ? '#1a0c03' : '#fff',
                                    background: bgGradient,
                                    padding: '0.05rem 0.4rem',
                                    borderRadius: 4,
                                    letterSpacing: '0.02em',
                                    border: `1px solid ${gradeColor}55`,
                                    textShadow: isLightBg ? 'none' : '0 1px 2px rgba(0,0,0,0.4)',
                                  }}
                                >
                                  {core.grade}
                                </div>
                              )}
                              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981' }}>{core.point}P</div>

                              {/* Hover 툴팁 — 코어 풀네임 + 등급 + 포인트 */}
                              <div className={styles.coreTooltip}>
                                <div className={styles.coreTooltipHead} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                                  <img loading="lazy" decoding="async"
                                    src={core.icon}
                                    alt={core.name}
                                    className={styles.coreTooltipIcon}
                                    style={{ background: bgGradient }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <div className={styles.coreTooltipName}>{cleanCoreName}</div>
                                    <div className={styles.coreTooltipSub}>
                                      {core.grade && <span>{core.grade} · </span>}
                                      <span style={{ color: '#10b981', fontWeight: 800 }}>{core.point}P</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* 효과 요약 — 아피강 / 추피 / 낙인력 / 공격력 / 보스 피해 */}
                {data.arkGrid.effects.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      marginTop: '0.9rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    {data.arkGrid.effects.map((eff, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          padding: '0.35rem 0.6rem',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{eff.name}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--color-primary)' }}>Lv.{eff.level}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ══ 원정대 형제 캐릭터 ══ */}
          {data.siblings && data.siblings.length > 0 && (() => {
            const sorted = [...data.siblings].sort((a, b) => b.itemLevel - a.itemLevel);
            const collapsedCount = isMobile ? 0 : 10;
            const visible = siblingsExpanded ? sorted : sorted.slice(0, collapsedCount);
            const hidden = sorted.length - visible.length;
            const byServer = new Map<string, SiblingCharacter[]>();
            for (const s of visible) {
              if (!byServer.has(s.serverName)) byServer.set(s.serverName, []);
              byServer.get(s.serverName)!.push(s);
            }
            return (
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>원정대</h3>
                  <span className={styles.badge}>{sorted.length}캐릭</span>
                </div>
                <div className={styles.cardBody} style={{ padding: '0.6rem 0.7rem 0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {Array.from(byServer.entries()).map(([server, list]) => (
                      <div key={server}>
                        <div
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            color: 'var(--text-muted)',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            padding: '0 2px 5px',
                            borderBottom: '1px solid var(--border-color)',
                            marginBottom: 5,
                          }}
                        >
                          {server}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {list.map((s) => {
                            const isCurrent = s.characterName === profile.characterName;
                            return (
                              <div
                                key={s.characterName}
                                role={isCurrent ? undefined : 'button'}
                                tabIndex={isCurrent ? undefined : 0}
                                className={`${styles.siblingRow} ${isCurrent ? styles.siblingRowCurrent : ''}`}
                                onClick={isCurrent ? undefined : () => onCharacterSelect?.(s.characterName)}
                                onKeyDown={isCurrent ? undefined : (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onCharacterSelect?.(s.characterName);
                                  }
                                }}
                              >
                                <div className={styles.siblingBody}>
                                  <span className={`${styles.siblingName} ${isCurrent ? styles.siblingNameCurrent : ''}`}>
                                    {s.characterName}
                                  </span>
                                  <span className={styles.siblingClass}>{s.className}</span>
                                </div>
                                <span className={`${styles.siblingItemLv} ${isCurrent ? styles.siblingItemLvCurrent : ''}`}>
                                  {s.itemLevel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(hidden > 0 || siblingsExpanded) && (
                    <button
                      type="button"
                      onClick={() => setSiblingsExpanded((x) => !x)}
                      style={{
                        width: '100%',
                        marginTop: '0.7rem',
                        padding: '0.45rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      {siblingsExpanded ? '접기 ▲' : `더 보기 ${hidden}개 ▼`}
                    </button>
                  )}
                </div>
              </section>
            );
          })()}
        </aside>

        <div className={styles.specCol}>
          {/* ══ 장비 + 악세 ══ */}
          <section className={styles.card}>
            <div className={styles.cardHead}><h3 className={styles.cardTitle}>장비 / 악세서리</h3></div>
            <div className={styles.cardBody}>
              <div className={styles.equipAccGrid}>
                <div className={styles.equipBlock}>
                  <div className={styles.colLabel}>장비</div>
                  {equipRows.map((eq, i) => {
                    const enhLv = eq.enhanceLevel;
                    const nameOnly = eq.name.replace(/^\+\d+\s*/, '');
                    const isWeapon = eq.type === '무기';
                    const isWangap = eq.type === '완갑';
                    // 세르카 전율(계승) 장비 — 재련 시뮬 카드와 동일하게 임의 배경 + 세르카 프레임
                    const isThrill = !isWangap && nameOnly.includes('전율');
                    // 완갑은 API 아이콘 대신 등급별 자체 이미지 사용
                    const iconSrc = isWangap ? wangapIcon(eq.grade) : eq.icon;
                    return (
                      <div key={i} className={styles.itemRow}>
                        {iconSrc && (
                          (isThrill || isWangap) ? (
                            // 전율: 투명 배경이라 무기 빨강·방어구 파랑→검정 그라데이션을 깔고 프레임을 겹친다
                            // 완갑: 자체 배경 이미지 위에 완갑 평균 시뮬처럼 세르카 프레임만 겹친다
                            <span className={styles.thrillIcon}>
                              <span className={`${styles.thrillIconBg} ${isWangap ? styles.thrillIconBgWangap : isWeapon ? styles.thrillIconBgWeapon : styles.thrillIconBgArmor}`}>
                                <img loading="lazy" decoding="async" src={iconSrc} alt={eq.type}
                                  className={isWangap ? styles.thrillIconWangapImg : styles.thrillIconImg} />
                              </span>
                              {/* 하의만 프레임을 아주 살짝 오른쪽으로 보정 */}
                              <span className={`${styles.thrillIconFrame} ${eq.type === '하의' ? styles.thrillIconFramePants : ''}`}>
                                <img loading="lazy" decoding="async" src="/wjsdbf3.webp" alt="" className={styles.thrillIconFrameImg} />
                              </span>
                            </span>
                          ) :
                          hasOwnBackground(eq.grade)
                            ? <img loading="lazy" decoding="async" src={iconSrc} alt={eq.type} className={styles.itemIconPlain} />
                            : <img loading="lazy" decoding="async" src={iconSrc} alt={eq.type} className={styles.itemIcon} style={iconStyle(eq.grade)} />
                        )}
                        <div className={styles.itemBody}>
                          <div className={styles.itemNameRow}>
                            <span className={`${styles.enhBadge} ${isWeapon ? styles.enhBadgeWeapon : styles.enhBadgeArmor}`}>+{enhLv}</span>
                            {/* 모바일은 폭이 좁아 "운명의 전율 투구"가 잘린다 — 전율 장비는 "전율 투구"식 축약 표기 */}
                            <span className={styles.itemName} style={{ color: getGradeColor(eq.grade) }}>
                              {isThrill && isMobile ? `전율 ${eq.type}` : nameOnly}
                            </span>
                            {eq.transcendence > 0 && <span className={styles.tag}>초월 {eq.transcendence}</span>}
                          </div>
                          {/* 완갑은 품질이 없다 — 품질값이 있을 때만 게이지 노출 */}
                          {eq.quality > 0 ? (
                            <div className={styles.qualRow}>
                              <div className={styles.qualTrack}><div className={styles.qualFill} style={{ width: `${eq.quality}%`, background: getQualityColor(eq.quality) }} /></div>
                              <span className={styles.qualNum} style={{ color: getQualityColor(eq.quality) }}>{eq.quality}</span>
                            </div>
                          ) : isWangap ? (
                            <div className={styles.statLine}>{eq.grade} 완갑</div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.colDivider} />

                <div className={styles.accBlock}>
                  <div className={styles.colLabel}>악세서리</div>
                  {data.accessoryItems.map((acc, i) => (
                    <div key={i} className={styles.itemRow}>
                      {acc.icon && (
                        hasOwnBackground(acc.grade)
                          ? <img loading="lazy" decoding="async" src={acc.icon} alt={acc.type} className={styles.itemIconPlain} />
                          : <img loading="lazy" decoding="async" src={acc.icon} alt={acc.type} className={styles.itemIcon} style={iconStyle(acc.grade)} />
                      )}
                      <div className={styles.itemBody}>
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName} style={{ color: getGradeColor(acc.grade) }}>{acc.type}</span>
                          {acc.quality > 0 && <span className={styles.qualBadge} style={{ color: getQualityColor(acc.quality) }}>{acc.quality}</span>}
                        </div>
                        <div className={styles.effectsCol}>
                          {filterStatsByMain(acc.stats).map((s, j) => {
                            // 힘/민/지 줄이면 실제 값으로 구간 3등분 상/중/하 판정
                            const sm = s.match(/^(?:힘|민첩|지능)\s*\+?\s*([\d,]+)/);
                            const statGrade = sm
                              ? accStatGrade(acc.type, acc.grade, parseInt(sm[1].replace(/,/g, ''), 10))
                              : '';
                            return (
                              <div key={`s${j}`} className={styles.statLine}>
                                <GrindingEffect text={isMobile ? abbrGrindText(s) : s} grade={statGrade} />
                              </div>
                            );
                          })}
                          {/* 모바일은 옵션명 축약 (치명타 적중률→치적, 아군 공격력 강화 효과→아공강 등) */}
                          {acc.grindingEffects.map((eff, j) => (
                            <div key={`g${j}`} className={styles.statLine}>
                              <GrindingEffect text={isMobile ? abbrGrindText(eff.text) : eff.text} grade={eff.grade} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ══ 팔찌 (모바일: 풀폭 단독 칸 / 데스크탑: 악세 아래) ══ */}
                {data.braceletItem && (
                  <div className={styles.braceletSection}>
                    <div className={styles.subDivider}><span>팔찌</span></div>
                    <div className={styles.braceletBlock}>
                      {data.braceletItem.icon && (
                        hasOwnBackground(data.braceletItem.grade)
                          ? <img loading="lazy" decoding="async" src={data.braceletItem.icon} alt="팔찌" className={styles.itemIconPlain} />
                          : <img loading="lazy" decoding="async" src={data.braceletItem.icon} alt="팔찌" className={styles.itemIcon} style={iconStyle(data.braceletItem.grade)} />
                      )}
                      <div className={styles.itemBody}>
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName} style={{ color: getGradeColor(data.braceletItem.grade) }}>팔찌</span>
                          {braceletKeywords.length > 0 && (
                            <div className={styles.braceletKeywords}>
                              {braceletKeywords.map((kw, j) => <span key={j} className={styles.braceletKw}>{kw}</span>)}
                            </div>
                          )}
                        </div>
                        <div className={styles.effectsCol}>
                          {filterStatsByMain(data.braceletItem.stats).map((s, j) => <div key={`s${j}`} className={styles.statLine}>{s}</div>)}
                          {data.bracelet.map((eff, i) => (
                            <div key={`b${i}`} className={styles.braceletEffItem}><GradeBadge grade={eff.grade} /><BraceletEffectLine text={eff.name} grade={eff.grade} /></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══ 각인 + 어빌리티 스톤 원형 (모바일: 팔찌 아래 풀폭 / 데스크탑: 장비 아래) ══ */}
                {(engSlots.some(e => e) || data.abilityStone) && (
                  <div className={styles.engSection}>
                    <div className={styles.subDivider}><span>각인 / 스톤</span></div>
                    <div className={styles.engCircleWrap}>
                      <div className={styles.engCircleBg}>
                        <svg viewBox="0 0 280 280" className={styles.engCircleSvg}>
                          {(() => {
                            const c = 140;
                            const pent = (r: number) => Array.from({ length: 5 }, (_, i) => {
                              const rad = ((i / 5) * 360 - 90) * Math.PI / 180;
                              return `${c + r * Math.cos(rad)},${c + r * Math.sin(rad)}`;
                            }).join(' ');
                            return (
                              <>
                                <polygon points={pent(58)} fill="var(--neu-tile-bg)" stroke="var(--eng-line)" strokeWidth="2" strokeLinejoin="round" />
                                <polygon points={pent(90)} fill="none" stroke="var(--eng-line-strong)" strokeWidth="2.5" strokeLinejoin="round" />
                              </>
                            );
                          })()}

                          {/* 연결선: 스톤 → 각 꼭짓점 */}
                          {engSlots.map((eng, i) => {
                            if (!eng) return null;
                            const angle = (i / 5) * 360 - 90;
                            const rad = (angle * Math.PI) / 180;
                            const stoneEng = data.abilityStone?.engravings.find(se => se.name === eng.name);
                            return (
                              // 스톤에 박힌 각인은 굵은 실선, 아닌 것은 가는 점선 — 한눈에 구분되게
                              <line key={`line-${i}`}
                                x1={140 + 32 * Math.cos(rad)} y1={140 + 32 * Math.sin(rad)}
                                x2={140 + 90 * Math.cos(rad)} y2={140 + 90 * Math.sin(rad)}
                                stroke={stoneEng ? 'var(--eng-link)' : 'var(--eng-line)'}
                                strokeWidth={stoneEng ? '4' : '1.5'}
                                strokeDasharray={stoneEng ? undefined : '4 4'}
                                strokeLinecap="round"
                              />
                            );
                          })}

                          {/* 중앙 스톤 원 — 아이콘(40px)이 들어갈 만큼 키우고 링크색 링을 덧대 스톤임을 명시 */}
                          {data.abilityStone && (
                            <>
                              <circle cx="140" cy="140" r="26" fill="var(--card-bg)" stroke={getGradeColor(data.abilityStone.grade)} strokeWidth="3.5" />
                              <circle cx="140" cy="140" r="30" fill="none" stroke="var(--eng-link)" strokeWidth="1.5" opacity="0.55" />
                            </>
                          )}
                        </svg>

                        {/* 중앙: 스톤 아이콘 */}
                        {data.abilityStone?.icon && (
                          <div className={styles.engCircleCenter}>
                            <img loading="lazy" decoding="async" src={data.abilityStone.icon} alt="스톤" className={styles.engStoneIcon} style={ringedIconStyle(data.abilityStone.grade)} />
                          </div>
                        )}

                        {/* 각인 이름 + 다이아몬드(고정) + 스톤Lv(고정) */}
                        {engSlots.map((eng, i) => {
                          if (!eng) return null;
                          const currentLv = eng.level;
                          const angle = (i / 5) * 360 - 90;
                          const rad = (angle * Math.PI) / 180;
                          const stoneEng = data.abilityStone?.engravings.find(se => se.name === eng.name);
                          const stoneLv = eng.abilityStoneLevel ?? 0;
                          return (
                            <div
                              key={i}
                              className={styles.engCircleControls}
                              style={{
                                // 오각형 꼭짓점 반지름 90 / viewBox 280 = 32.143%
                                '--eng-x': `${50 + 32.143 * Math.cos(rad)}%`,
                                '--eng-y': `${50 + 32.143 * Math.sin(rad)}%`,
                                '--eng-cos': Math.cos(rad).toFixed(4),
                                '--eng-sin': Math.sin(rad).toFixed(4),
                                // 밑변 두 꼭짓점(i=2,3)은 라벨이 왼쪽으로 몰려 보여 살짝 우측 보정
                                '--eng-nudge-x': i === 2 || i === 3 ? '10px' : '0px',
                              } as React.CSSProperties}
                            >
                              <div className={styles.engCircleNameRow}>
                                {ENGRAVING_ICONS[eng.name] && (
                                  <img loading="lazy" decoding="async" src={ENGRAVING_ICONS[eng.name]} alt="" className={styles.engCircleIcon} />
                                )}
                                <span className={styles.engCircleName}>{eng.name}</span>
                              </div>
                              <div className={styles.engCircleDiamonds}>
                                {[1, 2, 3, 4].map(lv => (
                                  <span key={lv} className={styles.engDiamond}
                                    style={{ color: lv <= currentLv ? '#f43c06' : '#4b5563', cursor: 'default' }}
                                  >◆</span>
                                ))}
                              </div>
                              {stoneEng && (
                                <div className={styles.engStoneLvStepper}>
                                  <span className={styles.engStoneLvVal}>Lv.{stoneLv}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══ 카드 / 아크 패시브 ══ */}
          {(data.cardSets.length > 0 || data.arkPassive) && (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>카드 / 아크 패시브</h3>
                {data.arkPassive?.title && <span className={styles.badge}>{data.arkPassive.title}</span>}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardArkLayout}>
                  {/* 왼쪽: 카드 이미지 */}
                  {data.cardSets.length > 0 && (
                    <div className={styles.cardArkLeft}>
                      <div className={styles.cardArkSubtitle}>카드</div>
                      {data.cardSets.map((cardSet, si) => (
                        <div key={si}>
                          <div className={styles.cardSetHeader}>
                            <span className={styles.cardSetName}>{cardSet.name}</span>
                            <span className={styles.cardSetCount}>{cardSet.activeCount}세트</span>
                            {cardSet.awakening > 0 && <span className={styles.cardSetAwaken}>각성 {cardSet.awakening}</span>}
                          </div>
                          <div className={styles.cardImgGrid}>
                            {cardSet.cards.map((c, j) => (
                              <div key={j} className={styles.cardImgCell}>
                                {c.icon && <img loading="lazy" decoding="async" src={c.icon} alt={c.name} className={styles.cardImgThumb} style={{ borderColor: getGradeColor(c.grade) }} />}
                                <span className={styles.cardAwakeCount}>{c.awakeCount}/{c.awakeTotal}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 오른쪽: 아크 패시브 */}
                  {data.arkPassive && (
                    <div className={styles.cardArkRight}>
                      <div className={styles.cardArkSubtitle}>아크 패시브</div>
                      <div className={styles.arkColGrid}>
                        {([
                          { type: 'evolution' as const, label: '진화', cls: styles.arkEvo, catColor: '#f59e0b' },
                          { type: 'enlightenment' as const, label: '깨달음', cls: styles.arkEnl, catColor: '#83e9ff' },
                          { type: 'leap' as const, label: '도약', cls: styles.arkLeap, catColor: '#c2ea55' },
                        ]).map(({ type, label, cls, catColor }) => {
                          const val = data.arkPassive![type];
                          const pointInfo = data.arkPassive!.points.find(p => p.name.includes(label));
                          const catEffects = data.arkPassive!.effects.filter(e => e.category === label);
                          return (
                            <div key={type} className={styles.arkCol}>
                              <div className={styles.arkColHeader} style={{ borderBottomColor: catColor }}>
                                <span className={`${styles.arkColLabel} ${cls}`}>{label}</span>
                                <span className={`${styles.arkColVal} ${cls}`}>{val}</span>
                                {pointInfo?.description && (
                                  <span className={styles.arkColDesc}>{pointInfo.description}</span>
                                )}
                              </div>
                              {catEffects.length > 0 && (
                                <div className={styles.arkColEffects}>
                                  {catEffects.map((eff, i) => (
                                    <div key={i} className={styles.arkEffectChip}>
                                      {eff.icon && <img loading="lazy" decoding="async" src={eff.icon} alt={eff.name} className={styles.arkEffectChipIcon} />}
                                      <span className={styles.arkEffectChipName}>{eff.name}</span>
                                      <span className={styles.arkEffectChipLv}>Lv.{eff.level}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ══ 보석 ══ */}
          {gems.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardHead}><h3 className={styles.cardTitle}>보석</h3><span className={styles.badge}>{gems.length}개</span></div>
              <div className={styles.cardBody}>
                <div className={styles.gemDiamond}>
                  <div className={styles.gemDmRow}>
                    <div className={styles.gemPair}>{[0, 1].map(i => renderGemCell(gemSlots[i], i))}</div>
                    <div className={styles.gemPair}>{[2, 3].map(i => renderGemCell(gemSlots[i], i))}</div>
                  </div>
                  <div className={styles.gemDmCenter}>{[4, 5, 6].map(i => renderGemCell(gemSlots[i], i))}</div>
                  <div className={styles.gemDmRow}>
                    <div className={styles.gemPair}>{[7, 8].map(i => renderGemCell(gemSlots[i], i))}</div>
                    <div className={styles.gemPair}>{[9, 10].map(i => renderGemCell(gemSlots[i], i))}</div>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>

      {hoveredGem && typeof document !== 'undefined' && createPortal(
        (() => {
          const { gem, x, y } = hoveredGem;
          const isAtk = gem.type === '멸화' || gem.type === '겁화';
          const gc = isAtk ? '#ef4444' : '#3b82f6';
          return (
            <div
              className={styles.gemTooltipZoomFix}
              style={{
                position: 'fixed',
                left: x,
                top: y - 14,
                transform: 'translate(-50%, -100%)',
                zIndex: 9999,
                pointerEvents: 'none',
              }}
            >
              <div
                className={styles.gemTooltipZoomInner}
                style={{
                  width: 400,
                  maxWidth: 'calc(100vw - 24px)',
                  background: 'var(--card-bg, #1a1a1f)',
                  border: `1.5px solid ${gc}`,
                  borderRadius: 12,
                  boxShadow: '0 10px 32px rgba(0,0,0,0.5)',
                  padding: '1rem 1.1rem 1.05rem',
                  color: 'var(--text-primary)',
                }}
              >
                {/* 헤더: 보석 + 스킬 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                  {gem.icon && (
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img loading="lazy" decoding="async" src={gem.icon} alt={gem.type} style={{ width: 56, height: 56, borderRadius: 8, border: `2px solid ${gc}`, objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', bottom: -5, right: -5, fontSize: '0.7rem', fontWeight: 800, color: '#fff', background: gc, padding: '1px 6px', borderRadius: 5, lineHeight: '14px' }}>{gem.level}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {gem.skillIcon && <img loading="lazy" decoding="async" src={gem.skillIcon} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gem.skillName || '-'}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: gc }}>{gem.type} {gem.level}레벨</span>
                  </div>
                </div>

                {/* 트라이포드 — 선택한 이름만 표시 */}
                {gem.tripods && gem.tripods.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {gem.tripods.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', background: '#6b7280', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: t.lock ? 'var(--text-muted)' : '#fbbf24' }}>{t.name}</span>
                        {t.lock && <span style={{ fontSize: '0.6rem', background: '#374151', color: '#fff', padding: '0 4px', borderRadius: 4 }}>🔒</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>트라이포드 정보 없음</div>
                )}
              </div>
            </div>
          );
        })(),
        document.body,
      )}
    </div>
  );
}
