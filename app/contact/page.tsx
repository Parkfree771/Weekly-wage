import Link from 'next/link';
import styles from '@/app/guide/guide.module.css';
import ContactForm from './ContactForm';

const TOPICS = [
  {
    kind: '데이터 오류',
    example: '레이드 골드·더보기 보상 수치가 인게임과 다름, 패치 후 재련 확률이 바뀜',
    handling: '인게임 캡처나 공지와 대조한 뒤 데이터 표를 고치고, 웹과 앱에 함께 반영합니다.',
  },
  {
    kind: '버그 신고',
    example: '계산 결과가 비정상, 화면이 깨짐, 캐릭터 검색이 안 됨',
    handling: '재현되는지 먼저 확인합니다. 브라우저·기기와 입력값을 적어주시면 훨씬 빨라집니다.',
  },
  {
    kind: '기능 제안',
    example: '새 레이드 추가, 계산기 옵션, 표시 방식 개선',
    handling: '여러 분이 같은 요청을 주시면 우선순위를 올립니다. 반영되면 문의 창의 "최근 반영된 요청"에 올라갑니다.',
  },
  {
    kind: '그 외',
    example: '저작권·광고·개인정보 관련 문의',
    handling: '내용을 확인한 뒤 필요한 조치를 합니다. 개인정보 처리 기준은 개인정보처리방침을 따릅니다.',
  },
];

export default function ContactPage() {
  return (
    <div className="container mt-4 mb-5">
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <h1 className="h3 mb-2">문의하기</h1>
          <p className="text-muted mb-4">
            로아로골은 개인이 운영하는 로스트아크 팬사이트입니다. 기능 제안, 버그, 계산 데이터가 인게임과
            다른 부분을 아래 창으로 보내주시면 운영자가 직접 확인합니다.
          </p>

          <section className="mb-4 p-3 p-md-4 rounded" style={{ border: '1px solid var(--border-color)' }}>
            <ContactForm />
            <p className="small text-muted mt-3 mb-0">
              로그인 없이 익명으로 전송되고 운영자만 열람합니다. 한 번에 500자까지, 5분에 한 번 보낼 수 있습니다.
              답장을 받을 연락처가 필요하면 본문에 함께 적어주세요.
            </p>
            <p className="small mt-2 mb-0">
              이메일로 보내실 수도 있습니다:{' '}
              <a href="mailto:dbfh1498@gmail.com">dbfh1498@gmail.com</a>
            </p>
          </section>

          <div className={styles.articleBody}>
            <h2>어떤 내용을 보내면 되나요</h2>
            <div className={styles.tableScroll}>
              <table className={styles.guideTable}>
                <thead>
                  <tr>
                    <th>종류</th>
                    <th>예시</th>
                    <th>처리 방식</th>
                  </tr>
                </thead>
                <tbody>
                  {TOPICS.map((t) => (
                    <tr key={t.kind}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t.kind}</td>
                      <td style={{ textAlign: 'left' }}>{t.example}</td>
                      <td style={{ textAlign: 'left' }}>{t.handling}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>데이터 오류를 제보할 때</h2>
            <p>
              로아로골의 보상·확률 수치는 공식 공지, 인게임 화면, 공식 Open API를 기준으로 넣고 있습니다.
              그래도 패치 직후에는 수치가 바뀐 걸 늦게 반영하는 경우가 있습니다. 제보하실 때 아래 세 가지를 같이
              적어주시면 확인이 빨라집니다.
            </p>
            <ol>
              <li>어느 페이지의 어떤 항목인지 (예: 주간 골드 계산기, 세르카 하드 2관문 더보기)</li>
              <li>사이트에 표시된 값과 인게임에서 본 값</li>
              <li>언제 확인했는지 (패치 전후 구분용)</li>
            </ol>

            <div className={styles.tipBox}>
              <p>
                각인 페이지 사이드바에는 각인 정정 요청 창이 따로 있습니다. 특정 직업의 각인 구성이 실제와 다르면
                그쪽으로 보내주시는 편이 직업 정보까지 함께 전달돼서 더 정확합니다.
              </p>
            </div>

            <h2>운영 정보</h2>
            <p>
              사이트 운영 목적과 운영자 소개는 <Link href="/about">사이트 소개</Link>에, 수집하는 정보와 쿠키 사용은{' '}
              <Link href="/privacy">개인정보처리방침</Link>에, 서비스 이용 조건은 <Link href="/terms">이용약관</Link>에
              정리해 두었습니다. 로아로골은 Smilegate RPG의 공식 서비스가 아니며, 게임 데이터와 이미지의 저작권은
              Smilegate RPG에 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
