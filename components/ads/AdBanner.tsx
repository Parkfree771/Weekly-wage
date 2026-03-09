'use client';

const FEEDBACK_URL = 'https://forms.gle/n9XKQJmheLhZcSf69';
const SURVEY_URL = 'https://forms.gle/4dBKrh3kSFtazmxH7';

interface AdBannerProps {
  slot: string;
  className?: string;
}

export default function AdBanner({ slot, className }: AdBannerProps) {
  return (
    <div className={`promo-banner-row ${className || ''}`}>
      <a
        href={FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="promo-banner-horizontal"
      >
        <span className="promo-banner-text">
          <img src="/icon-lightbulb.svg" alt="" className="promo-banner-icon" /> <strong>건의함</strong> — 원하는 기능이 있나요?
        </span>
        <span className="promo-banner-cta">건의하기</span>
      </a>
      <a
        href={SURVEY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="promo-banner-horizontal promo-banner-horizontal-survey"
      >
        <span className="promo-banner-text">
          <img src="/icon-assignment.svg" alt="" className="promo-banner-icon" /> <strong>설문조사</strong> — 어떤 기능을 쓰시나요?
        </span>
        <span className="promo-banner-cta promo-cta-survey">참여하기</span>
      </a>
    </div>
  );
}
