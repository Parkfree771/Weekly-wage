
'use client';

import { ItemCategory, TrackedItem, getItemsByCategory } from '@/lib/items-to-track';
import { useMemo } from 'react';

export const CATEGORY_STYLES: Record<ItemCategory, { label: string; color: string; darkColor: string; lightBg: string; }> = {
  fusion: { label: '융화재료', color: '#ffb366', darkColor: '#D97706', lightBg: '#fff7ed' },
  gem: { label: '젬', color: '#e8ca7a', darkColor: '#CA8A04', lightBg: '#fefce8' },
  engraving: { label: '유물 각인서', color: '#ff9b7a', darkColor: '#E11D48', lightBg: '#fff1f2' },
  accessory: { label: '악세', color: '#5fd4e8', darkColor: '#0E7490', lightBg: '#ecfeff' },
  jewel: { label: '보석', color: '#b87ff2', darkColor: '#7E22CE', lightBg: '#f5f3ff' }
};

function ColoredItemName({ name }: { name: string }) {
  const regex = /(\d+\.?\d*%)\s*(\(상\))|(\d+\.?\d*%)\s*(\(중\))|(\(상\))|(\(중\))/g;
  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(name)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{name.substring(lastIndex, match.index)}</span>);
    }

    if (match[2] === '(상)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#FFB800', fontWeight: '700' }}>
          {match[1]} {match[2]}
        </span>
      );
    } else if (match[4] === '(중)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#A020F0', fontWeight: '700' }}>
          {match[3]} {match[4]}
        </span>
      );
    } else if (match[5] === '(상)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#FFB800', fontWeight: '700' }}>
          {match[5]}
        </span>
      );
    } else if (match[6] === '(중)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#A020F0', fontWeight: '700' }}>
          {match[6]}
        </span>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < name.length) {
    parts.push(<span key={`text-${lastIndex}`}>{name.substring(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

type ItemSelectorProps = {
  selectedCategory: ItemCategory;
  selectedItem: TrackedItem | null;
  onSelectCategory: (category: ItemCategory) => void;
  onSelectItem: (item: TrackedItem) => void;
};

export default function ItemSelector({
  selectedCategory,
  selectedItem,
  onSelectCategory,
  onSelectItem,
}: ItemSelectorProps) {
  const categoryItems = useMemo(() => {
    return getItemsByCategory(selectedCategory);
  }, [selectedCategory]);

  if (!selectedItem) {
    return null;
  }

  return (
    <div>
      {/* 카테고리 탭 - 데스크톱 */}
      <div className="mb-3 d-none d-md-block">
        <div className="d-flex gap-2 justify-content-center">
          {(Object.keys(CATEGORY_STYLES) as ItemCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              style={{
                fontWeight: selectedCategory === cat ? '700' : '600',
                fontSize: '0.9rem',
                padding: '10px 16px',
                backgroundColor: '#ffffff',
                border: `2px solid ${selectedCategory === cat ? CATEGORY_STYLES[cat].color : '#e5e7eb'}`,
                borderRadius: '10px',
                color: selectedCategory === cat ? CATEGORY_STYLES[cat].darkColor : '#6b7280',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                letterSpacing: '0.3px'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== cat) {
                  const categoryStyle = CATEGORY_STYLES[cat];
                  e.currentTarget.style.backgroundColor = categoryStyle.lightBg;
                  e.currentTarget.style.borderColor = categoryStyle.color;
                  e.currentTarget.style.color = categoryStyle.darkColor;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== cat) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              {CATEGORY_STYLES[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 탭 - 모바일 */}
      <div className="mb-3 d-md-none">
        <div className="d-flex gap-2 justify-content-center">
          {(Object.keys(CATEGORY_STYLES) as ItemCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              style={{
                fontWeight: selectedCategory === cat ? '700' : '600',
                fontSize: '0.8rem',
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                border: `2px solid ${selectedCategory === cat ? CATEGORY_STYLES[cat].darkColor : '#e5e7eb'}`,
                borderRadius: '8px',
                color: selectedCategory === cat ? CATEGORY_STYLES[cat].darkColor : '#6b7280',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {CATEGORY_STYLES[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* 아이템 선택 버튼 - 데스크톱 */}
      <div className="mb-3 d-none d-md-block">
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-start',
          flexWrap: 'wrap'
        }}>
          {categoryItems.map((item) => {
            const categoryStyle = CATEGORY_STYLES[selectedCategory];

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontWeight: selectedItem.id === item.id ? '700' : '600',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease',
                  border: `2px solid ${selectedItem.id === item.id ? categoryStyle.color : '#e5e7eb'}`,
                  color: selectedItem.id === item.id ? categoryStyle.darkColor : '#6b7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (selectedItem.id !== item.id) {
                    e.currentTarget.style.backgroundColor = categoryStyle.lightBg;
                    e.currentTarget.style.borderColor = categoryStyle.color;
                    e.currentTarget.style.color = categoryStyle.darkColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedItem.id !== item.id) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                <ColoredItemName name={item.name} />
              </button>
            );
          })}
        </div>
      </div>

      {/* 아이템 선택 버튼 - 모바일 */}
      <div className="mb-3 d-md-none">
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          padding: '4px'
        }}>
          {categoryItems.map((item) => {
            const categoryStyle = CATEGORY_STYLES[selectedCategory];

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontWeight: selectedItem.id === item.id ? '700' : '600',
                  fontSize: '0.7rem',
                  transition: 'all 0.2s ease',
                  border: `2px solid ${selectedItem.id === item.id ? categoryStyle.darkColor : '#e5e7eb'}`,
                  color: selectedItem.id === item.id ? categoryStyle.darkColor : '#6b7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <ColoredItemName name={item.name} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
