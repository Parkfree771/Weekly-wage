'use client';

import Image from 'next/image';
import type { AvatarItem } from '@/types/avatar';
import { getGradeColor } from '@/types/avatar';
import DyeInfoDisplay from './DyeInfoDisplay';
import styles from './AvatarItemList.module.css';

type Props = {
  items: AvatarItem[];
};

function AvatarItemCard({ item }: { item: AvatarItem }) {
  const gradeColor = getGradeColor(item.grade);

  return (
    <div className={styles.itemCard}>
      <div className={styles.itemHeader}>
        {item.icon && (
          <div className={styles.itemIconWrap}>
            <Image
              src={item.icon}
              alt={item.name}
              width={40}
              height={40}
              className={styles.itemIcon}
              style={{ borderColor: gradeColor }}
            />
          </div>
        )}
        <div className={styles.itemInfo}>
          <div className={styles.itemName} style={{ color: gradeColor }}>
            {item.name}
          </div>
          <div className={styles.itemType}>
            {item.type}
            {item.isSet && <span className={styles.setBadge}>세트</span>}
          </div>
        </div>
      </div>

      {item.dyeInfo ? (
        <DyeInfoDisplay dyeInfo={item.dyeInfo} />
      ) : (
        <p className={styles.noDye}>염색 없음</p>
      )}
    </div>
  );
}

/** 겉 아바타 정렬 순서: 머리 → 상의 → 하의 → 나머지 */
const TYPE_ORDER: Record<string, number> = {
  '머리 아바타': 0,
  '상의 아바타': 1,
  '하의 아바타': 2,
};

function sortOuterItems(items: AvatarItem[]): AvatarItem[] {
  return [...items].sort((a, b) => {
    // 염색 있는 아이템 우선
    const dyeA = a.dyeInfo ? 0 : 1;
    const dyeB = b.dyeInfo ? 0 : 1;
    if (dyeA !== dyeB) return dyeA - dyeB;
    // 같으면 부위 순서
    const orderA = TYPE_ORDER[a.type] ?? 99;
    const orderB = TYPE_ORDER[b.type] ?? 99;
    return orderA - orderB;
  });
}

export default function AvatarItemList({ items }: Props) {
  const outerItems = sortOuterItems(items.filter((i) => !i.isInner));

  return (
    <div className={styles.listWrap}>
      {outerItems.length > 0 && (
        <section>
          <h4 className={styles.sectionTitle}>아바타</h4>
          <div className={styles.itemsGrid}>
            {outerItems.map((item, i) => (
              <AvatarItemCard key={i} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
