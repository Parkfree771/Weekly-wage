'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Container, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { getPackagePost, updatePackagePost } from '@/lib/package-service';
import type { PackageItem, PackageType } from '@/types/package';
import styles from '../../package.module.css';

// ─── 선택지 옵션 ───
type ChoiceOption = {
  itemId: string;
  name: string;
  icon?: string;
};

// ─── 템플릿 아이템 타입 ───
type TemplateItem = {
  id: string;
  icon: string;
  name: string;
  type: 'simple' | 'choice' | 'gold' | 'fixed';
  itemId?: string;
  choices?: ChoiceOption[];
  fixedGold?: number;
};

// ─── 패키지에 넣을 수 있는 아이템 목록 ───
const TEMPLATE_ITEMS: TemplateItem[] = [
  {
    id: 'destruction-crystal',
    icon: '/top-destiny-destruction-stone5.webp',
    name: '운명의 파괴석 결정',
    type: 'simple',
    itemId: '66102007',
  },
  {
    id: 'guardian-crystal',
    icon: '/top-destiny-guardian-stone5.webp',
    name: '운명의 수호석 결정',
    type: 'simple',
    itemId: '66102107',
  },
  {
    id: 'crystal-choice',
    icon: '/vkrhltngh.webp',
    name: '파괴/수호 결정 선택',
    type: 'choice',
    choices: [
      { itemId: '66102007', name: '운명의 파괴석 결정', icon: '/top-destiny-destruction-stone5.webp' },
      { itemId: '66102107', name: '운명의 수호석 결정', icon: '/top-destiny-guardian-stone5.webp' },
    ],
  },
  {
    id: 'great-breakthrough',
    icon: '/top-destiny-breakthrough-stone5.webp',
    name: '위대한 운명의 돌파석',
    type: 'simple',
    itemId: '66110226',
  },
  {
    id: 'superior-abidos',
    icon: '/top-abidos-fusion5.webp',
    name: '상급 아비도스 융화 재료',
    type: 'simple',
    itemId: '6861013',
  },
  {
    id: 'lava-breath',
    icon: '/breath-lava5.webp',
    name: '용암의 숨결',
    type: 'simple',
    itemId: '66111131',
  },
  {
    id: 'glacier-breath',
    icon: '/breath-glacier5.webp',
    name: '빙하의 숨결',
    type: 'simple',
    itemId: '66111132',
  },
  {
    id: 'destiny-shard',
    icon: '/destiny-shard-bag-large5.webp',
    name: '운명의 파편 주머니(대)',
    type: 'simple',
    itemId: '66130143',
  },
  {
    id: 'gem-choice',
    icon: '/duddndgmlrnl.webp',
    name: '영웅/희귀 젬 상자',
    type: 'gold',
  },
  {
    id: 'gem-hero',
    icon: '/gem-hero.webp',
    name: '영웅 젬 상자',
    type: 'choice',
    choices: [
      { itemId: '67400003', name: '질서의 젬 : 안정', icon: '/gem-order-stable.webp' },
      { itemId: '67400103', name: '질서의 젬 : 견고', icon: '/gem-order-solid.webp' },
      { itemId: '67400203', name: '질서의 젬 : 불변', icon: '/gem-chaos-collapse.webp' },
      { itemId: '67410303', name: '혼돈의 젬 : 침식', icon: '/gem-chaos-erosion.webp' },
      { itemId: '67410403', name: '혼돈의 젬 : 왜곡', icon: '/gem-chaos-distortion.webp' },
      { itemId: '67410503', name: '혼돈의 젬 : 붕괴', icon: '/gem-order-immutable.webp' },
    ],
  },
  {
    id: 'gold-input',
    icon: '/gold.webp',
    name: '골드',
    type: 'gold',
  },
  {
    id: 'blue-crystal-input',
    icon: '/blue.webp',
    name: '블루 크리스탈',
    type: 'gold',
  },
  {
    id: 'engraving-choice',
    icon: '/engraving.webp',
    name: '유각 선택 상자',
    type: 'choice',
    choices: [
      { itemId: '65200505', name: '원한' },
      { itemId: '65203905', name: '아드레날린' },
      { itemId: '65203305', name: '돌격대장' },
      { itemId: '65201005', name: '예리한 둔기' },
      { itemId: '65203505', name: '질량 증가' },
      { itemId: '65202805', name: '저주받은 인형' },
      { itemId: '65203005', name: '기습의 대가' },
      { itemId: '65203705', name: '타격의 대가' },
      { itemId: '65203405', name: '각성' },
      { itemId: '65204105', name: '전문의' },
      { itemId: '65200605', name: '슈퍼차지' },
      { itemId: '65201505', name: '결투의 대가' },
    ],
  },
  {
    id: 'celestial-ticket',
    icon: '/cjstkd.webp',
    name: '천상 도전권',
    type: 'fixed',
    fixedGold: 3000,
  },
  {
    id: 'breakthrough-stone',
    icon: '/destiny-breakthrough-stone5.webp',
    name: '운명의 돌파석',
    type: 'simple',
    itemId: '66110225',
  },
];

const TEMPLATES_MAP = Object.fromEntries(
  TEMPLATE_ITEMS.map((t) => [t.id, t]),
);

// ─── 추가된 아이템 상태 ───
type AddedItem = {
  templateId: string;
  quantity: number;
  selectedChoiceId?: string;
  goldAmount?: number;
};

function formatNumber(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) < 10) {
    return n.toFixed(3);
  }
  if (n % 1 !== 0 && Math.abs(n) < 100) {
    return n.toFixed(2);
  }
  return Math.round(n).toLocaleString('ko-KR');
}

const PRICE_BUNDLE_SIZE: Record<string, number> = {
  '66102007': 100,
  '66102107': 100,
  '66130143': 3000,
};

function getItemUnitPrice(itemId: string, prices: Record<string, number>): number {
  const raw = prices[itemId] || 0;
  const bundle = PRICE_BUNDLE_SIZE[itemId] || 1;
  return raw / bundle;
}

function getUnitPrice(
  added: AddedItem,
  template: TemplateItem,
  prices: Record<string, number>,
): number {
  switch (template.type) {
    case 'simple':
      return getItemUnitPrice(template.itemId!, prices);
    case 'choice':
      return added.selectedChoiceId ? getItemUnitPrice(added.selectedChoiceId, prices) : 0;
    case 'gold':
      return added.goldAmount || 0;
    case 'fixed':
      return template.fixedGold || 0;
    default:
      return 0;
  }
}

/** PackageItem[] → AddedItem[] 역매핑 */
function mapItemsToAdded(items: PackageItem[]): AddedItem[] {
  return items
    .map((item) => {
      // Gold type
      if (item.itemId.startsWith('gold_')) {
        const templateId = item.itemId.replace('gold_', '');
        if (TEMPLATES_MAP[templateId]) {
          return { templateId, quantity: 1, goldAmount: item.goldOverride || 0 };
        }
      }
      // Fixed type
      if (item.itemId.startsWith('fixed_')) {
        const templateId = item.itemId.replace('fixed_', '');
        if (TEMPLATES_MAP[templateId]) {
          return { templateId, quantity: item.quantity };
        }
      }
      // Choice type (has choiceOptions)
      if (item.choiceOptions && item.choiceOptions.length > 0) {
        const template = TEMPLATE_ITEMS.find(
          (t) =>
            t.type === 'choice' &&
            t.choices?.some((c) =>
              item.choiceOptions!.some((co) => co.itemId === c.itemId),
            ),
        );
        if (template) {
          return {
            templateId: template.id,
            quantity: item.quantity,
            selectedChoiceId: item.itemId,
          };
        }
      }
      // Simple type
      const template = TEMPLATE_ITEMS.find(
        (t) => t.type === 'simple' && t.itemId === item.itemId,
      );
      if (template) {
        return { templateId: template.id, quantity: item.quantity };
      }
      return null;
    })
    .filter(Boolean) as AddedItem[];
}

export default function PackageEditPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { user } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);

  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [packageType, setPackageType] = useState<PackageType>('일반');
  const [royalCrystalPrice, setRoyalCrystalPrice] = useState<number>(0);
  const [tradeMode, setTradeMode] = useState<'unofficial' | 'official'>('official');
  const [unofficialRate, setUnofficialRate] = useState<number>(0);
  const [officialGold, setOfficialGold] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 가격 fetch
  useEffect(() => {
    fetch('/api/price-data/latest')
      .then((res) => res.json())
      .then((data) => { setLatestPrices(data); setPriceLoading(false); })
      .catch(() => setPriceLoading(false));
  }, []);

  // 기존 게시물 로드
  useEffect(() => {
    if (!postId || !user) return;
    const load = async () => {
      try {
        const post = await getPackagePost(postId);
        if (!post || post.authorUid !== user.uid) {
          setNotFound(true);
          setPageLoading(false);
          return;
        }
        setTitle(post.title);
        setPackageType(post.packageType);
        setRoyalCrystalPrice(post.royalCrystalPrice);
        setAddedItems(mapItemsToAdded(post.items));

        // 환율 복원
        if (post.goldPerWon && post.goldPerWon > 0) {
          const restoredOfficialGold = Math.round(post.goldPerWon * 2750);
          setOfficialGold(restoredOfficialGold);
        }
      } catch (err) {
        console.error('게시물 로딩 실패:', err);
        setNotFound(true);
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [postId, user]);

  // 아이템 추가 시 스크롤 맨 아래로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [addedItems.length]);

  const handleAddItem = (templateId: string) => {
    const template = TEMPLATES_MAP[templateId];
    if (!template) return;

    setAddedItems((prev) => {
      const existing = prev.find((a) => a.templateId === templateId);
      if (existing) {
        return prev.filter((a) => a.templateId !== templateId);
      }
      const newItem: AddedItem = { templateId, quantity: 1 };
      if (template.type === 'choice' && template.choices?.length) {
        newItem.selectedChoiceId = template.choices[0].itemId;
      }
      if (template.type === 'gold') {
        newItem.goldAmount = 0;
      }
      return [...prev, newItem];
    });
  };

  const handleRemoveItem = (templateId: string) => {
    setAddedItems((prev) => prev.filter((a) => a.templateId !== templateId));
  };

  const handleQuantityChange = (templateId: string, qty: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.templateId === templateId ? { ...a, quantity: Math.max(0, qty) } : a,
      ),
    );
  };

  const handleChoiceChange = (templateId: string, choiceId: string) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.templateId === templateId ? { ...a, selectedChoiceId: choiceId } : a,
      ),
    );
  };

  const handleGoldChange = (templateId: string, amount: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.templateId === templateId ? { ...a, goldAmount: amount } : a,
      ),
    );
  };

  // 총 골드 계산
  const totalGoldValue = useMemo(() => {
    return addedItems.reduce((sum, added) => {
      const template = TEMPLATES_MAP[added.templateId];
      if (!template) return sum;
      const unitPrice = getUnitPrice(added, template, latestPrices);
      const qty = template.type === 'gold' ? 1 : added.quantity;
      return sum + unitPrice * qty;
    }, 0);
  }, [addedItems, latestPrices]);

  const multiplier = packageType === '3+1' ? 4 / 3 : packageType === '2+1' ? 3 / 2 : 1;
  const adjustedValue = totalGoldValue * multiplier;
  const efficiency = royalCrystalPrice > 0 ? adjustedValue / royalCrystalPrice : 0;

  const goldPerWon = tradeMode === 'unofficial'
    ? (unofficialRate > 0 ? 100 / unofficialRate : 0)
    : (officialGold > 0 ? officialGold / 2750 : 0);
  const ratePer100 = goldPerWon > 0 ? Math.round(100 / goldPerWon) : 0;
  const singleCashGold = royalCrystalPrice * goldPerWon;
  const singleBenefit = singleCashGold > 0
    ? ((totalGoldValue - singleCashGold) / singleCashGold) * 100
    : 0;
  const buyCount = packageType === '3+1' ? 3 : packageType === '2+1' ? 2 : 1;
  const getCount = packageType === '3+1' ? 4 : packageType === '2+1' ? 3 : 1;
  const fullCashGold = royalCrystalPrice * buyCount * goldPerWon;
  const fullPackageGold = totalGoldValue * getCount;
  const fullBenefit = fullCashGold > 0
    ? ((fullPackageGold - fullCashGold) / fullCashGold) * 100
    : 0;

  // 수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (addedItems.length === 0) { setError('아이템을 1개 이상 추가해주세요.'); return; }
    if (royalCrystalPrice <= 0) { setError('현금 가격을 입력해주세요.'); return; }

    setSubmitting(true);
    setError('');

    try {
      const items: PackageItem[] = addedItems
        .map((added) => {
          const template = TEMPLATES_MAP[added.templateId];
          if (!template) return null;

          switch (template.type) {
            case 'simple':
              return {
                itemId: template.itemId!,
                name: template.name,
                quantity: added.quantity,
                icon: template.icon,
              };
            case 'choice': {
              const choice = template.choices?.find(
                (c) => c.itemId === added.selectedChoiceId,
              );
              return {
                itemId: added.selectedChoiceId || template.choices?.[0]?.itemId || '',
                name: choice?.name || template.name,
                quantity: added.quantity,
                icon: choice?.icon || template.icon,
                choiceOptions: template.choices?.map((c) => ({
                  itemId: c.itemId,
                  name: c.name,
                  ...(c.icon ? { icon: c.icon } : {}),
                })),
              };
            }
            case 'gold':
              return {
                itemId: `gold_${template.id}`,
                name: template.name,
                quantity: 1,
                icon: template.icon,
                goldOverride: added.goldAmount || 0,
              };
            case 'fixed':
              return {
                itemId: `fixed_${template.id}`,
                name: template.name,
                quantity: added.quantity,
                icon: template.icon,
                goldOverride: template.fixedGold || 0,
              };
            default:
              return null;
          }
        })
        .filter(Boolean) as PackageItem[];

      await updatePackagePost(postId, {
        title: title.trim(),
        packageType,
        royalCrystalPrice,
        items,
        ...(goldPerWon > 0 ? { goldPerWon } : { goldPerWon: 0 }),
      });

      router.push(`/package/${postId}`);
    } catch (err: any) {
      console.error('수정 실패:', err);
      setError('수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.registerWrapper}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>패키지 수정</h1>
          </div>
          <div className={styles.loginNotice}>
            <p className={styles.loginNoticeText}>로그인이 필요합니다.</p>
          </div>
        </div>
      </Container>
    );
  }

  if (pageLoading) {
    return (
      <Container fluid style={{ maxWidth: '1100px' }}>
        <div className={styles.registerWrapper} style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <Spinner animation="border" style={{ color: '#f97316' }} />
        </div>
      </Container>
    );
  }

  if (notFound) {
    return (
      <Container fluid style={{ maxWidth: '1100px' }}>
        <div className={styles.registerWrapper}>
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>게시물을 찾을 수 없거나 수정 권한이 없습니다.</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <div className={styles.registerWrapper}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>패키지 수정</h1>
          <p className={styles.pageSubtitle}>
            아래 아이템을 클릭하여 패키지를 수정하세요
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.topSplitRow}>
            {/* 좌측: 패키지 구성 */}
            <div className={`${styles.packageBox} ${addedItems.length > 0 ? styles.packageBoxFilled : ''}`}>
              <h2 className={styles.packageBoxTitle}>패키지 구성</h2>
              <div className={styles.packageBoxScroll} ref={scrollRef}>
                {addedItems.length === 0 ? (
                  <div className={styles.packageBoxEmpty}>
                    아래 목록에서 아이템을 클릭하여 추가하세요
                  </div>
                ) : (
                  <div className={styles.packageBoxList}>
                    {addedItems.map((added) => {
                      const template = TEMPLATES_MAP[added.templateId];
                      if (!template) return null;
                      const unitPrice = getUnitPrice(added, template, latestPrices);
                      const qty = template.type === 'gold' ? 1 : added.quantity;
                      const subtotal = unitPrice * qty;
                      return (
                        <div key={added.templateId} className={styles.packageBoxItem}>
                          <div className={styles.packageBoxItemMain}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={template.icon} alt={template.name}
                              className={styles.packageBoxItemIcon}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <span className={styles.packageBoxItemName}>{template.name}</span>
                            {template.type === 'gold' ? (
                              <input type="number" className={styles.quantityInput}
                                value={added.goldAmount || ''}
                                onChange={(e) => handleGoldChange(added.templateId, parseInt(e.target.value) || 0)}
                                placeholder="골드" style={{ width: '100px' }} />
                            ) : (
                              <>
                                <span className={styles.packageBoxItemX}>x</span>
                                <input type="number" className={styles.quantityInput}
                                  value={added.quantity || ''}
                                  onChange={(e) => handleQuantityChange(added.templateId, parseInt(e.target.value) || 0)}
                                  min={0} />
                              </>
                            )}
                            <span className={styles.packageBoxItemSubtotal}>{formatNumber(subtotal)}G</span>
                            <button type="button" className={styles.removeItemBtn}
                              onClick={() => handleRemoveItem(added.templateId)} title="제거">&times;</button>
                          </div>
                          {template.type === 'choice' && template.choices && template.choices.length <= 3 && (
                            <div className={styles.choiceBranch}>
                              {template.choices.map((choice) => {
                                const isSelected = added.selectedChoiceId === choice.itemId;
                                const choicePrice = getItemUnitPrice(choice.itemId, latestPrices);
                                return (
                                  <button key={choice.itemId} type="button"
                                    className={`${styles.choiceOption} ${isSelected ? styles.choiceOptionSelected : ''}`}
                                    onClick={() => handleChoiceChange(added.templateId, choice.itemId)}>
                                    {choice.icon && (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img src={choice.icon} alt={choice.name} className={styles.choiceOptionIcon}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    )}
                                    <span className={styles.choiceOptionName}>{choice.name}</span>
                                    <span className={styles.choiceOptionPrice}>
                                      {priceLoading ? '...' : `${formatNumber(choicePrice)}G`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {template.type === 'choice' && template.choices && template.choices.length > 3 && (
                            <div className={styles.choiceDropdown}>
                              <select className={styles.choiceSelect} value={added.selectedChoiceId || ''}
                                onChange={(e) => handleChoiceChange(added.templateId, e.target.value)}>
                                {template.choices.map((choice) => {
                                  const choicePrice = getItemUnitPrice(choice.itemId, latestPrices);
                                  return (
                                    <option key={choice.itemId} value={choice.itemId}>
                                      {choice.name} ({formatNumber(choicePrice)}G)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                          {template.type === 'fixed' && (
                            <div className={styles.fixedPriceBadge}>고정 {formatNumber(template.fixedGold || 0)}G</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {addedItems.length > 0 && (
                <div className={styles.packageBoxTotal}>
                  <span>총 골드 가치</span>
                  <span className={styles.packageBoxTotalValue}>{formatNumber(totalGoldValue)} G</span>
                </div>
              )}
            </div>

            {/* 우측: 패키지 정보 + 골드 환율 */}
            <div className={styles.rightPanel}>
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>패키지 정보</h2>
                <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                  <label className={styles.formLabel} htmlFor="pkg-title">패키지 이름 *</label>
                  <input id="pkg-title" type="text" className={styles.formInput}
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 2025 설날 패키지" maxLength={50} />
                </div>
                <div className={styles.typeButtonRow}>
                  {(['일반', '2+1', '3+1'] as PackageType[]).map((t) => (
                    <button key={t} type="button"
                      className={`${styles.typeButton} ${packageType === t ? styles.typeButtonActive : ''}`}
                      onClick={() => setPackageType(t)}>{t}</button>
                  ))}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="pkg-rc">패키지 현금 가격 (원) *</label>
                  <input id="pkg-rc" type="number" className={styles.formInput}
                    value={royalCrystalPrice || ''}
                    onChange={(e) => setRoyalCrystalPrice(parseInt(e.target.value) || 0)}
                    placeholder="예: 33000" min={0} />
                </div>
              </div>

              <div className={styles.rateSection}>
                <div className={styles.rateSectionHeader}>
                  <h2 className={styles.sectionTitle}>골드 환율</h2>
                  <div className={styles.tradeModeToggle}>
                    <button type="button"
                      className={`${styles.tradeModeBtn} ${tradeMode === 'official' ? styles.tradeModeBtnActive : ''}`}
                      onClick={() => setTradeMode('official')}>공식 거래</button>
                    <button type="button"
                      className={`${styles.tradeModeBtn} ${tradeMode === 'unofficial' ? styles.tradeModeBtnActive : ''}`}
                      onClick={() => setTradeMode('unofficial')}>엄거래</button>
                  </div>
                </div>
                {tradeMode === 'unofficial' ? (
                  <div className={styles.rateCard}>
                    <div className={styles.ratioRow}>
                      <span className={styles.ratioFixed}>100</span>
                      <span className={styles.ratioSeparator}>:</span>
                      <input type="number" className={styles.ratioInput}
                        value={unofficialRate || ''}
                        onChange={(e) => setUnofficialRate(parseInt(e.target.value) || 0)}
                        placeholder="22" min={0} />
                    </div>
                    <div className={styles.rateResult}>
                      {goldPerWon > 0 ? `1원 = ${goldPerWon.toFixed(2)} G` : '-'}
                    </div>
                  </div>
                ) : (
                  <div className={styles.rateCard}>
                    <div className={styles.ratioRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/royal.webp" alt="" className={styles.officialRateIcon} />
                      <span className={styles.ratioFixed}>2750</span>
                      <span className={styles.ratioSeparator}>=</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/blue.webp" alt="" className={styles.officialRateIcon} />
                      <span className={styles.ratioFixed}>100</span>
                      <span className={styles.ratioSeparator}>=</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/gold.webp" alt="" className={styles.officialRateIcon} />
                      <input type="number" className={styles.ratioInput}
                        value={officialGold || ''}
                        onChange={(e) => setOfficialGold(parseInt(e.target.value) || 0)}
                        placeholder="9500" min={0} />
                    </div>
                    <div className={styles.rateResult}>
                      {goldPerWon > 0 ? `100 : ${ratePer100} (1원 = ${goldPerWon.toFixed(2)} G)` : '-'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 아이템 추가 그리드 */}
          <div className={styles.availableSection}>
            <h2 className={styles.sectionTitle}>아이템 추가</h2>
            <div className={styles.availableGrid}>
              {TEMPLATE_ITEMS.map((template) => {
                const isAdded = addedItems.some((a) => a.templateId === template.id);
                return (
                  <button key={template.id} type="button"
                    className={`${styles.availableItem} ${isAdded ? styles.availableItemAdded : ''}`}
                    onClick={() => handleAddItem(template.id)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={template.icon} alt={template.name}
                      className={styles.availableItemIcon}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className={styles.availableItemName}>{template.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 계산 결과 사이드바 */}
          {addedItems.length > 0 && royalCrystalPrice > 0 && (
            <div className={styles.calcSidebar}>
              <h3 className={styles.calcSidebarTitle}>계산 결과</h3>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>1개 골드 가치</span>
                <span className={styles.calcValue}>{formatNumber(totalGoldValue)} G</span>
              </div>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>패키지 가격</span>
                <span className={styles.calcValue}>{formatNumber(royalCrystalPrice)}원</span>
              </div>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>효율</span>
                <span className={styles.calcEfficiency}>{formatNumber(efficiency)} G/원</span>
              </div>
              {goldPerWon > 0 && (
                <>
                  <hr className={styles.calcDivider} />
                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>현금 골드 구매 시</span>
                    <span className={styles.calcValue}>{formatNumber(singleCashGold)} G</span>
                  </div>
                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>1개 구매 이득률</span>
                    <span className={`${styles.calcEfficiency} ${singleBenefit >= 0 ? styles.calcPositive : styles.calcNegative}`}>
                      {singleBenefit >= 0 ? '+' : ''}{singleBenefit.toFixed(1)}%
                    </span>
                  </div>
                  {packageType !== '일반' && (
                    <>
                      <hr className={styles.calcDivider} />
                      <div className={styles.calcRow}>
                        <span className={styles.calcLabel}>{packageType} 지출</span>
                        <span className={styles.calcValue}>
                          {formatNumber(royalCrystalPrice * buyCount)}원
                        </span>
                      </div>
                      <div className={styles.calcRow}>
                        <span className={styles.calcLabel}>{packageType} 획득</span>
                        <span className={styles.calcValue}>{formatNumber(fullPackageGold)}G</span>
                      </div>
                      <div className={styles.calcRow}>
                        <span className={styles.calcLabel}>{packageType} 이득률</span>
                        <span className={`${styles.calcEfficiency} ${fullBenefit >= 0 ? styles.calcPositive : styles.calcNegative}`}>
                          {fullBenefit >= 0 ? '+' : ''}{fullBenefit.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
              {error && <p className={styles.errorMsg}>{error}</p>}
              <button type="submit" className={styles.registerButton}
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={submitting || !title.trim() || addedItems.length === 0 || royalCrystalPrice <= 0}>
                {submitting ? '수정 중...' : '수정 완료'}
              </button>
            </div>
          )}
        </form>
      </div>
    </Container>
  );
}
