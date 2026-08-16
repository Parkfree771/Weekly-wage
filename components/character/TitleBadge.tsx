'use client';

import styles from './TitleBadge.module.css';

export type TitleCategory =
  | 'kazeroth' | 'kamen' | 'esther' | 'abyss'
  | 'dolores'  | 'frost' | 'eclipse' | 'flame'
  | 'death'    | 'croche'
  | 'default';

export function getTitleCategory(title: string | null | undefined): TitleCategory {
  if (!title) return 'default';
  if (title.includes('카제로스')) return 'kazeroth';
  if (title.includes('카멘'))     return 'kamen';
  if (title === '에스더의 결속자' || title === '에스더의 후계자') return 'esther';
  if (title === '돌로리스')     return 'dolores';
  if (title === '심연의 군주')   return 'abyss';
  if (title === '혹한의 군주')   return 'frost';
  if (title === '이클립스')     return 'eclipse';
  if (title === '홍염의 군주')   return 'flame';
  if (title === '죽음을 부르는 자') return 'death';
  if (title === '크로체')       return 'croche';
  return 'default';
}

const ICONS: Record<TitleCategory, string | null> = {
  dolores:  '/images/titles/dolores.webp',
  abyss:    '/images/titles/abyss.webp',
  kazeroth: '/images/titles/kazeroth.webp',
  kamen:    '/images/titles/kamen.webp',
  frost:    '/images/titles/frost.webp',
  eclipse:  '/images/titles/eclipse.webp',
  flame:    '/images/titles/flame.webp',
  esther:   '/images/titles/esther.webp',
  death:    '/images/titles/death.webp',
  // 크로체 로고 파일이 준비되면 '/images/titles/croche.webp' 로 연결
  croche:   null,
  default:  null,
};

function getColorClass(cat: TitleCategory): string {
  switch (cat) {
    case 'dolores':  return styles.titleColorDolores;
    case 'abyss':    return styles.titleColorAbyss;
    case 'kazeroth': return styles.titleColorKazeroth;
    case 'kamen':    return styles.titleColorKamen;
    case 'frost':    return styles.titleColorFrost;
    case 'eclipse':  return styles.titleColorEclipse;
    case 'flame':    return styles.titleColorFlame;
    case 'esther':   return styles.titleColorEsther;
    case 'death':    return styles.titleColorDeath;
    case 'croche':   return styles.titleColorCroche;
    default:         return styles.titleBadgeDefault;
  }
}

interface Props {
  title: string | null | undefined;
  /** 칭호 텍스트 폰트 사이즈 (rem). 기본 0.88 */
  fontSize?: string;
}

export default function TitleBadge({ title, fontSize }: Props) {
  if (!title) return null;
  const cat = getTitleCategory(title);
  const icon = ICONS[cat];
  const colorCls = getColorClass(cat);
  return (
    <span className={styles.titleWrap} style={fontSize ? { fontSize } : undefined}>
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={icon} alt="" className={styles.titleIcon} />
      )}
      <span className={`${styles.titleBadge} ${colorCls}`}>
        {title}
      </span>
    </span>
  );
}
