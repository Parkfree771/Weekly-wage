'use client';

import styles from './TitleBadge.module.css';

export type TitleCategory =
  | 'kazeroth' | 'kamen' | 'esther' | 'abyss'
  | 'dolores'  | 'frost' | 'eclipse' | 'flame'
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
        <img src={icon} alt="" className={styles.titleIcon} />
      )}
      <span className={`${styles.titleBadge} ${colorCls}`} data-text={title}>
        {title}
      </span>
    </span>
  );
}
