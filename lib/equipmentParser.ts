// 로스트아크 API 장비 응답 타입
export type EquipmentAPIResponse = {
  Type: string; // "투구", "어깨", "상의", "하의", "장갑", "무기" 등
  Name: string;
  Icon: string;
  Grade: string; // "고대", "유물", "영웅" 등
  Tooltip: string; // HTML 문자열로 상세 정보 포함
  // 추가 필드들 (실제 API에서 제공할 수 있는 필드)
  [key: string]: any; // 다른 필드들도 받을 수 있도록
};

// 재련 시뮬레이터용 장비 정보
export type Equipment = {
  name: string; // 장비 이름 (예: 견갑, 투구, 상의, 하의, 장갑, 무기)
  type: 'armor' | 'weapon';
  currentLevel: number; // 현재 강화 레벨 (11~25)
  currentAdvancedLevel: number; // 현재 상급 재련 단계 (0~40)
  itemLevel: number; // 아이템 레벨 (1640~1700)
  grade: string; // 아이템 등급 (고대, 유물 등)
};

// 장비 타입 매핑
const EQUIPMENT_TYPE_MAP: Record<string, 'armor' | 'weapon'> = {
  '투구': 'armor',
  '어깨': 'armor',
  '상의': 'armor',
  '하의': 'armor',
  '장갑': 'armor',
  '무기': 'weapon',
};

// 장비 이름 정규화 (API에서 받은 타입을 우리가 사용하는 이름으로 변환)
const EQUIPMENT_NAME_MAP: Record<string, string> = {
  '투구': '투구',
  '어깨': '견갑',
  '상의': '상의',
  '하의': '하의',
  '장갑': '장갑',
  '무기': '무기',
};

// 아이템 레벨에서 강화 레벨 계산
// 1640 = +10, 1645 = +11, 1650 = +12, ..., 1700 = +22, 1705 = +23, 1710 = +24, 1715 = +25
export function getUpgradeLevelFromItemLevel(itemLevel: number): number {
  if (itemLevel < 1640) return 9; // 1640 미만은 +9 이하
  if (itemLevel >= 1715) return 25; // 1715 이상은 +25

  // 1640부터 5씩 증가
  return Math.floor((itemLevel - 1640) / 5) + 10;
}

// Tooltip에서 아이템 레벨 파싱
export function parseItemLevelFromTooltip(tooltip: string): number | null {
  try {
    const tooltipObj = JSON.parse(tooltip);

    // Element_001의 value.leftStr2에서 아이템 레벨 찾기
    // 예: "아이템 레벨 1755 (티어 4)"
    if (tooltipObj.Element_001?.value?.leftStr2) {
      const leftStr2 = tooltipObj.Element_001.value.leftStr2;
      const itemLevelMatch = leftStr2.match(/아이템 레벨 (\d+)/);
      if (itemLevelMatch) {
        return parseInt(itemLevelMatch[1], 10);
      }
    }

    return null;
  } catch (error) {
    console.error('[Tooltip Parser] Failed to parse tooltip:', error);
    return null;
  }
}

// Tooltip에서 상급 재련 단계 파싱
// Tooltip JSON의 Element들에서 "[상급 재련]" 찾기
export function parseAdvancedRefiningLevelFromTooltip(tooltip: string): number {
  try {
    const tooltipObj = JSON.parse(tooltip);

    // 모든 Element를 순회하면서 "상급 재련" 찾기
    for (const key in tooltipObj) {
      if (key.startsWith('Element_')) {
        const element = tooltipObj[key];

        // Element의 모든 value를 문자열로 변환하여 검색
        const searchInValue = (obj: any): number | null => {
          if (!obj) return null;

          // 객체의 모든 값을 순회
          for (const prop in obj) {
            const val = obj[prop];

            if (typeof val === 'string') {
              // HTML 태그가 포함된 문자열에서 상급 재련 찾기
              // 예: "[상급 재련]</FONT> <FONT COLOR='#FFD200'>40</FONT>단계"
              if (val.includes('상급 재련')) {
                // HTML 태그 제거하고 숫자 추출
                const cleanText = val.replace(/<[^>]*>/g, '');
                // "상급 재련 40단계" 형태에서 숫자 추출
                const match = cleanText.match(/상급\s*재련[^\d]*(\d+)\s*단계/);
                if (match) {
                  return parseInt(match[1], 10);
                }
              }
            } else if (typeof val === 'object' && val !== null) {
              // 재귀적으로 검색
              const result = searchInValue(val);
              if (result !== null) return result;
            }
          }
          return null;
        };

        const result = searchInValue(element);
        if (result !== null) return result;
      }
    }

    return 0; // 상급 재련 정보가 없으면 0 반환
  } catch (error) {
    console.error('[Tooltip Parser] Failed to parse advanced refining level:', error);
    return 0;
  }
}

// Name 필드에서 강화 단계 추출
// 예: "+25 운명의 업화 대검" => 25
export function parseUpgradeLevelFromName(name: string): number | null {
  const match = name.match(/^\+(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

// API 응답을 재련 시뮬레이터용 장비 정보로 변환
export function parseEquipmentData(equipmentResponse: EquipmentAPIResponse[]): Equipment[] {
  const equipments: Equipment[] = [];
  const processedTypes = new Set<string>(); // 중복 방지

  for (const item of equipmentResponse) {
    // 아이템 레벨 파싱
    const itemLevel = parseItemLevelFromTooltip(item.Tooltip);
    if (!itemLevel || itemLevel < 1640) continue;

    // Name에서 강화 단계 직접 추출
    const upgradeLevel = parseUpgradeLevelFromName(item.Name);
    if (!upgradeLevel || upgradeLevel < 10) continue;

    // 상급 재련 단계 파싱
    const advancedLevel = parseAdvancedRefiningLevelFromTooltip(item.Tooltip);

    // Type 필드에서 장비 타입 확인
    let equipmentType: 'armor' | 'weapon' | null = null;
    let equipmentName = item.Type;

    if (EQUIPMENT_TYPE_MAP[item.Type]) {
      equipmentType = EQUIPMENT_TYPE_MAP[item.Type];
      equipmentName = EQUIPMENT_NAME_MAP[item.Type] || item.Type;
    } else {
      // Type이 매칭되지 않으면 Name에서 키워드 찾기
      const nameCheck = item.Name || item.Type;
      if (nameCheck.includes('투구')) {
        equipmentType = 'armor';
        equipmentName = '투구';
      } else if (nameCheck.includes('어깨') || nameCheck.includes('견갑')) {
        equipmentType = 'armor';
        equipmentName = '견갑';
      } else if (nameCheck.includes('상의')) {
        equipmentType = 'armor';
        equipmentName = '상의';
      } else if (nameCheck.includes('하의')) {
        equipmentType = 'armor';
        equipmentName = '하의';
      } else if (nameCheck.includes('장갑')) {
        equipmentType = 'armor';
        equipmentName = '장갑';
      } else if (nameCheck.includes('무기') || nameCheck.includes('대검') || nameCheck.includes('도') || item.Type === '무기') {
        equipmentType = 'weapon';
        equipmentName = '무기';
      }
    }

    if (!equipmentType) continue;

    // 중복 체크 (같은 Type의 장비는 하나만)
    if (processedTypes.has(equipmentName)) continue;
    processedTypes.add(equipmentName);

    equipments.push({
      name: equipmentName,
      type: equipmentType,
      currentLevel: upgradeLevel,
      currentAdvancedLevel: advancedLevel,
      itemLevel: itemLevel,
      grade: item.Grade,
    });
  }

  return equipments;
}

// 장비 등급별 색상 반환
export function getGradeColor(grade: string): string {
  const gradeColors: Record<string, string> = {
    '고대': '#d97706', // 주황색 (Ancient)
    '유물': '#9333ea', // 보라색 (Relic)
    '영웅': '#3b82f6', // 파란색 (Epic)
    '희귀': '#10b981', // 초록색 (Rare)
  };

  return gradeColors[grade] || '#6b7280'; // 기본 회색
}
