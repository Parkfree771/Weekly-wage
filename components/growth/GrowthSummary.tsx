/* eslint-disable @next/next/no-img-element */
// 성장 시뮬 아래 "한눈에 정리" — 장비 아이콘으로 구조만 보여준다. 자세한 설명은 위 시뮬 말풍선에 있다.
//   [장비 8칸 카드]  →  [아이템 레벨]  ←  [장신구 8칸 카드]
//   카드 아래: 그쪽에서 할 일 (연마 / 재련 / 마력 주입)
//   맨 아래: 단기·중기·장기 뜻 + 따로 가는 것(각인·보석)
// 사이트 라이트/다크 테마를 그대로 따른다.
// 출처: 방송 자막 0:41~1:13 (docs/season3-onair-2026-11-20/transcript.txt).

import styles from './GrowthSummary.module.css';
import { ICON } from './growthData';

type Term = 0 | 1 | 2;
const TERM_NAMES = ['단기', '중기', '장기'] as const;
const TERM_DESC = ['3~4개월이면 끝 · 1년 쓰고 교체', '1년마다 확장 · 아래 구간은 쉬워짐', '오래 걸림 · 가치가 오래 유지'];
const TERM_CLASS = [styles.t0, styles.t1, styles.t2];

const EQUIP = [
  { icon: 'weapon', name: '무기' }, { icon: 'wangap', name: '완갑' }, { icon: 'belt', name: '허리띠' }, { icon: 'helmet', name: '투구' },
  { icon: 'shoulder', name: '견갑' }, { icon: 'chest', name: '상의' }, { icon: 'pants', name: '하의' }, { icon: 'gloves', name: '장갑' },
];
const ACC = [
  { icon: 'necklace', name: '목걸이' }, { icon: 'earring', name: '귀걸이' }, { icon: 'earring', name: '귀걸이' }, { icon: 'ring', name: '반지' },
  { icon: 'ring', name: '반지' }, { icon: 'bracelet', name: '팔찌' }, { icon: 'relic', name: '성물' }, { icon: 'seal', name: '인장' },
];

interface Todo { term: Term; icon: string; name: string; up: string; lv?: boolean }
const EQUIP_TODO: Todo[] = [
  { term: 0, icon: ICON('weapon'), name: '연마', up: '아이템 레벨', lv: true },
  { term: 1, icon: ICON('stone_red'), name: '슬롯 재련', up: '성능' },
];
const ACC_TODO: Todo[] = [
  { term: 0, icon: ICON('necklace'), name: '연마', up: '아이템 레벨', lv: true },
  { term: 1, icon: ICON('infuse_mat'), name: '마력 주입 · 위상', up: '옵션 증폭' },
  { term: 2, icon: ICON('infuse_mat'), name: '마력 주입 · 옵션', up: '전투력' },
];

function Slots({ list }: { list: { icon: string; name: string }[] }) {
  return (
    <div className={styles.slots}>
      {list.map((s, i) => (
        <div key={i} className={styles.slot}>
          <span className={styles.slotIcon}><img src={ICON(s.icon)} alt="" /></span>
          <span className={styles.slotName}>{s.name}</span>
        </div>
      ))}
    </div>
  );
}

function Todos({ list }: { list: Todo[] }) {
  return (
    <div className={styles.todos}>
      {list.map(t => (
        <div key={t.name} className={`${styles.todo} ${TERM_CLASS[t.term]} ${t.lv ? styles.todoLv : ''}`}>
          <span className={styles.todoTerm}>{TERM_NAMES[t.term]}</span>
          <span className={styles.todoIcon}><img src={t.icon} alt="" /></span>
          <span className={styles.todoName}>{t.name}</span>
          <span className={`${styles.todoUp} ${t.lv ? styles.todoUpLv : ''}`}>{t.up} ↑</span>
        </div>
      ))}
    </div>
  );
}

export default function GrowthSummary() {
  return (
    <section className={styles.summary}>
      <h2 className={styles.title}>한눈에 정리</h2>

      <div className={styles.board}>
        {/* 장비 */}
        <div className={styles.side}>
          <div className={styles.sideHead}><b>장비</b><span>8칸</span></div>
          <Slots list={EQUIP} />
          <Todos list={EQUIP_TODO} />
        </div>

        {/* 가운데: 아이템 레벨 */}
        <div className={styles.center}>
          <span className={styles.arrowL} aria-hidden>→</span>
          <div className={styles.ilv}>
            <span className={styles.ilvLabel}>아이템 레벨</span>
            <span className={styles.ilvBig}>16칸 평균</span>
            {/* 아이템 레벨을 올리는 건 양쪽의 연마뿐 */}
            <div className={styles.ilvFrom}>
              <span className={styles.ilvChip}><img src={ICON('weapon')} alt="" />장비 연마</span>
              <span className={styles.ilvPlus}>+</span>
              <span className={styles.ilvChip}><img src={ICON('necklace')} alt="" />장신구 연마</span>
            </div>
            <span className={styles.ilvRule}>더 높은 등급 먹기 <b>+25</b> · 연마 1번 <b>+5</b></span>
            <span className={styles.ilvEx}>예) 고대 1800 + 4연마 20 = 1820</span>
            <span className={styles.ilvNo}>재련 · 마력 주입은 X</span>
          </div>
          <span className={styles.arrowR} aria-hidden>←</span>
        </div>

        {/* 장신구 */}
        <div className={styles.side}>
          <div className={styles.sideHead}><b>장신구</b><span>8칸</span></div>
          <Slots list={ACC} />
          <Todos list={ACC_TODO} />
        </div>
      </div>

      {/* 단기 · 중기 · 장기 + 따로 가는 것 */}
      <div className={styles.bottom}>
        <div className={styles.legend}>
          {TERM_NAMES.map((n, i) => (
            <div key={n} className={`${styles.legendItem} ${TERM_CLASS[i]}`}>
              <b>{n}</b>
              <span>{TERM_DESC[i]}</span>
            </div>
          ))}
        </div>
        <div className={styles.extra}>
          <span className={styles.extraLabel}>따로</span>
          <span className={`${styles.extraItem} ${styles.t1}`}>
            <img src="/engraving2.webp" alt="" />각인 업그레이드<i>중기</i>
          </span>
          <span className={`${styles.extraItem} ${styles.t2}`}>
            <img src="/gem-radiance-8.png" alt="" />보석<i>장기</i>
          </span>
        </div>
      </div>
      <p className={styles.source}>2026년 11월 20일 방송 기준</p>
    </section>
  );
}
