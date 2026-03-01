// 전투력 관련 데이터 파서
// API 응답에서 전투력 관련 요소 추출 + 표시용 원본 데이터

// ============================
// 타입 정의
// ============================

export type CombatProfile = {
  characterName: string;
  className: string;
  itemLevel: number;
  combatPower: number;
  characterImage?: string;
  serverName?: string;
  guildName?: string;
  title?: string;
  expeditionLevel?: number;
  characterLevel?: number;
};

export type EquipmentItem = {
  type: string;          // 투구, 어깨, 상의, 하의, 장갑, 무기
  name: string;          // +25 운명의 전율 투구
  icon: string;          // 아이콘 URL
  grade: string;         // 고대, 유물, 에스더
  quality: number;       // 품질 0~100
  itemLevel: number;     // 아이템 레벨
  enhanceLevel: number;  // 강화 단계
  advancedLevel: number; // 상급 재련 단계
  transcendence: number; // 초월 단계
  elixir: string[];      // 엘릭서 효과
  setName: string;       // 세트 효과명
};

export type AccessoryItem = {
  type: string;          // 목걸이, 귀걸이, 반지
  name: string;
  icon: string;
  grade: string;
  quality: number;
  grindingEffects: { text: string; grade: string }[];  // 연마 효과 (text + 상/중/하 등급)
  engravingEffects: string[]; // 각인 효과
  stats: string[];            // 특성 (치명, 특화 등)
};

export type AbilityStoneItem = {
  name: string;
  icon: string;
  grade: string;
  engravings: { name: string; level: number }[];
  reduction: { name: string; level: number } | null;
};

export type BraceletItem = {
  name: string;
  icon: string;
  grade: string;
  effects: string[];     // 팔찌 효과 텍스트
  stats: string[];       // 전투 특성
};

export type WeaponInfo = {
  quality: number;
  additionalDamage: number;
  grade: string;
};

export type EngravingInfo = {
  name: string;
  level: number;
  abilityStoneLevel: number;
  isArkPassive: boolean;
  icon?: string;
};

export type GemInfo = {
  tier: number;
  level: number;
  type: string;          // 멸화/홍염/겁화/작열
  skillName: string;
  icon?: string;
};

export type CardSetInfo = {
  name: string;
  activeCount: number;
  awakening: number;
  effects: string[];     // 세트 효과 설명들
};

export type ArkPassiveInfo = {
  evolution: number;
  enlightenment: number;
  leap: number;
};

export type AccessoryGrinding = {
  slot: string;
  effects: { name: string; grade: string }[];
};

export type BraceletEffect = {
  name: string;
  value: number;
};

export type CombatStats = {
  crit: number;
  specialization: number;
  swiftness: number;
  domination: number;
  endurance: number;
  expertise: number;
};

// 아크 그리드
export type ArkGridGem = {
  icon: string;
  grade: string;
  name: string;
  point: number;
  orderPoint: number;   // 질서 포인트
  chaosPoint: number;   // 혼돈 포인트
  effects: string[];    // "추가 피해 +0.40%" 등
  _debug?: string;      // 디버그용 raw tooltip (임시)
};

export type ArkGridCore = {
  name: string;
  icon: string;
  grade: string;
  point: number;       // 현재 포인트
  coreType: string;    // "질서 - 해" 등
  willpower: number;   // 의지력
  gems: ArkGridGem[];
};

export type ArkGridEffect = {
  name: string;
  level: number;
  tooltip: string;     // "추가 피해 +3.39%"
};

export type ArkGridInfo = {
  cores: ArkGridCore[];
  effects: ArkGridEffect[];
};

export type CombatPowerData = {
  profile: CombatProfile;
  // 표시용 원본 데이터
  equipmentItems: EquipmentItem[];
  accessoryItems: AccessoryItem[];
  abilityStone: AbilityStoneItem | null;
  braceletItem: BraceletItem | null;
  // 분석용 파싱 데이터
  weapon: WeaponInfo | null;
  engravings: EngravingInfo[];
  gems: GemInfo[];
  cardSets: CardSetInfo[];
  arkPassive: ArkPassiveInfo | null;
  accessories: AccessoryGrinding[];
  bracelet: BraceletEffect[];
  combatStats: CombatStats;
  // 아크 그리드
  arkGrid: ArkGridInfo | null;
};

// ============================
// 등급 색상
// ============================
export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    '에스더': '#3dd2cc',
    '고대': '#d97706',
    '유물': '#9333ea',
    '영웅': '#3b82f6',
    '희귀': '#10b981',
    '전설': '#f59e0b',
  };
  return colors[grade] || '#6b7280';
}

// ============================
// 연마 효과 등급 분류 (상/중/하)
// ============================
function classifyGrindingGrade(hexColor: string): string {
  const hex = hexColor.toUpperCase();
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 상 (Gold/Orange/Yellow): high R, medium-high G, low B
  if (r > 180 && g > 120 && b < 130) return '상';
  // 중 (Purple): medium R, low G, high B
  if (b > 150 && g < 140 && r > 80) return '중';
  // 하 (Sky blue/Cyan): high B, medium-high G
  if (b > 180 && g > 140 && r < 170) return '하';
  // 하 (Green): high G
  if (g > 180 && r < 170 && b < 130) return '하';

  return '';
}

// ============================
// 파서 함수들
// ============================

export function parseProfile(profileData: any): CombatProfile | null {
  if (!profileData) return null;

  const itemLevel = parseFloat(
    (profileData.ItemAvgLevel || '0').replace(/,/g, '')
  );

  let combatPower = 0;
  if (profileData.Stats && Array.isArray(profileData.Stats)) {
    const cpStat = profileData.Stats.find((s: any) => s.Type === '공격력');
    if (cpStat) {
      combatPower = parseInt((cpStat.Value || '0').replace(/,/g, ''), 10);
    }
  }

  return {
    characterName: profileData.CharacterName || '',
    className: profileData.CharacterClassName || '',
    itemLevel,
    combatPower,
    characterImage: profileData.CharacterImage || undefined,
    serverName: profileData.ServerName || undefined,
    guildName: profileData.GuildName || undefined,
    title: profileData.Title || undefined,
    expeditionLevel: profileData.ExpeditionLevel || undefined,
    characterLevel: profileData.CharacterLevel || undefined,
  };
}

export function parseCombatStats(profileData: any): CombatStats {
  const stats: CombatStats = {
    crit: 0, specialization: 0, swiftness: 0,
    domination: 0, endurance: 0, expertise: 0,
  };
  if (!profileData?.Stats || !Array.isArray(profileData.Stats)) return stats;

  const statMap: Record<string, keyof CombatStats> = {
    '치명': 'crit', '특화': 'specialization', '신속': 'swiftness',
    '제압': 'domination', '인내': 'endurance', '숙련': 'expertise',
  };

  for (const stat of profileData.Stats) {
    const key = statMap[stat.Type];
    if (key) {
      stats[key] = parseInt((stat.Value || '0').replace(/,/g, ''), 10);
    }
  }
  return stats;
}

// 장비 아이템 파싱 (표시용)
export function parseEquipmentItems(equipmentData: any[]): EquipmentItem[] {
  const result: EquipmentItem[] = [];
  if (!equipmentData || !Array.isArray(equipmentData)) return result;

  const armorTypes = ['무기', '투구', '어깨', '상의', '하의', '장갑'];

  for (const item of equipmentData) {
    if (!armorTypes.includes(item.Type)) continue;

    let quality = 0, itemLevel = 0, enhanceLevel = 0, advancedLevel = 0;
    let transcendence = 0;
    const elixir: string[] = [];
    let setName = '';

    try {
      const tooltip = JSON.parse(item.Tooltip);

      // 품질
      if (tooltip.Element_001?.value?.qualityValue !== undefined) {
        quality = tooltip.Element_001.value.qualityValue;
      }

      // 아이템 레벨
      if (tooltip.Element_001?.value?.leftStr2) {
        const m = tooltip.Element_001.value.leftStr2.match(/아이템 레벨 (\d+)/);
        if (m) itemLevel = parseInt(m[1], 10);
      }

      // 강화 단계
      const enhanceMatch = (item.Name || '').match(/^\+(\d+)/);
      if (enhanceMatch) enhanceLevel = parseInt(enhanceMatch[1], 10);

      // 상급 재련, 초월, 엘릭서, 세트 등 tooltip에서 추출
      for (const key in tooltip) {
        if (!key.startsWith('Element_')) continue;
        const val = JSON.stringify(tooltip[key]);

        // 상급 재련
        if (val.includes('상급 재련')) {
          const m = val.replace(/<[^>]*>/g, '').match(/상급\s*재련[^\d]*(\d+)\s*단계/);
          if (m) advancedLevel = parseInt(m[1], 10);
        }

        // 초월
        if (val.includes('초월')) {
          const m = val.replace(/<[^>]*>/g, '').match(/(\d+)단계/);
          if (m && !val.includes('상급')) transcendence = parseInt(m[1], 10);
        }

        // 엘릭서
        if (val.includes('엘릭서') && val.includes('Lv')) {
          const cleaned = val.replace(/<[^>]*>/g, '');
          const matches = cleaned.match(/\[(.+?)\]\s*Lv\.?\s*(\d+)/g);
          if (matches) {
            for (const m of matches) {
              elixir.push(m.replace(/\[|\]/g, '').trim());
            }
          }
        }

        // 세트 효과
        if (val.includes('세트 효과') || val.includes('Lv.')) {
          const setMatch = val.replace(/<[^>]*>/g, '').match(/(악몽|사멸|환각|지배|구원|갈망|배신|매혹)\s/);
          if (setMatch && !setName) setName = setMatch[1];
        }
      }
    } catch {
      // 파싱 실패
    }

    result.push({
      type: item.Type,
      name: item.Name || '',
      icon: item.Icon || '',
      grade: item.Grade || '',
      quality,
      itemLevel,
      enhanceLevel,
      advancedLevel,
      transcendence,
      elixir,
      setName,
    });
  }

  // 순서 정렬: 무기, 투구, 어깨, 상의, 하의, 장갑
  const order = ['무기', '투구', '어깨', '상의', '하의', '장갑'];
  result.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  return result;
}

// 연마 효과 키워드 (긴 것부터 → 짧은 것 순서로 매칭)
const EFFECT_KEYWORDS = [
  '상태이상 공격 지속시간', '공격력 강화 효과', '적에게 주는 피해',
  '파티원 회복 효과', '치명타 적중률', '무기 공격력', '치명타 피해',
  '최대 생명력', '최대 마나', '추가 피해', '공격력',
];

// 합쳐진 텍스트를 개별 효과로 분리 (키워드 위치 기반)
function splitEffectText(text: string): string[] {
  if (text.length < 15) return [text];

  // 키워드 위치 탐색
  const positions: { start: number; len: number }[] = [];
  for (const kw of EFFECT_KEYWORDS) {
    let from = 0;
    while (true) {
      const idx = text.indexOf(kw, from);
      if (idx === -1) break;
      // 이미 더 긴 키워드에 포함된 위치인지 확인
      const overlap = positions.some(p => idx >= p.start && idx < p.start + p.len);
      if (!overlap) positions.push({ start: idx, len: kw.length });
      from = idx + kw.length;
    }
  }

  if (positions.length === 0) return [text];
  positions.sort((a, b) => a.start - b.start);

  const parts: string[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end = i + 1 < positions.length ? positions[i + 1].start : text.length;
    const part = text.substring(start, end).trim();
    if (part.length > 2) parts.push(part);
  }
  return parts.length > 0 ? parts : [text];
}

// 장신구 파싱 (표시용)
export function parseAccessoryItems(equipmentData: any[]): AccessoryItem[] {
  const result: AccessoryItem[] = [];
  if (!equipmentData || !Array.isArray(equipmentData)) return result;

  const accessoryTypes = ['목걸이', '귀걸이', '반지'];

  for (const item of equipmentData) {
    if (!accessoryTypes.some(t => item.Type?.includes(t))) continue;

    let quality = 0;
    const grindingEffects: { text: string; grade: string }[] = [];
    const engravingEffects: string[] = [];
    const stats: string[] = [];

    try {
      const tooltip = JSON.parse(item.Tooltip);

      if (tooltip.Element_001?.value?.qualityValue !== undefined) {
        quality = tooltip.Element_001.value.qualityValue;
      }

      for (const key in tooltip) {
        if (!key.startsWith('Element_')) continue;
        const el = tooltip[key];
        const val = JSON.stringify(el);
        const cleaned = val.replace(/<[^>]*>/g, '');

        // 전투 특성
        if (cleaned.includes('치명') || cleaned.includes('특화') || cleaned.includes('신속')) {
          const statMatches = cleaned.match(/(치명|특화|신속|제압|인내|숙련)\s*\+\s*(\d+)/g);
          if (statMatches) {
            for (const sm of statMatches) {
              if (!stats.includes(sm.trim())) stats.push(sm.trim());
            }
          }
        }

        // 연마 효과 - 구조 탐색 우선
        if (val.includes('연마 효과')) {
          // 방법 1: IndentStringGroup → contentStr 개별 요소 = 개별 효과
          if (el?.type === 'IndentStringGroup' && el?.value) {
            for (const gk in el.value) {
              const group = el.value[gk];
              if (!group?.contentStr) continue;
              const contentObj = typeof group.contentStr === 'object'
                ? group.contentStr : { '0': String(group.contentStr) };
              for (const ck in contentObj) {
                const raw = String(contentObj[ck]);
                const fontMatch = raw.match(/<[Ff][Oo][Nn][Tt][^>]*[Cc][Oo][Ll][Oo][Rr]=['"]?#([A-Fa-f0-9]{6})['"]?[^>]*>/);
                const text = raw.replace(/<[^>]*>/g, '').replace(/[{}"\[\]\\]/g, '').replace(/\\n/g, ' ').trim();
                // 숫자가 있는 실제 효과만 (헤더 "연마 효과" 등 제외)
                if (text.length > 2 && /\d/.test(text) && !grindingEffects.some(e => e.text === text)) {
                  // 합쳐진 텍스트면 분리
                  const parts = splitEffectText(text);
                  for (const part of parts) {
                    if (!grindingEffects.some(e => e.text === part)) {
                      grindingEffects.push({ text: part, grade: fontMatch ? classifyGrindingGrade(fontMatch[1]) : '' });
                    }
                  }
                }
              }
            }
          }

          // 방법 2: FONT 태그 개별 추출 + 키워드 분할 fallback
          if (grindingEffects.length === 0) {
            const fontRegex = /<[Ff][Oo][Nn][Tt][^>]*[Cc][Oo][Ll][Oo][Rr]=['"]?#([A-Fa-f0-9]{6})['"]?[^>]*>([^<]*)<\/[Ff][Oo][Nn][Tt]>/g;
            const fontMatches = [...val.matchAll(fontRegex)];
            for (const fm of fontMatches) {
              const hex = fm[1];
              const rawText = fm[2].replace(/\\n/g, '').replace(/[{}"\[\]]/g, '').trim();
              if (rawText.length < 3 || !/\d/.test(rawText)) continue;
              const parts = splitEffectText(rawText);
              for (const part of parts) {
                if (part.length > 2 && /\d/.test(part) && !grindingEffects.some(e => e.text === part)) {
                  grindingEffects.push({ text: part, grade: classifyGrindingGrade(hex) });
                }
              }
            }
          }

          // 방법 3: 키워드 분할 최후 수단
          if (grindingEffects.length === 0) {
            const parts = splitEffectText(cleaned);
            for (const part of parts) {
              const trimmed = part.replace(/[{}"\[\]]/g, '').trim();
              if (trimmed.length > 2 && /\d/.test(trimmed) && !grindingEffects.some(e => e.text === trimmed)) {
                grindingEffects.push({ text: trimmed, grade: '' });
              }
            }
          }
        }

        // 각인 효과
        if (cleaned.includes('활성도')) {
          const engMatches = cleaned.match(/\[(.+?)\]\s*활성도\s*\+?\s*(\d+)/g);
          if (engMatches) {
            for (const em of engMatches) {
              engravingEffects.push(em.replace(/\[|\]/g, '').trim());
            }
          }
        }
      }
    } catch {
      // 파싱 실패
    }

    result.push({
      type: item.Type || '',
      name: item.Name || '',
      icon: item.Icon || '',
      grade: item.Grade || '',
      quality,
      grindingEffects,
      engravingEffects,
      stats,
    });
  }

  return result;
}

// 어빌리티 스톤 파싱
export function parseAbilityStone(equipmentData: any[]): AbilityStoneItem | null {
  if (!equipmentData || !Array.isArray(equipmentData)) return null;

  const stone = equipmentData.find((item: any) =>
    item.Type === '어빌리티 스톤' || item.Type?.includes('스톤')
  );
  if (!stone) return null;

  const engravings: { name: string; level: number }[] = [];
  let reduction: { name: string; level: number } | null = null;

  // contentStr에서 각인/감소 추출 헬퍼
  function extractFromText(text: string) {
    const clean = text.replace(/<[^>]*>/g, '').replace(/[{}"\[\]\\]/g, ' ').trim();
    // [이름] 활성도 +숫자 (활성도 키워드 필수)
    const engMatch = clean.match(/\[(.+?)\]\s*활성도\s*\+?\s*(\d+)/);
    if (engMatch && !engravings.some(e => e.name === engMatch[1].trim())) {
      engravings.push({ name: engMatch[1].trim(), level: parseInt(engMatch[2], 10) });
    }
    // [이름] 감소 +숫자
    const redMatch = clean.match(/\[(.+?)\]\s*감소\s*\+?\s*(\d+)/);
    if (redMatch && !reduction) {
      reduction = { name: redMatch[1].trim(), level: parseInt(redMatch[2], 10) };
    }
  }

  try {
    const tooltip = JSON.parse(stone.Tooltip);
    for (const key in tooltip) {
      if (!key.startsWith('Element_')) continue;
      const el = tooltip[key];

      // 방법 1: 전체 문자열화 후 패턴 매칭
      const val = JSON.stringify(el);
      const cleaned = val.replace(/<[^>]*>/g, '');

      const matches = cleaned.match(/\[(.+?)\]\s*활성도\s*\+?\s*(\d+)/g);
      if (matches) {
        for (const m of matches) {
          const parsed = m.match(/\[(.+?)\]\s*활성도\s*\+?\s*(\d+)/);
          if (parsed && !engravings.some(e => e.name === parsed[1].trim())) {
            engravings.push({ name: parsed[1].trim(), level: parseInt(parsed[2], 10) });
          }
        }
      }

      // 감소 효과
      if (!reduction) {
        const reductionMatch = cleaned.match(/\[(.+?)\]\s*감소\s*\+?\s*(\d+)/);
        if (reductionMatch) {
          reduction = { name: reductionMatch[1].trim(), level: parseInt(reductionMatch[2], 10) };
        }
      }

      // 방법 2: IndentStringGroup 구조 직접 탐색
      if (el?.type === 'IndentStringGroup' && el?.value) {
        for (const gk in el.value) {
          const group = el.value[gk];
          // contentStr 탐색
          if (group?.contentStr) {
            if (typeof group.contentStr === 'object') {
              for (const ck in group.contentStr) {
                extractFromText(String(group.contentStr[ck]));
              }
            } else if (typeof group.contentStr === 'string') {
              extractFromText(group.contentStr);
            }
          }
          // topStr 탐색
          if (group?.topStr) {
            extractFromText(typeof group.topStr === 'string' ? group.topStr : JSON.stringify(group.topStr));
          }
        }
      }

      // 방법 3: 활성도/감소 키워드가 포함된 Element에서만 넓은 패턴 시도
      if (engravings.length === 0 && (cleaned.includes('활성도') || cleaned.includes('감소'))) {
        const broadMatches = cleaned.match(/\[([가-힣\w\s]+?)\]\s*(?:활성도\s*)?(?:\+|Lv\.?)\s*(\d+)/g);
        if (broadMatches) {
          for (const m of broadMatches) {
            const parsed = m.match(/\[([가-힣\w\s]+?)\]\s*(?:활성도\s*)?(?:\+|Lv\.?)\s*(\d+)/);
            if (parsed) {
              const name = parsed[1].trim();
              const level = parseInt(parsed[2], 10);
              if (name.length > 1 && level >= 0 && level <= 10 && !engravings.some(e => e.name === name)) {
                engravings.push({ name, level });
              }
            }
          }
        }
      }
    }
  } catch {
    // 파싱 실패
  }

  return {
    name: stone.Name || '',
    icon: stone.Icon || '',
    grade: stone.Grade || '',
    engravings,
    reduction,
  };
}

// ============================
// 팔찌 효과 등급 분류 (상/중/하)
// ============================
type BraceletGradeRule = {
  keyword: string;
  percent?: { mid: number; high: number };
  flat?: { mid: number; high: number };
};

// 긴 키워드 우선 매칭 (overlap 방지)
const BRACELET_GRADE_RULES: BraceletGradeRule[] = [
  { keyword: '상태이상 공격 지속시간', percent: { mid: 0.50, high: 0.90 } },
  { keyword: '공격력 강화 효과', percent: { mid: 1.80, high: 3.10 } },
  { keyword: '파티원 회복 효과', percent: { mid: 0.80, high: 1.40 } },
  { keyword: '적에게 주는 피해', percent: { mid: 0.75, high: 1.25 } },
  { keyword: '치명타 적중률', percent: { mid: 0.80, high: 1.40 } },
  { keyword: '무기 공격력', percent: { mid: 1.00, high: 1.65 } },
  { keyword: '치명타 피해', percent: { mid: 2.00, high: 3.70 } },
  { keyword: '최대 생명력', flat: { mid: 6000, high: 14000 } },
  { keyword: '추가 피해', percent: { mid: 1.00, high: 1.85 } },
  { keyword: '최대 마나', flat: { mid: 16, high: 36 } },
  { keyword: '공격력', percent: { mid: 1.00, high: 1.65 }, flat: { mid: 520, high: 1240 } },
];

export function classifyBraceletGrade(text: string): string {
  const rule = BRACELET_GRADE_RULES.find(r => text.includes(r.keyword));
  if (!rule) return '';

  const percentMatch = text.match(/([\d,]+\.?\d*)\s*%/);
  const flatMatch = text.match(/([\d,]+)/);

  let thresholds: { mid: number; high: number } | undefined;
  let value: number;

  if (percentMatch && rule.percent) {
    value = parseFloat(percentMatch[1].replace(/,/g, ''));
    thresholds = rule.percent;
  } else if (flatMatch && rule.flat) {
    value = parseFloat(flatMatch[1].replace(/,/g, ''));
    thresholds = rule.flat;
  } else {
    return '';
  }

  if (value >= thresholds.high) return '상';
  if (value >= thresholds.mid) return '중';
  return '하';
}

// 팔찌 문장 분리 ("~한다." "~된다." 등 단위)
function splitBraceletSentences(text: string): string[] {
  if (!text.includes('다.') || text.length < 10) return [text];
  // "다." 뒤에서 분리 (lookbehind)
  const parts = text.split(/(?<=다\.)/);
  return parts.map(p => p.trim()).filter(p => p.length > 1);
}

// 팔찌 파싱 (표시용)
export function parseBraceletItem(equipmentData: any[]): BraceletItem | null {
  if (!equipmentData || !Array.isArray(equipmentData)) return null;

  const bracelet = equipmentData.find((item: any) => item.Type === '팔찌');
  if (!bracelet) return null;

  const effects: string[] = [];
  const stats: string[] = [];
  const effectKeywords = ['정밀', '습격', '급소', '강타', '열정', '신념', '축복'];

  try {
    const tooltip = JSON.parse(bracelet.Tooltip);
    for (const key in tooltip) {
      if (!key.startsWith('Element_')) continue;
      const el = tooltip[key];
      const val = JSON.stringify(el);
      const cleaned = val.replace(/<[^>]*>/g, '');

      // 전투 특성
      const statMatches = cleaned.match(/(치명|특화|신속|제압|인내|숙련)\s*\+\s*(\d+)/g);
      if (statMatches) {
        for (const sm of statMatches) {
          if (!stats.includes(sm.trim())) stats.push(sm.trim());
        }
      }

      // 방법 1: IndentStringGroup 구조 탐색 (개별 contentStr = 개별 효과)
      if (el?.type === 'IndentStringGroup' && el?.value) {
        for (const gk in el.value) {
          const group = el.value[gk];
          if (!group?.contentStr) continue;
          const contentObj = typeof group.contentStr === 'object'
            ? group.contentStr : { '0': String(group.contentStr) };
          for (const ck in contentObj) {
            const raw = String(contentObj[ck]);
            const text = raw.replace(/<[^>]*>/g, '').replace(/[{}"\[\]\\]/g, '').replace(/\\n/g, ' ').trim();
            if (text.length < 2) continue;
            // 스탯 라인 제외 (이미 위에서 캡처)
            if (/^(치명|특화|신속|제압|인내|숙련)\s*\+\s*\d+$/.test(text)) continue;
            // "다." 단위 문장 분리
            const sentences = splitBraceletSentences(text);
            for (const sent of sentences) {
              if (sent.length > 1 && !effects.includes(sent)) {
                effects.push(sent);
              }
            }
          }
        }
      }

      // 방법 2: fallback - 키워드 + 수치 효과
      if (effects.length === 0) {
        for (const kw of effectKeywords) {
          if (cleaned.includes(kw) && !effects.includes(kw)) {
            effects.push(kw);
          }
        }
        const numericEffects = cleaned.match(/(치명타 피해|추가 피해|공격력|무기 공격력|적에게 주는 피해)[^,\n\r{}"\[\]]*/g);
        if (numericEffects) {
          for (const ne of numericEffects) {
            const trimmed = ne.replace(/[{}"\[\]]/g, '').trim();
            const sentences = splitBraceletSentences(trimmed);
            for (const sent of sentences) {
              if (sent.length > 3 && !effects.includes(sent)) {
                effects.push(sent);
              }
            }
          }
        }
      }
    }
  } catch {
    // 파싱 실패
  }

  return {
    name: bracelet.Name || '',
    icon: bracelet.Icon || '',
    grade: bracelet.Grade || '',
    effects,
    stats,
  };
}

// 무기 정보 파싱 (분석용)
export function parseWeaponInfo(equipmentData: any[]): WeaponInfo | null {
  if (!equipmentData || !Array.isArray(equipmentData)) return null;

  const weapon = equipmentData.find((item: any) => item.Type === '무기');
  if (!weapon) return null;

  let quality = 0, additionalDamage = 0;

  try {
    const tooltip = JSON.parse(weapon.Tooltip);
    if (tooltip.Element_001?.value?.qualityValue !== undefined) {
      quality = tooltip.Element_001.value.qualityValue;
    }
    for (const key in tooltip) {
      if (key.startsWith('Element_')) {
        const val = JSON.stringify(tooltip[key]);
        const dmgMatch = val.match(/추가 피해\s*\+?\s*([\d.]+)%/);
        if (dmgMatch) additionalDamage = parseFloat(dmgMatch[1]);
      }
    }
  } catch { /* */ }

  return { quality, additionalDamage, grade: weapon.Grade || '' };
}

// 각인 정보 파싱
export function parseEngravings(engravingsData: any): EngravingInfo[] {
  const result: EngravingInfo[] = [];
  if (!engravingsData) return result;

  // ArkPassiveEffects (아크 패시브 각인)
  if (engravingsData.ArkPassiveEffects && Array.isArray(engravingsData.ArkPassiveEffects)) {
    for (const effect of engravingsData.ArkPassiveEffects) {
      const name = effect.Name || '';
      const level = effect.Level || 0;
      const abilityStoneLevel = effect.AbilityStoneLevel || 0;
      if (name) {
        result.push({
          name: name.replace(/\s*Lv\.\s*\d+/, '').trim(),
          level,
          abilityStoneLevel,
          isArkPassive: true,
          icon: effect.Icon || undefined,
        });
      }
    }
  }

  // Effects (일반 각인)
  if (engravingsData.Effects && Array.isArray(engravingsData.Effects)) {
    for (const effect of engravingsData.Effects) {
      const name = effect.Name || '';
      const match = name.match(/(.+?)\s*Lv\.\s*(\d+)/);
      if (match) {
        result.push({
          name: match[1].trim(),
          level: parseInt(match[2], 10),
          abilityStoneLevel: 0,
          isArkPassive: false,
          icon: effect.Icon || undefined,
        });
      }
    }
  }

  return result;
}

// 보석 정보 파싱
export function parseGems(gemsData: any): GemInfo[] {
  const result: GemInfo[] = [];
  if (!gemsData?.Gems || !Array.isArray(gemsData.Gems)) return result;

  for (const gem of gemsData.Gems) {
    const name = gem.Name || '';
    const levelMatch = name.match(/(\d+)레벨/);
    const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;

    let type = '멸화';
    if (name.includes('홍염')) type = '홍염';
    else if (name.includes('겁화')) type = '겁화';
    else if (name.includes('작열')) type = '작열';

    let tier = 4;
    if ((type === '멸화' || type === '홍염') && !name.includes('겁화') && !name.includes('작열')) {
      tier = 3;
    }
    if (type === '겁화' || type === '작열') tier = 4;

    result.push({
      tier,
      level,
      type,
      skillName: gem.SkillName || gem.SkilName || '',
      icon: gem.Icon,
    });
  }

  // 레벨 내림차순 정렬
  result.sort((a, b) => b.level - a.level);
  return result;
}

// 카드 세트 파싱
export function parseCardSets(cardsData: any): CardSetInfo[] {
  const result: CardSetInfo[] = [];
  if (!cardsData?.Effects || !Array.isArray(cardsData.Effects)) return result;

  for (const effect of cardsData.Effects) {
    const items = effect.Items || [];
    if (items.length === 0) continue;

    const effects: string[] = [];
    let setName = '';
    let activeCount = 0;
    let awakening = 0;

    for (const item of items) {
      const name = item.Name || '';
      effects.push(name);

      const setMatch = name.match(/(.+?)\s*(\d+)세트/);
      if (setMatch) {
        setName = setMatch[1].trim();
        activeCount = parseInt(setMatch[2], 10);
      }
      const awakeningMatch = name.match(/각성합계\s*(\d+)/);
      if (awakeningMatch) {
        awakening = Math.max(awakening, parseInt(awakeningMatch[1], 10));
      }
    }

    if (setName) {
      result.push({ name: setName, activeCount, awakening, effects });
    }
  }

  return result;
}

// 아크 패시브 파싱
export function parseArkPassive(arkpassiveData: any): ArkPassiveInfo | null {
  if (!arkpassiveData?.Points || !Array.isArray(arkpassiveData.Points)) return null;

  let evolution = 0, enlightenment = 0, leap = 0;

  for (const point of arkpassiveData.Points) {
    const name = point.Name || '';
    const value = point.Value || 0;
    if (name.includes('진화')) evolution = value;
    else if (name.includes('깨달음')) enlightenment = value;
    else if (name.includes('도약')) leap = value;
  }

  return { evolution, enlightenment, leap };
}

// 장신구 연마 효과 파싱 (분석용)
export function parseAccessoryGrinding(equipmentData: any[]): AccessoryGrinding[] {
  const result: AccessoryGrinding[] = [];
  if (!equipmentData || !Array.isArray(equipmentData)) return result;

  const accessoryTypes = ['목걸이', '귀걸이', '반지'];
  for (const item of equipmentData) {
    if (!accessoryTypes.some(t => item.Type?.includes(t))) continue;
    const effects: { name: string; grade: string }[] = [];
    try {
      const tooltip = JSON.parse(item.Tooltip);
      for (const key in tooltip) {
        if (!key.startsWith('Element_')) continue;
        const val = JSON.stringify(tooltip[key]);
        if (val.includes('연마 효과')) {
          const patterns = [
            /공격력\s*[\+]?\s*[\d.]+/g, /무기 공격력\s*[\+]?\s*[\d.]+/g,
            /추가 피해\s*[\+]?\s*[\d.]+/g, /적에게 주는 피해[^<]*/g,
            /치명타 피해\s*[\+]?\s*[\d.]+/g, /치명타 적중률\s*[\+]?\s*[\d.]+/g,
          ];
          for (const pattern of patterns) {
            const matches = val.match(pattern);
            if (matches) {
              for (const m of matches) {
                effects.push({ name: m.replace(/<[^>]*>/g, '').trim(), grade: '중' });
              }
            }
          }
        }
      }
    } catch { /* */ }
    if (effects.length > 0) result.push({ slot: item.Type || '', effects });
  }
  return result;
}

// 팔찌 효과 파싱 (분석용)
export function parseBraceletEffects(equipmentData: any[]): BraceletEffect[] {
  const result: BraceletEffect[] = [];
  if (!equipmentData || !Array.isArray(equipmentData)) return result;

  const bracelet = equipmentData.find((item: any) => item.Type === '팔찌');
  if (!bracelet) return result;

  try {
    const tooltip = JSON.parse(bracelet.Tooltip);
    for (const key in tooltip) {
      if (!key.startsWith('Element_')) continue;
      const val = JSON.stringify(tooltip[key]);

      const effectPatterns = [
        { pattern: /치명타 피해\s*\+\s*([\d.]+)/g, name: '치명타 피해 +' },
        { pattern: /추가 피해\s*\+\s*([\d.]+)/g, name: '추가 피해 +' },
        { pattern: /공격력\s*\+\s*([\d]+)/g, name: '공격력 +' },
        { pattern: /무기 공격력\s*\+\s*([\d.]+)/g, name: '무기 공격력 +' },
      ];
      for (const { pattern, name } of effectPatterns) {
        const matches = val.matchAll(pattern);
        for (const match of matches) {
          result.push({ name, value: parseFloat(match[1]) });
        }
      }

      const fixedEffects = ['정밀', '습격', '급소', '강타', '열정', '신념'];
      for (const effectName of fixedEffects) {
        if (val.includes(effectName)) result.push({ name: effectName, value: 1 });
      }
    }
  } catch { /* */ }

  return result;
}

// 아크 그리드 파싱
export function parseArkGrid(arkgridData: any): ArkGridInfo | null {
  if (!arkgridData?.Slots || !Array.isArray(arkgridData.Slots)) return null;

  const cores: ArkGridCore[] = [];

  for (const slot of arkgridData.Slots) {
    let coreType = '';
    let willpower = 0;

    try {
      const tooltip = JSON.parse(slot.Tooltip);
      // 코어 타입 (Element_003 or 004 → "질서 - 해")
      for (const key in tooltip) {
        const el = tooltip[key];
        if (el?.type === 'ItemPartBox') {
          const val = JSON.stringify(el.value);
          const cleaned = val.replace(/<[^>]*>/g, '');
          if (cleaned.includes('코어 타입')) {
            const m = cleaned.match(/Element_001["\s:]*([^"]+)/);
            if (m) coreType = m[1].trim();
          }
          if (cleaned.includes('의지력')) {
            const m = cleaned.match(/(\d+)\s*포인트/);
            if (m) willpower = parseInt(m[1], 10);
          }
        }
      }
    } catch { /* */ }

    // 젬 파싱
    const gems: ArkGridGem[] = [];
    if (slot.Gems && Array.isArray(slot.Gems)) {
      for (const gem of slot.Gems) {
        let gemName = '';
        let gemPoint = 0;
        let orderPoint = 0;
        let chaosPoint = 0;
        const effects: string[] = [];

        let debugTooltip = '';
        try {
          const gtt = JSON.parse(gem.Tooltip);
          // 디버그: 전체 tooltip 텍스트 (HTML 제거)
          debugTooltip = JSON.stringify(gtt).replace(/<[^>]*>/g, '').substring(0, 500);

          // 이름
          const nameEl = gtt.Element_000;
          if (nameEl?.value) {
            gemName = nameEl.value.replace(/<[^>]*>/g, '').trim();
          }

          // 모든 Element 순회 (ItemPartBox 외 타입도 포함)
          for (const k in gtt) {
            const el = gtt[k];
            if (!el) continue;
            const val = JSON.stringify(el.value || el);
            const cleaned = val.replace(/<[^>]*>/g, '');

            // 젬 포인트 (ItemPartBox)
            if (cleaned.includes('젬 포인트')) {
              const m = cleaned.match(/젬 포인트\s*[:：]\s*(\d+)/);
              if (m) gemPoint = parseInt(m[1], 10);
            }

            // 젬 효과 - 모든 효과 라인 캡처
            if (cleaned.includes('젬 효과') && effects.length === 0) {
              // 1차: <br> 기반 분할 (HTML 원본에서)
              const html = val.replace(/\\r\\n/g, '').replace(/\\n/g, '');
              const brParts = html.split(/<br\s*\/?>/i);
              for (const part of brParts) {
                const c = part.replace(/<[^>]*>/g, '').replace(/[{}"\\[\]]/g, '').trim();
                // 숫자가 있고 헤더가 아닌 모든 라인
                if (c.length > 1 && /\d/.test(c) &&
                  !c.includes('젬 효과') && !c.includes('의지력') &&
                  !c.includes('젬 포인트') && !c.includes('Element_')) {
                  if (!effects.includes(c)) effects.push(c);
                }
              }
              // 2차 fallback: \n 기반 분할
              if (effects.length === 0) {
                const lines = cleaned.split(/\\n|\\r|\n|,/);
                for (const line of lines) {
                  const c = line.replace(/[{}"\\[\]]/g, '').trim();
                  if (c.length > 1 && /\d/.test(c) &&
                    !c.includes('젬 효과') && !c.includes('의지력') &&
                    !c.includes('젬 포인트') && !c.includes('Element_')) {
                    if (!effects.includes(c)) effects.push(c);
                  }
                }
              }
            }
          }

          // 효과에서 질서/혼돈 포인트 추출
          for (const eff of effects) {
            if (orderPoint === 0 && eff.includes('질서')) {
              const m = eff.match(/질서\s*(\d+)/);
              if (m) orderPoint = parseInt(m[1], 10);
            }
            if (chaosPoint === 0 && eff.includes('혼돈')) {
              const m = eff.match(/혼돈\s*(\d+)/);
              if (m) chaosPoint = parseInt(m[1], 10);
            }
          }

          // 전체 tooltip broad search fallback
          if (orderPoint === 0 || chaosPoint === 0) {
            const fullText = JSON.stringify(gtt).replace(/<[^>]*>/g, '');
            if (orderPoint === 0) {
              const om = fullText.match(/질서\s*[:：]?\s*(\d+)/);
              if (om) orderPoint = parseInt(om[1], 10);
            }
            if (chaosPoint === 0) {
              const cm = fullText.match(/혼돈\s*[:：]?\s*(\d+)/);
              if (cm) chaosPoint = parseInt(cm[1], 10);
            }
          }
        } catch { /* */ }

        gems.push({
          icon: gem.Icon || '',
          grade: gem.Grade || '',
          name: gemName,
          point: gemPoint,
          orderPoint,
          chaosPoint,
          effects,
          _debug: debugTooltip,
        });
      }
    }

    cores.push({
      name: slot.Name || '',
      icon: slot.Icon || '',
      grade: slot.Grade || '',
      point: slot.Point || 0,
      coreType,
      willpower,
      gems,
    });
  }

  // 효과 합산
  const effects: ArkGridEffect[] = [];
  if (arkgridData.Effects && Array.isArray(arkgridData.Effects)) {
    for (const eff of arkgridData.Effects) {
      effects.push({
        name: eff.Name || '',
        level: eff.Level || 0,
        tooltip: (eff.Tooltip || '').replace(/<[^>]*>/g, '').trim(),
      });
    }
  }

  return { cores, effects };
}

// ============================
// 종합 파서
// ============================
export function parseCombatPowerData(apiResponse: any): CombatPowerData | null {
  const profile = parseProfile(apiResponse.profile);
  if (!profile) return null;

  return {
    profile,
    equipmentItems: parseEquipmentItems(apiResponse.equipment),
    accessoryItems: parseAccessoryItems(apiResponse.equipment),
    abilityStone: parseAbilityStone(apiResponse.equipment),
    braceletItem: parseBraceletItem(apiResponse.equipment),
    weapon: parseWeaponInfo(apiResponse.equipment),
    engravings: parseEngravings(apiResponse.engravings),
    gems: parseGems(apiResponse.gems),
    cardSets: parseCardSets(apiResponse.cards),
    arkPassive: parseArkPassive(apiResponse.arkpassive),
    accessories: parseAccessoryGrinding(apiResponse.equipment),
    bracelet: parseBraceletEffects(apiResponse.equipment),
    combatStats: parseCombatStats(apiResponse.profile),
    arkGrid: parseArkGrid(apiResponse.arkgrid),
  };
}
