'use client';

const FEEDBACK_URL = 'https://forms.gle/n9XKQJmheLhZcSf69';
const SURVEY_URL = 'https://forms.gle/4dBKrh3kSFtazmxH7';

interface AdSidebarProps {
  position: 'left' | 'right';
  topOffset?: number;
}

export default function AdSidebar({ position, topOffset = 80 }: AdSidebarProps) {
  if (position === 'left') return null;

  return (
    <aside
      className="ad-sidebar-float"
      style={{ top: `${topOffset}px` }}
    >
      <div className="ad-sidebar-sticky">
        <a
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="promo-banner-vertical"
        >
          <img src="/icon-lightbulb.svg" alt="" className="promo-v-icon-img" />
          <div className="promo-v-title">로아로골 건의함</div>
          <div className="promo-v-desc">
            이런 기능이 있으면<br />좋겠다! 하는 아이디어를<br />보내주세요
          </div>
          <div className="promo-v-cta">건의하기</div>
        </a>
        <a
          href={SURVEY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="promo-banner-vertical promo-banner-survey"
        >
          <img src="/icon-assignment.svg" alt="" className="promo-v-icon-img" />
          <div className="promo-v-title">이용 설문조사</div>
          <div className="promo-v-desc">
            어떤 기능을 사용하고<br />계신가요? 의견을<br />들려주세요
          </div>
          <div className="promo-v-cta promo-v-cta-survey">참여하기</div>
        </a>
      </div>
    </aside>
  );
}
