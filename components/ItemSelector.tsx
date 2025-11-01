'use client';

import { ItemCategory, TrackedItem, getItemsByCategory } from '@/lib/items-to-track';
import { useMemo } from 'react';
import { useTheme } from './ThemeProvider';

export const CATEGORY_STYLES: Record<ItemCategory, { label: string; color: string; darkColor: string; lightBg: string; darkThemeColor: string; darkBg: string; }> = {
  fusion: { label: '융화재료', color: '#ffb366', darkColor: '#D97706', lightBg: '#fff7ed', darkThemeColor: '#fbbf24', darkBg: '#453320' },
  gem: { label: '젬', color: '#8A2BE2', darkColor: '#4B0082', lightBg: '#F5EEFF', darkThemeColor: '#c084fc', darkBg: '#3c2a4a' },
  engraving: { label: '유물 각인서', color: '#ff9b7a', darkColor: '#E11D48', lightBg: '#fff1f2', darkThemeColor: '#f87171', darkBg: '#4d222a' },
  accessory: { label: '악세', color: '#5fd4e8', darkColor: '#0E7490', lightBg: '#ecfeff', darkThemeColor: '#67e8f9', darkBg: '#1e3a4a' },
  jewel: { label: '보석', color: '#FF69B4', darkColor: '#C71585', lightBg: '#FFF0F5', darkThemeColor: '#f472b6', darkBg: '#4a2239' }
};

// 카테고리 표시 순서 정의
const CATEGORY_ORDER: ItemCategory[] = ['gem', 'fusion', 'engraving', 'accessory', 'jewel'];

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
  const { theme } = useTheme();

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
        <div className="d-flex gap-3 justify-content-center">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              style={{
                fontWeight: selectedCategory === cat ? '700' : '600',
                fontSize: '1rem',
                padding: '12px 24px',
                backgroundColor: 'var(--card-bg)',
                border: `2px solid ${selectedCategory === cat ? (theme === 'dark' ? CATEGORY_STYLES[cat].darkThemeColor : CATEGORY_STYLES[cat].color) : 'var(--border-color)'}`,
                borderRadius: '10px',
                color: selectedCategory === cat ? (theme === 'dark' ? CATEGORY_STYLES[cat].darkThemeColor : CATEGORY_STYLES[cat].darkColor) : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                letterSpacing: '0.3px'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== cat) {
                  const categoryStyle = CATEGORY_STYLES[cat];
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg;
                  e.currentTarget.style.borderColor = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color;
                  e.currentTarget.style.color = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== cat) {
                  e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
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
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              style={{
                fontWeight: selectedCategory === cat ? '700' : '600',
                fontSize: '0.8rem',
                padding: '8px 12px',
                backgroundColor: 'var(--card-bg)',
                border: `2px solid ${selectedCategory === cat ? (theme === 'dark' ? CATEGORY_STYLES[cat].darkThemeColor : CATEGORY_STYLES[cat].darkColor) : 'var(--border-color)'}`,
                borderRadius: '8px',
                color: selectedCategory === cat ? (theme === 'dark' ? CATEGORY_STYLES[cat].darkThemeColor : CATEGORY_STYLES[cat].darkColor) : 'var(--text-secondary)',
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
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
        }}>
          {categoryItems.map((item) => {
            const categoryStyle = CATEGORY_STYLES[selectedCategory];

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontWeight: selectedItem.id === item.id ? '700' : '600',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease',
                  border: `2px solid ${selectedItem.id === item.id ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color) : 'var(--border-color)'}`,
                  color: selectedItem.id === item.id ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor) : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  if (selectedItem.id !== item.id) {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg;
                    e.currentTarget.style.borderColor = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color;
                    e.currentTarget.style.color = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedItem.id !== item.id) {
                    e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
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
          padding: '8px 4px 12px 4px'
        }}>
          {categoryItems.map((item) => {
            const categoryStyle = CATEGORY_STYLES[selectedCategory];

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontWeight: selectedItem.id === item.id ? '700' : '600',
                  fontSize: '0.7rem',
                  transition: 'all 0.2s ease',
                  border: `2px solid ${selectedItem.id === item.id ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor) : 'var(--border-color)'}`,
                  color: selectedItem.id === item.id ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor) : 'var(--text-secondary)',
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