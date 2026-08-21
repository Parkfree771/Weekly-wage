import {
  BASE_PROBABILITY,
  SUCCESSION_BASE_PROBABILITY,
  getBreathEffect,
  getSuccessionBreathEffect,
  WEAPON_MATERIAL_COSTS,
  ARMOR_MATERIAL_COSTS,
  SUCCESSION_WEAPON_MATERIAL_COSTS,
  SUCCESSION_ARMOR_MATERIAL_COSTS,
} from '@/lib/refiningData';
import styles from '@/app/guide/guide.module.css';

// 표 렌더링용 — 수치 원본은 lib/refiningData.ts (시뮬레이터와 동일한 단일 원본)
const PROB_LEVELS = Object.keys(BASE_PROBABILITY).map(Number).sort((a, b) => a - b);
const BREATH_PROBS = [0.10, 0.05, 0.04, 0.03, 0.015, 0.01, 0.005];
const pct = (p: number) => `${parseFloat((p * 100).toFixed(2))}%`;

/**
 * RefiningGuideBody 가이드 본문.
 * /guide/refining 를 도구 페이지로 통합(2026-08-21)하면서 본문 JSX 를 그대로 옮긴 것.
 * 원문 수정 없이 위치만 이동했다 — 문단·표를 지우면 색인된 콘텐츠가 사라진다.
 */
export default function RefiningGuideBody() {
  return (
        <div className={styles.articleBody}>
          <h2>T4 재련 시스템 개요</h2>
          <p>
            재련은 로스트아크에서 캐릭터의 장비 아이템 레벨을 올리는 핵심 성장 시스템입니다.
            T4(4티어) 장비는 현재 로스트아크의 최신 장비 단계로, 재련을 통해 아이템 레벨을
            높이면 더 높은 난이도의 레이드와 콘텐츠에 참여할 수 있습니다.
            재련에는 골드와 다양한 재련 재료가 필요하며, 성공 확률이 존재하여
            실패할 경우 재료와 골드만 소모됩니다.
          </p>

          <h2>재련 재료 종류</h2>
          <p>T4 재련에 필요한 주요 재료는 다음과 같습니다:</p>
          <ul>
            <li><strong>운명의 파편:</strong> 모든 재련 단계에서 필요한 기본 재료입니다. 카오스 던전, 레이드 더보기 보상 등에서 획득할 수 있습니다.</li>
            <li><strong>운명의 파괴석:</strong> 무기 재련에 사용되는 재료입니다. 레이드 클리어 보상, 가디언 토벌 등에서 주로 획득합니다.</li>
            <li><strong>운명의 수호석:</strong> 방어구 재련에 사용되는 재료입니다. 파괴석과 비슷한 경로로 획득할 수 있습니다.</li>
            <li><strong>운명의 돌파석:</strong> 모든 장비 재련에 필요한 핵심 재료로, 수량이 적어 가격이 비싼 편입니다.</li>
            <li><strong>아비도스 융화 재료:</strong> 생활 콘텐츠 재료로 제작하는 필수 재료입니다. 거래소에서 구매하거나 직접 제작할 수 있습니다.</li>
            <li><strong>골드·실링:</strong> 매 재련 시도마다 일정량이 소모되며, 단계가 높아질수록 소모량도 증가합니다.</li>
          </ul>
          <p>
            장비를 <strong>계승</strong>하면 재련 단계가 11단계부터 다시 시작되며, 재료도
            파괴석·수호석 결정, 위대한 돌파석, 상급 아비도스 융화 재료로 바뀌고 단계당 소모량이 늘어납니다.
          </p>

          <h2>단계별 재료 소모량 (1회 시도 기준)</h2>
          <p>
            아래 표는 재련 1회 시도마다 소모되는 재료로, 로아로골 재련 시뮬레이터가 비용 계산에
            사용하는 것과 동일한 수치입니다. 실패해도 같은 양이 소모되므로, 목표 단계까지의 총 비용은
            (1회 소모량 × 예상 시도 횟수)로 계산됩니다.
          </p>

          <h3>계승 전 — 무기</h3>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>목표 단계</th>
                <th>파괴석</th>
                <th>돌파석</th>
                <th>아비도스</th>
                <th>운명 파편</th>
                <th>실링</th>
                <th>골드</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(WEAPON_MATERIAL_COSTS).map(([level, c]) => (
                <tr key={level}>
                  <td>{level}단계</td>
                  <td>{c.파괴석.toLocaleString()}</td>
                  <td>{c.돌파석}</td>
                  <td>{c.아비도스}</td>
                  <td>{c.운명파편.toLocaleString()}</td>
                  <td>{c.실링.toLocaleString()}</td>
                  <td>{c.골드.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>계승 전 — 방어구</h3>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>목표 단계</th>
                <th>수호석</th>
                <th>돌파석</th>
                <th>아비도스</th>
                <th>운명 파편</th>
                <th>실링</th>
                <th>골드</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ARMOR_MATERIAL_COSTS).map(([level, c]) => (
                <tr key={level}>
                  <td>{level}단계</td>
                  <td>{c.수호석.toLocaleString()}</td>
                  <td>{c.돌파석}</td>
                  <td>{c.아비도스}</td>
                  <td>{c.운명파편.toLocaleString()}</td>
                  <td>{c.실링.toLocaleString()}</td>
                  <td>{c.골드.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>계승 후 — 무기</h3>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>목표 단계</th>
                <th>파괴석 결정</th>
                <th>위대한 돌파석</th>
                <th>상급 아비도스</th>
                <th>운명 파편</th>
                <th>실링</th>
                <th>골드</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SUCCESSION_WEAPON_MATERIAL_COSTS).map(([level, c]) => (
                <tr key={level}>
                  <td>{level}단계</td>
                  <td>{c.파괴석결정.toLocaleString()}</td>
                  <td>{c.위대한돌파석}</td>
                  <td>{c.상급아비도스}</td>
                  <td>{c.운명파편.toLocaleString()}</td>
                  <td>{c.실링.toLocaleString()}</td>
                  <td>{c.골드.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>계승 후 — 방어구</h3>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>목표 단계</th>
                <th>수호석 결정</th>
                <th>위대한 돌파석</th>
                <th>상급 아비도스</th>
                <th>운명 파편</th>
                <th>실링</th>
                <th>골드</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SUCCESSION_ARMOR_MATERIAL_COSTS).map(([level, c]) => (
                <tr key={level}>
                  <td>{level}단계</td>
                  <td>{c.수호석결정.toLocaleString()}</td>
                  <td>{c.위대한돌파석}</td>
                  <td>{c.상급아비도스}</td>
                  <td>{c.운명파편.toLocaleString()}</td>
                  <td>{c.실링.toLocaleString()}</td>
                  <td>{c.골드.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>일반 재련의 확률 구조</h2>
          <p>
            일반 재련은 단계별로 정해진 확률에 따라 성공과 실패가 갈리고, 실패하면 재료만 소모된 채
            진행도가 그대로 유지됩니다. 계승 전에는 10~11단계 구간이 10%로 가장 높고, 단계가 오를수록
            점차 낮아져 23~24단계에서는 0.5%까지 떨어집니다. 계승 후에는 11~12단계부터 다시 시작하는데,
            이때는 5%로 계승 전보다 낮게 시작하며 이후 구간별 하락 폭은 계승 전과 비슷한 흐름을 따릅니다.
          </p>
          <p>
            아래 표는 로아로골 재련 시뮬레이터가 실제 계산에 사용하는 단계별 기본 확률입니다.
            책·숨결을 쓰지 않은 순수 기본 확률 기준입니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>재련 구간</th>
                <th>계승 전 확률</th>
                <th>계승 후 확률</th>
              </tr>
            </thead>
            <tbody>
              {PROB_LEVELS.map((level) => (
                <tr key={level}>
                  <td>{level}→{level + 1}단계</td>
                  <td>{pct(BASE_PROBABILITY[level])}</td>
                  <td>{SUCCESSION_BASE_PROBABILITY[level] !== undefined ? pct(SUCCESSION_BASE_PROBABILITY[level]) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>장인의 기운(장기백)이란?</h2>
          <p>
            장인의 기운은 재련 실패가 쌓일수록 확정 성공에 가까워지는 보정 시스템입니다.
            시도할 때마다 그 순간의 최종 성공 확률을 2.15로 나눈 값만큼 게이지가 채워지고,
            게이지가 100%에 도달하면 다음 시도는 반드시 성공합니다. 이를 흔히
            &quot;장기백(장인의 기운 100%)&quot;이라고 부릅니다.
          </p>
          <p>
            예를 들어 최종 확률이 10%인 구간이라면 실패할 때마다 게이지가 약 4.65%p씩 쌓이므로,
            이론상 22회 전후로 확정 성공권을 얻게 되는 구조입니다. 장인의 기운 덕분에 재련에
            영원히 실패하는 것은 불가능하지만, 장기백까지 가는 데 상당한 재료와 골드가 소모될 수 있습니다.
          </p>

          <h2>재련 책과 숨결 활용법</h2>
          <p>
            <strong>재련 책(재봉술·야금술 업화)</strong>은 11~20단계 구간에서만 성공 확률을 2배로
            올려주고, 21단계 이후 구간에서는 효과가 없습니다. 책 가격이 저렴할 때는 해당 구간에서
            책을 쓰는 것이 거의 항상 이득입니다.
          </p>
          <p>
            <strong>숨결(빙하의 숨결·용암의 숨결)</strong>은 전 구간에서 사용할 수 있지만,
            확률 구간마다 최대 누적 개수와 개당 상승폭이 다르게 설계되어 있습니다.
            저확률 구간일수록 더 많이 쌓을 수 있으므로, 숨결 시세와 구간 확률을 함께 고려해
            투입량을 결정하는 것이 비용 절약의 핵심입니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>기본 확률 구간</th>
                <th>최대 투입 개수</th>
                <th>개당 확률 상승</th>
                <th>최대 투입 시 총 상승</th>
              </tr>
            </thead>
            <tbody>
              {BREATH_PROBS.map((prob) => {
                const e = getBreathEffect(prob);
                return (
                  <tr key={prob}>
                    <td>{pct(prob)}</td>
                    <td>{e.max}개</td>
                    <td>+{pct(e.per)}</td>
                    <td>+{pct(e.max * e.per)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p>
            계승 후에는 3% 구간만 다르게 적용됩니다 — 최대 {getSuccessionBreathEffect(0.03).max}개까지
            투입할 수 있고 개당 +{pct(getSuccessionBreathEffect(0.03).per)}씩 오릅니다.
            나머지 구간은 계승 전과 동일합니다.
          </p>

          <h2>일반 재련 vs 상급 재련</h2>
          <p>
            상급 재련은 일반 재련과 완전히 다른 방식으로 동작합니다. 일반 재련은 성공 아니면 실패지만,
            상급 재련은 시도할 때마다 실패 없이 성공·대성공·초대성공 중 하나로 반드시 경험치가 쌓입니다.
            운이 나빠도 최소한의 진행이 항상 보장되는 대신, 단계별로 요구 경험치를 채워야 다음 단계로
            넘어가는 구조입니다. 두 시스템은 재료 소모와 진행 방식이 다르므로,
            시뮬레이터로 예상 비용을 비교해보고 진행하는 것을 추천합니다.
          </p>

          <h2>재련 비용 절약 팁</h2>
          <h3>1. 시세를 반영한 보조 재료 최적화</h3>
          <p>
            책과 숨결이 항상 이득인 것은 아닙니다. 그날그날의 책·숨결 가격에 따라 어떤 조합이
            가장 저렴한지가 달라지므로, 로아로골 재련 시뮬레이터의 시세 연동 최적화 기능으로
            현재 시세 기준 최적 조합을 확인하세요.
          </p>

          <h3>2. 실제 확률 기반 시뮬레이션으로 예산 짜기</h3>
          <p>
            로아로골 재련 시뮬레이터의 통계는 실제 확률표를 그대로 적용해 100만 회 단위로 돌린
            몬테카를로 시뮬레이션 결과입니다. 예를 들어 11강 구간을 숨결 없이 진행하면 평균 11.45회,
            숨결을 최대로 채우면 평균 7.53회 만에 다음 단계로 넘어갑니다. 재련 전에 평균·중앙값 비용을
            확인하고 예산을 준비하면 재료가 모자라 중간에 멈추는 상황을 피할 수 있습니다.
          </p>

          <h3>3. 재료 사전 확보</h3>
          <p>
            레이드 더보기 보상, 카오스 던전, 가디언 토벌 등을 통해 재련 재료를 미리 확보해두세요.
            거래소에서 재료를 구매할 때는 시세가 낮은 시점을 노려 매입하면 비용을 아낄 수 있습니다.
          </p>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로아로골의 재련 시뮬레이터에서 실제 재련과 동일한 확률로
              시뮬레이션을 체험할 수 있습니다. 실제 재련 전에 예상 비용과 장기백 횟수를 확인해보세요.
            </p>
          </div>
        </div>
  );
}
