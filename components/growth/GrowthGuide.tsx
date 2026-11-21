// 성장 시뮬 설명 말풍선 — 화면의 각 부분(단계, 옵션 줄, 포화도, 재료, 버튼…)과 선으로 이어져서
// "이게 뭐고 무엇과 이어지는지"를 그 자리에서 설명한다. 탭별·부분별 문구는 전부 여기 모아 둔다.
// 내용 출처: 2026-11-20 방송 자막 0:41~1:13 (docs/season3-onair-2026-11-20/transcript.txt).
// 방송에서 말한 내용만, 달라지는 것 위주로 짧게 적는다. 원래 있던 기능(장인의 기운 등)은 설명하지 않는다.

import styles from './Growth.module.css';

// 방송에서 밝힌 새 성장 구조 — 걸리는 시간에 따라 셋으로 나눈다
const TERMS = ['단기', '중기', '장기'] as const;
const TERM_LINES = [
  '응축된 성장의 재미 · 비용 대비 높은 성장 효율',
  '꾸준히 쌓아가는 성장 · 1년 주기로 확장 및 완화',
  '오랜 시간과 비용 소요 · 투자한 가치 오래 유지',
];

export interface NoteData {
  /** 무엇에 대한 설명인지 (작은 금색 이름표) */
  title: string;
  /** 핵심 한 줄 — 가장 크게 보인다 */
  point: string;
  /** 덧붙이는 설명 (없어도 됨) */
  text?: string;
  /** 단기(0) / 중기(1) / 장기(2) 중 이 부분이 속한 곳. 있으면 말풍선 위에 세 칸을 그리고 해당 칸을 켠다 */
  terms?: number[];
}

export const NOTES = {
  polish: {
    head: {
      terms: [0],
      title: '연마 = 아이템 레벨',
      point: '100% 성공 · 한 번에 아이템 레벨 +5 · 5번까지',
      text: '같은 장비를 하나 더 먹어 재료로 쓴다. 아이템 레벨은 이제 재련이 아니라 연마로 올린다.',
    },
    headAcc: {
      terms: [0],
      title: '장신구 연마',
      point: '장신구도 똑같이 연마한다',
      text: '장신구에도 아이템 레벨이 생긴다. 옵션은 마력 주입에서 맞춘다.',
    },
    options: {
      title: '옵션 개방과 변환',
      point: '고대 등급은 연마 1번마다 옵션 1줄',
      text: '금색 버튼으로 그 줄만 다시 뽑는다(재료는 변환석). 번뜩임이 뜬 줄은 그때부터 항상 최고값.',
    },
    mats: {
      title: '재료 장비',
      point: '같은 부위의 같은 장비 1개',
      text: '레이드 · 카오스 던전 · 가디언 토벌에서 나온다.',
    },
  },
  refine: {
    head: {
      terms: [1],
      title: '슬롯 재련',
      point: '장비가 아니라 칸에 재련 · 장비를 바꿔도 그대로',
      text: '아이템 레벨은 오르지 않는다. 그 칸의 성능만 오른다.',
    },
    rate: {
      title: '성공률',
      point: '실패해도 확률은 그대로',
      text: '실패 보정이 처음부터 가득 찬 상태로 시작한다.',
    },
    mats: {
      title: '재련 재료',
      point: '파편 · 돌파석 · 특수 재련 삭제',
      text: '안 쓰게 된 재료는 토큰으로 바꿔 준다.',
    },
  },
  infuse: {
    head: {
      terms: [1, 2],
      title: '마력 주입 = 전투력',
      point: '옵션 3개를 뽑아 저장 → 전투력 상승',
      text: '장신구 쪽 8칸에 한다. 팔찌 · 장신구 옵션 뽑기를 하나로 합친 것.',
    },
    saturation: {
      terms: [1],
      title: '위상',
      point: '주입할 때마다 게이지가 차고, 가득 차면 위상 +1',
      text: '위상이 오르면 저장한 옵션 수치가 커진다. 7위상까지.',
    },
    effects: {
      terms: [2],
      title: '옵션',
      point: '저장한 옵션은 다시 돌려도 사라지지 않는다',
      text: '양옆 금색 버튼은 그 줄만 다시 뽑기(변성). 재료인 제어기가 아주 귀하다.',
    },
    mats: {
      title: '주입 재료',
      point: '품질 · 카르마가 이 재료로 바뀐다',
      text: '두 시스템은 없어지고, 해 둔 만큼 주입 재료로 돌려준다.',
    },
    action: {
      title: '저장',
      point: '저장을 눌러야 새 옵션으로 바뀐다',
    },
  },
} satisfies Record<string, Record<string, NoteData>>;

export function GuideNote({ note }: { note: NoteData }) {
  return (
    <aside className={styles.note} data-note>
      {note.terms && (
        <>
          <div className={styles.terms}>
            {TERMS.map((name, i) => (
              <span key={name} className={`${styles.term} ${note.terms!.includes(i) ? styles.termOn : ''}`}>{name}</span>
            ))}
          </div>
          {note.terms.length === 1 && <p className={styles.termLine}>{TERM_LINES[note.terms[0]]}</p>}
        </>
      )}
      <span className={styles.noteTitle}>{note.title}</span>
      <strong className={styles.notePoint}>{note.point}</strong>
      {note.text && <span className={styles.noteText}>{note.text}</span>}
    </aside>
  );
}
