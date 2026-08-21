import { raids, upcomingRaids } from '@/data/raids';
import styles from '@/app/guide/guide.module.css';

/**
 * WeeklyGoldGuideBody 가이드 본문.
 * /guide/weekly-gold 를 도구 페이지로 통합(2026-08-21)하면서 본문 JSX 를 그대로 옮긴 것.
 * 원문 수정 없이 위치만 이동했다 — 문단·표를 지우면 색인된 콘텐츠가 사라진다.
 */
export default function WeeklyGoldGuideBody() {
  return (
        <div className={styles.articleBody}>
          <h2>주간 골드란?</h2>
          <p>
            로스트아크에서 주간 골드는 매주 수요일 오전 6시를 기준으로 초기화되는 레이드 보상 시스템입니다.
            각 캐릭터는 지정된 레이드를 클리어하면 관문별로 골드를 획득할 수 있으며, 이 골드는 거래소에서
            아이템을 구매하거나 재련 비용을 충당하는 데 사용됩니다. 주간 골드는 로스트아크 경제의 핵심이며,
            효율적으로 관리하면 캐릭터 성장 속도를 크게 높일 수 있습니다.
          </p>

          <h2>골드 획득 제한 시스템</h2>
          <p>
            원정대 내에서 주간 골드를 획득할 수 있는 캐릭터 수는 최대 6캐릭터로 제한됩니다.
            아이템 레벨이 가장 높은 6캐릭터가 자동으로 골드 획득 대상이 되며,
            나머지 캐릭터는 레이드를 클리어하더라도 골드 보상을 받을 수 없습니다.
            따라서 원정대를 구성할 때 골드 획득 캐릭터를 전략적으로 선택하는 것이 중요합니다.
          </p>

          <h2>일반 골드와 귀속 골드</h2>
          <p>
            레이드 클리어 골드는 전부 자유롭게 거래할 수 있는 골드가 아닙니다.
            일부 레이드는 보상의 절반 또는 전부를 <strong>귀속 골드</strong>로 지급하는데,
            귀속 골드는 재련 비용 등 게임 내 시스템에는 쓸 수 있지만 거래소 거래나 다른 유저와의
            거래에는 사용할 수 없습니다. 예를 들어 지평의 성당은 클리어 골드 전액이 귀속 골드이고,
            최신 레이드의 노말 난이도는 절반이 귀속 골드로 지급되는 반면, 하드·나이트메어 난이도는
            전액 일반 골드로 지급됩니다. 거래소에서 쓸 골드가 필요한지, 재련에 쓸 골드가 필요한지에 따라
            체감 수익이 달라지므로 이 구조를 알아두는 것이 좋습니다.
          </p>
          <p>
            또한 더보기 보상을 선택할 때 지불하는 골드는 귀속 골드에서 우선 차감되고, 부족한 만큼만
            일반 골드에서 차감됩니다. 귀속 골드가 쌓여 있다면 더보기 비용 부담이 생각보다 적을 수 있습니다.
          </p>

          <h2>현재 레이드별 골드 보상 (2026년 7월 기준)</h2>
          <p>
            아래 표는 현재 로스트아크에서 진행 가능한 모든 레이드의 관문별 클리어 골드와 더보기 골드를 정리한 것입니다.
            더보기 골드는 클리어 골드 외에 재료 보상을 추가로 받을 때 지불하는 골드입니다.
            2026년 6월 벨가르딘 추가를 앞두고 기존 상위 레이드의 클리어 골드가 일부 하향 조정되었으며,
            아래 표는 조정 이후의 최신 수치입니다.
          </p>

          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>레이드</th>
                <th>입장 레벨</th>
                <th>관문</th>
                <th>클리어 골드</th>
                <th>더보기 비용</th>
              </tr>
            </thead>
            <tbody>
              {raids.map((raid) =>
                raid.gates.map((gate, i) => (
                  <tr key={`${raid.name}-${gate.gate}`}>
                    {i === 0 && (
                      <>
                        <td rowSpan={raid.gates.length} style={{ fontWeight: 600 }}>{raid.name}</td>
                        <td rowSpan={raid.gates.length}>{raid.level}</td>
                      </>
                    )}
                    <td>{gate.gate}관문</td>
                    <td>{gate.gold.toLocaleString()}</td>
                    <td>{gate.moreGold.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {upcomingRaids.length > 0 && (
            <>
              <h3>출시 예정 레이드</h3>
              <p>
                아직 출시되지 않았지만 골드 보상이 공개된 레이드입니다. 출시 전까지는 주간 골드 계산에
                포함되지 않습니다.
              </p>
              <table className={styles.guideTable}>
                <thead>
                  <tr>
                    <th>레이드</th>
                    <th>입장 레벨</th>
                    <th>관문</th>
                    <th>클리어 골드</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingRaids.map((raid) =>
                    raid.gates.map((gate, i) => (
                      <tr key={`${raid.name}-${gate.gate}`}>
                        {i === 0 && (
                          <>
                            <td rowSpan={raid.gates.length} style={{ fontWeight: 600 }}>{raid.name}</td>
                            <td rowSpan={raid.gates.length}>{raid.level}</td>
                          </>
                        )}
                        <td>{gate.gate}관문</td>
                        <td>{gate.gold.toLocaleString()}</td>
                        {i === 0 && <td rowSpan={raid.gates.length}>{raid.releaseLabel}</td>}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}

          <h2>더보기 보상이란?</h2>
          <p>
            더보기 보상은 레이드 관문 클리어 후 골드를 추가로 지불하고 재련 재료를 받는 시스템입니다.
            더보기를 선택하면 운명의 파편, 파괴석, 수호석, 돌파석 등의 재련 재료를 추가로 획득할 수 있습니다.
            더보기의 효율은 거래소 시세에 따라 달라지므로, 실시간 시세를 확인하고 판단하는 것이 좋습니다.
          </p>
          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로아로골의 주간 골드 계산기에서는 실시간 거래소 시세를 반영하여
              더보기 손익을 자동 계산해드립니다. 초록색이면 더보기가 이득, 빨간색이면 기본 골드가 유리합니다.
            </p>
          </div>

          <h2>골드 수익 극대화 전략</h2>
          <h3>1. 높은 레벨 레이드 우선 클리어</h3>
          <p>
            골드 보상은 레이드 난이도와 입장 레벨에 비례하는 경향이 있습니다. 현재는 세르카 나이트메어(1740)와
            지평의 성당 3단계(1750)가 최상위권 보상을 제공하며, 성당은 전액 귀속 골드라는 점만 유의하면 됩니다.
            2026년 8월 5일 벨가르딘이 출시되면 나이트메어 기준 총 75,000골드로 최고 보상 레이드가 됩니다.
          </p>

          <h3>2. 6캐릭터 원정대 운영</h3>
          <p>
            골드 획득 제한이 6캐릭터이므로, 6캐릭터를 모두 레이드 콘텐츠에 참여시키는 것이 수익을 극대화하는 방법입니다.
            각 캐릭터의 아이템 레벨을 균형있게 올려 다양한 레이드에 참여할 수 있도록 준비하세요.
          </p>

          <h3>3. 더보기 효율 매주 확인</h3>
          <p>
            거래소 시세는 매일 변동하므로, 매주 레이드 전에 더보기 효율을 확인하는 습관을 들이세요.
            특히 재련 재료 시세가 급등할 때는 더보기를 선택하는 것이 훨씬 유리할 수 있습니다.
          </p>
        </div>
  );
}
