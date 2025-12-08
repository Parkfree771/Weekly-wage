'use client';

import { ItemCategory, TrackedItem, getItemsByCategory } from '@/lib/items-to-track';
import { useMemo, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Offcanvas } from 'react-bootstrap';

export const CATEGORY_STYLES: Record<ItemCategory, { label: string; color: string; darkColor: string; lightBg: string; darkThemeColor: string; darkBg: string; }> = {
  refine: { label: '재련 재료', color: '#818cf8', darkColor: '#6366f1', lightBg: '#e0e7ff', darkThemeColor: '#818cf8', darkBg: '#3730a3' },
  refine_additional: { label: '재련 추가 재료', color: '#34d399', darkColor: '#059669', lightBg: '#d1fae5', darkThemeColor: '#34d399', darkBg: '#064e3b' },
  gem: { label: '젬', color: '#8A2BE2', darkColor: '#4B0082', lightBg: '#F5EEFF', darkThemeColor: '#c084fc', darkBg: '#3c2a4a' },
  engraving: { label: '유물 각인서', color: '#ff9b7a', darkColor: '#E11D48', lightBg: '#fff1f2', darkThemeColor: '#f87171', darkBg: '#4d222a' },
  accessory: { label: '악세', color: '#5fd4e8', darkColor: '#0E7490', lightBg: '#ecfeff', darkThemeColor: '#67e8f9', darkBg: '#1e3a4a' },
  jewel: { label: '보석', color: '#FF69B4', darkColor: '#C71585', lightBg: '#FFF0F5', darkThemeColor: '#f472b6', darkBg: '#4a2239' }
};

// 카테고리 표시 순서 정의
const CATEGORY_ORDER: ItemCategory[] = ['gem', 'refine', 'refine_additional', 'engraving', 'accessory', 'jewel'];

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
  const [showItems, setShowItems] = useState(true);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetCategory, setBottomSheetCategory] = useState<ItemCategory>(selectedCategory);

  const categoryItems = useMemo(() => {
    return getItemsByCategory(selectedCategory);
  }, [selectedCategory]);

  const bottomSheetItems = useMemo(() => {
    return getItemsByCategory(bottomSheetCategory);
  }, [bottomSheetCategory]);

  // 데스크톱용 카테고리 클릭 핸들러
  const handleCategoryClick = (cat: ItemCategory) => {
    if (selectedCategory === cat) {
      // 같은 카테고리 클릭 시 토글
      setShowItems(!showItems);
    } else {
      // 다른 카테고리 클릭 시 항상 표시
      setShowItems(true);
      onSelectCategory(cat);
    }
  };

  // 모바일용 카테고리 클릭 핸들러 (바텀시트 열기)
  const handleMobileCategoryClick = (cat: ItemCategory) => {
    onSelectCategory(cat); // 선택된 카테고리 업데이트 (테두리 색 변경)
    setBottomSheetCategory(cat);
    setShowBottomSheet(true);
  };

  // 바텀시트에서 아이템 선택
  const handleBottomSheetItemSelect = (item: TrackedItem) => {
    onSelectCategory(bottomSheetCategory);
    onSelectItem(item);
    // 바텀시트를 닫지 않고 유지
  };

  if (!selectedItem) {
    return null;
  }

  return (
    <div>
      {/* 카테고리 탭 - 데스크톱 */}
      <div className="mb-3 d-none d-md-block">
        <div className="d-flex gap-3 justify-content-center" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              style={{
                fontWeight: selectedCategory === cat ? '700' : '600',
                fontSize: '1rem',
                padding: '12px 24px',
                backgroundColor: selectedCategory === cat ? (theme === 'dark' ? CATEGORY_STYLES[cat].darkBg : CATEGORY_STYLES[cat].lightBg) : 'var(--card-bg)',
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
      <div className="mb-2 d-md-none">
        <div className="d-flex gap-2" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => handleMobileCategoryClick(cat)}
              style={{
                fontWeight: selectedCategory === cat ? '700' : '600',
                fontSize: '0.8rem',
                padding: '8px 12px',
                backgroundColor: selectedCategory === cat ? (theme === 'dark' ? CATEGORY_STYLES[cat].darkBg : CATEGORY_STYLES[cat].lightBg) : 'var(--card-bg)',
                border: `2px solid ${selectedCategory === cat ? (theme === 'dark' ? CATEGORY_STYLES[cat].darkThemeColor : CATEGORY_STYLES[cat].darkColor) : 'var(--border-color)'}`,
                borderRadius: '8px',
                color: selectedCategory === cat ? (theme === 'dark' ? CATEGORY_STYLES[cat].darkThemeColor : CATEGORY_STYLES[cat].darkColor) : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {CATEGORY_STYLES[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* 아이템 선택 버튼 - 데스크톱 */}
      {showItems && <div className="mb-3 d-none d-md-block">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {categoryItems.map((item) => {
            const categoryStyle = CATEGORY_STYLES[selectedCategory];

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                style={{
                  backgroundColor: selectedItem.id === item.id ? (theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg) : 'var(--card-bg)',
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
      </div>}

      {/* 바텀시트 - 모바일 아이템 선택 */}
      <Offcanvas
        show={showBottomSheet}
        onHide={() => setShowBottomSheet(false)}
        placement="bottom"
        backdrop={false}
        scroll={true}
        style={{
          height: 'auto',
          maxHeight: '40vh',
          backgroundColor: 'var(--card-bg)',
          color: 'var(--text-primary)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px'
        }}
      >
        <Offcanvas.Header
          closeButton
          style={{
            backgroundColor: theme === 'dark'
              ? CATEGORY_STYLES[bottomSheetCategory].darkBg
              : CATEGORY_STYLES[bottomSheetCategory].lightBg,
            borderBottom: `2px solid ${theme === 'dark'
              ? CATEGORY_STYLES[bottomSheetCategory].darkThemeColor
              : CATEGORY_STYLES[bottomSheetCategory].color}`,
            padding: '8px 12px',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            minHeight: 'auto'
          }}
        >
          <Offcanvas.Title
            style={{
              fontWeight: '700',
              fontSize: '0.9rem',
              color: theme === 'dark'
                ? CATEGORY_STYLES[bottomSheetCategory].darkThemeColor
                : CATEGORY_STYLES[bottomSheetCategory].darkColor
            }}
          >
            {CATEGORY_STYLES[bottomSheetCategory].label}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body style={{ padding: '12px' }}>
          <div style={{
            display: 'grid',
            gridTemplateRows: 'repeat(2, 1fr)',
            gridAutoFlow: 'column',
            gridAutoColumns: 'max-content',
            gap: '8px',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '8px'
          }}>
            {bottomSheetItems.map((item) => {
              const categoryStyle = CATEGORY_STYLES[bottomSheetCategory];
              const isSelected = selectedItem.id === item.id && selectedCategory === bottomSheetCategory;

              return (
                <button
                  key={item.id}
                  onClick={() => handleBottomSheetItemSelect(item)}
                  style={{
                    backgroundColor: isSelected
                      ? (theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg)
                      : 'var(--card-bg)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    fontWeight: isSelected ? '700' : '600',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease',
                    border: `2px solid ${isSelected
                      ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color)
                      : 'var(--border-color)'}`,
                    color: isSelected
                      ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor)
                      : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    minHeight: '50px'
                  }}
                >
                  <ColoredItemName name={item.name} />
                </button>
              );
            })}
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}