'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { createPackagePost } from '@/lib/package-service';
import NicknameModal from '@/components/auth/NicknameModal';
import type { PackagePostCreateData, PackageItem, PackageType } from '@/types/package';
import {
  type AddedItem,
  TEMPLATE_ITEMS,
  TEMPLATES_MAP,
  ICON_SIZE_CATALOG,
  ICON_SIZE_BOX,
  ICON_POSITION,
  ICON_SCALE,
  DYNAMIC_TICKET_IDS,
  formatNumber,
  getItemUnitPrice,
  getUnitPrice,
} from '@/lib/package-shared';
import styles from '../package.module.css';

export default function PackageRegisterPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);

  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [packageType, setPackageType] = useState<PackageType>('일반');
  const [royalCrystalPrice, setRoyalCrystalPrice] = useState<number>(0);
  const [tradeMode, setTradeMode] = useState<'unofficial' | 'official'>('official');
  // 엄거래: 100골드 : ?원
  const [unofficialRate, setUnofficialRate] = useState<number>(0);
  // 공식 거래: 2750 RC(=2750원) = 100 BC = ?골드 (RC/BC 고정)
  const [officialGold, setOfficialGold] = useState<number>(0);
  const [selectableCount, setSelectableCount] = useState<number>(0);
  const [checkedTemplateIds, setCheckedTemplateIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const customCounterRef = useRef(0);

  // 가격 fetch
  useEffect(() => {
    fetch('/api/price-data/latest')
      .then((res) => res.json())
      .then((data) => { setLatestPrices(data); setPriceLoading(false); })
      .catch(() => setPriceLoading(false));
  }, []);

  // 아이템 추가 시 스크롤 맨 아래로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [addedItems.length]);

  // 아이템 추가
  const handleAddItem = (templateId: string) => {
    const template = TEMPLATES_MAP[templateId];
    if (!template) return;

    setAddedItems((prev) => {
      const existing = prev.find((a) => a.templateId === templateId);
      if (existing) {
        // 이미 추가된 아이템 → 제거
        return prev.filter((a) => a.templateId !== templateId);
      }
      const newItem: AddedItem = { templateId, quantity: 1 };
      if (template.type === 'choice' && template.choices?.length) {
        newItem.selectedChoiceId = template.choices[0].itemId;
      }
      if (template.type === 'gold') {
        newItem.goldAmount = 0;
      }
      if (template.boxItem) {
        newItem.innerQuantity = 1;
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

  const handleInnerQuantityChange = (templateId: string, qty: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.templateId === templateId ? { ...a, innerQuantity: Math.max(0, qty) } : a,
      ),
    );
  };

  const handleAddCustomItem = () => {
    customCounterRef.current += 1;
    const id = `custom-${customCounterRef.current}`;
    setAddedItems((prev) => [...prev, {
      templateId: id,
      quantity: 1,
      isCustom: true,
      customName: '',
      customGoldPerUnit: 0,
    }]);
  };

  const handleCustomNameChange = (templateId: string, name: string) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.templateId === templateId ? { ...a, customName: name } : a,
      ),
    );
  };

  const handleCustomGoldChange = (templateId: string, gold: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.templateId === templateId ? { ...a, customGoldPerUnit: gold } : a,
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

  // 골드:현금 비율 계산 (1 RC = 1원, 100 BC = 2750 RC 고정)
  const goldPerWon = tradeMode === 'unofficial'
    ? (unofficialRate > 0 ? 100 / unofficialRate : 0)
    : (officialGold > 0 ? officialGold / 2750 : 0);

  // 아이템별 소계 계산
  const itemSubtotals = useMemo(() => {
    return addedItems.map((added) => {
      if (added.isCustom) {
        return (added.customGoldPerUnit || 0) * added.quantity;
      }
      const template = TEMPLATES_MAP[added.templateId];
      if (!template) return 0;
      const unitPrice = getUnitPrice(added, template, latestPrices, goldPerWon, officialGold || 0);
      const qty = template.type === 'gold' ? 1 : added.quantity;
      const inner = template.boxItem ? (added.innerQuantity || 1) : 1;
      return unitPrice * qty * inner;
    });
  }, [addedItems, latestPrices, goldPerWon, officialGold]);

  // selectableCount > 0일 때 가장 비싼 N개 자동 선택
  useEffect(() => {
    if (selectableCount <= 0 || addedItems.length === 0) {
      setCheckedTemplateIds(new Set(addedItems.map((a) => a.templateId)));
      return;
    }
    const withValue = addedItems.map((a, idx) => ({
      templateId: a.templateId,
      value: itemSubtotals[idx] || 0,
    }));
    withValue.sort((a, b) => b.value - a.value);
    const topN = new Set(withValue.slice(0, selectableCount).map((v) => v.templateId));
    setCheckedTemplateIds(topN);
  }, [addedItems, itemSubtotals, selectableCount]);

  // 총 골드 계산 (체크된 아이템만)
  const totalGoldValue = useMemo(() => {
    return addedItems.reduce((sum, added, idx) => {
      if (selectableCount > 0 && !checkedTemplateIds.has(added.templateId)) return sum;
      return sum + (itemSubtotals[idx] || 0);
    }, 0);
  }, [addedItems, itemSubtotals, selectableCount, checkedTemplateIds]);

  const multiplier = packageType === '3+1' ? 4 / 3 : packageType === '2+1' ? 3 / 2 : 1;
  const adjustedValue = totalGoldValue * multiplier;
  const efficiency = royalCrystalPrice > 0 ? adjustedValue / royalCrystalPrice : 0;
  // 100:X 비율 (100골드 당 원)
  const ratePer100 = goldPerWon > 0 ? Math.round(100 / goldPerWon) : 0;
  // 1개 구매 기준
  const singleCashGold = royalCrystalPrice * goldPerWon;
  const singleBenefit = singleCashGold > 0
    ? ((totalGoldValue - singleCashGold) / singleCashGold) * 100
    : 0;
  // N+1 전부 구매 기준 (3+1: 3개값 내고 4개 받음, 2+1: 2개값 내고 3개 받음)
  const buyCount = packageType === '3+1' ? 3 : packageType === '2+1' ? 2 : 1;
  const getCount = packageType === '3+1' ? 4 : packageType === '2+1' ? 3 : 1;
  const fullCashGold = royalCrystalPrice * buyCount * goldPerWon;
  const fullPackageGold = totalGoldValue * getCount;
  const fullBenefit = fullCashGold > 0
    ? ((fullPackageGold - fullCashGold) / fullCashGold) * 100
    : 0;

  // 등록
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = '제목을 입력해주세요.';
    if (addedItems.length === 0) errors.items = '아이템을 1개 이상 추가해주세요.';
    if (royalCrystalPrice <= 0) errors.price = '현금 가격을 입력해주세요.';
    if (goldPerWon <= 0) errors.rate = '환율을 입력해주세요.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    setError('');

    try {
      const items: PackageItem[] = addedItems
        .map((added) => {
          if (added.isCustom) {
            return {
              itemId: `custom_${added.templateId}`,
              name: added.customName || '기타',
              quantity: added.quantity,
              goldOverride: added.customGoldPerUnit || 0,
            };
          }
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
              const totalQty = template.boxItem
                ? added.quantity * (added.innerQuantity || 1)
                : added.quantity;
              return {
                itemId: added.selectedChoiceId || template.choices?.[0]?.itemId || '',
                name: choice?.name || template.name,
                quantity: totalQty,
                icon: template.icon,
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
            case 'fixed': {
              const fixedUnitGold = getUnitPrice(added, template, latestPrices, goldPerWon, officialGold || 0);
              return {
                itemId: `fixed_${template.id}`,
                name: template.name,
                quantity: added.quantity,
                icon: template.icon,
                goldOverride: Math.round(fixedUnitGold),
              };
            }
            case 'crystal': {
              const unitGold = (template.crystalPerUnit || 0) * goldPerWon * 27.5;
              return {
                itemId: `crystal_${template.id}`,
                name: template.name,
                quantity: added.quantity,
                icon: template.icon,
                goldOverride: unitGold,
                crystalPerUnit: template.crystalPerUnit || 0,
              };
            }
            case 'expected': {
              const expectedGold = (template.expectedItems || []).reduce((sum, ei) => {
                return sum + getItemUnitPrice(ei.itemId, latestPrices) * ei.probability;
              }, 0);
              return {
                itemId: `expected_${template.id}`,
                name: template.name,
                quantity: added.quantity,
                icon: template.icon,
                goldOverride: expectedGold,
              };
            }
            default:
              return null;
          }
        })
        .filter(Boolean) as PackageItem[];

      const postData: PackagePostCreateData = {
        authorUid: user.uid,
        authorName: userProfile.nickname || '익명',
        authorPhotoURL: null,
        title: title.trim(),
        description: '',
        packageType,
        royalCrystalPrice,
        items,
        ...(goldPerWon > 0 ? { goldPerWon } : {}),
        ...(selectableCount > 0 ? { selectableCount } : {}),
      };

      const postId = await createPackagePost(postData);
      router.push(`/package/${postId}`);
    } catch (err: any) {
      console.error('등록 실패:', err);
      setError('등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // 비로그인
  if (!user) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.registerWrapper}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>패키지 등록</h1>
          </div>
          <div className={styles.loginNotice}>
            <p className={styles.loginNoticeText}>
              패키지를 등록하려면 로그인이 필요합니다.
            </p>
            <p className={styles.loginNoticeText} style={{ fontSize: '0.85rem' }}>
              상단의 로그인 버튼을 눌러 Google 계정으로 로그인해주세요.
            </p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <div className={styles.registerWrapper}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>패키지 등록</h1>
          <p className={styles.pageSubtitle}>
            아래 아이템을 클릭하여 패키지에 추가하세요
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
                      // ── 커스텀 아이템 ──
                      if (added.isCustom) {
                        const cSubtotal = (added.customGoldPerUnit || 0) * added.quantity;
                        const isChecked = checkedTemplateIds.has(added.templateId);
                        return (
                          <div key={added.templateId} className={`${styles.packageBoxItem} ${selectableCount > 0 && !isChecked ? styles.packageBoxItemUnchecked : ''}`}>
                            <div className={styles.customItemRow}>
                              <input type="text" className={styles.customNameInput}
                                value={added.customName || ''}
                                onChange={(e) => handleCustomNameChange(added.templateId, e.target.value)}
                                placeholder="아이템 이름" maxLength={30} />
                              <input type="number" className={styles.quantityInput}
                                value={added.customGoldPerUnit || ''}
                                onChange={(e) => handleCustomGoldChange(added.templateId, parseInt(e.target.value) || 0)}
                                placeholder="골드" style={{ width: '80px' }} min={0} />
                              <span className={styles.packageBoxItemX}>x</span>
                              <input type="number" className={styles.quantityInput}
                                value={added.quantity || ''}
                                onChange={(e) => handleQuantityChange(added.templateId, parseInt(e.target.value) || 0)}
                                min={0} />
                              <span className={styles.packageBoxItemSubtotal}>{formatNumber(cSubtotal)}G</span>
                              <button type="button" className={styles.removeItemBtn}
                                onClick={() => handleRemoveItem(added.templateId)} title="제거">&times;</button>
                            </div>
                          </div>
                        );
                      }
                      // ── 일반 아이템 ──
                      const template = TEMPLATES_MAP[added.templateId];
                      if (!template) return null;
                      const unitPrice = getUnitPrice(added, template, latestPrices, goldPerWon, officialGold || 0);
                      const qty = template.type === 'gold' ? 1 : added.quantity;
                      const inner = template.boxItem ? (added.innerQuantity || 1) : 1;
                      const subtotal = unitPrice * qty * inner;
                      const isChecked = checkedTemplateIds.has(added.templateId);
                      return (
                        <div key={added.templateId} className={`${styles.packageBoxItem} ${selectableCount > 0 && !isChecked ? styles.packageBoxItemUnchecked : ''}`}>
                          <div className={styles.packageBoxItemMain}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={template.icon} alt={template.name}
                              className={styles.packageBoxItemIcon}
                              style={{
                                ...(ICON_SIZE_BOX[template.id] ? { width: ICON_SIZE_BOX[template.id], height: ICON_SIZE_BOX[template.id] } : {}),
                                ...(ICON_POSITION[template.id] ? { objectFit: 'cover' as const, objectPosition: ICON_POSITION[template.id] } : {}),
                              }}
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
                          {template.boxItem && (
                            <div className={styles.innerQuantityRow}>
                              <span className={styles.innerQuantityLabel}>상자당</span>
                              <input type="number" className={styles.quantityInput}
                                value={added.innerQuantity || ''}
                                onChange={(e) => handleInnerQuantityChange(added.templateId, parseInt(e.target.value) || 0)}
                                min={0} />
                              <span className={styles.innerQuantityLabel}>개</span>
                            </div>
                          )}
                          {template.type === 'fixed' && (template.fixedGold ?? 0) > 0 &&
                            !DYNAMIC_TICKET_IDS.has(template.id) && (
                            <div className={styles.fixedPriceBadge}>{formatNumber(template.fixedGold || 0)}G</div>
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
                  <input id="pkg-title" type="text" className={`${styles.formInput} ${fieldErrors.title ? styles.formInputError : ''}`}
                    value={title} onChange={(e) => { setTitle(e.target.value); if (fieldErrors.title) setFieldErrors((p) => { const n = { ...p }; delete n.title; return n; }); }}
                    placeholder="예: 2025 설날 패키지" maxLength={50} />
                  {fieldErrors.title && <p className={styles.fieldErrorMsg}>{fieldErrors.title}</p>}
                </div>
                <div className={styles.typeButtonRow}>
                  {(['일반', '2+1', '3+1'] as PackageType[]).map((t) => (
                    <button key={t} type="button"
                      className={`${styles.typeButton} ${packageType === t ? styles.typeButtonActive : ''}`}
                      onClick={() => setPackageType(t)}>{t}</button>
                  ))}
                </div>
                <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                  <label className={styles.formLabel} htmlFor="pkg-selectable">N선택 (0=전체)</label>
                  <div className={styles.selectableCountRow}>
                    <input id="pkg-selectable" type="number" className={styles.selectableCountInput}
                      value={selectableCount || ''}
                      onChange={(e) => setSelectableCount(parseInt(e.target.value) || 0)}
                      placeholder="0" min={0} />
                    {selectableCount > 0 && (
                      <span className={styles.selectableCountHint}>
                        {addedItems.length}개 중 {selectableCount}개 선택
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="pkg-rc">패키지 현금 가격 (원) *</label>
                  <input id="pkg-rc" type="number" className={`${styles.formInput} ${fieldErrors.price ? styles.formInputError : ''}`}
                    value={royalCrystalPrice || ''}
                    onChange={(e) => { setRoyalCrystalPrice(parseInt(e.target.value) || 0); if (fieldErrors.price) setFieldErrors((p) => { const n = { ...p }; delete n.price; return n; }); }}
                    placeholder="예: 33000" min={0} />
                  {fieldErrors.price && <p className={styles.fieldErrorMsg}>{fieldErrors.price}</p>}
                </div>
              </div>

              <div className={`${styles.rateSection} ${fieldErrors.rate ? styles.rateCardError : ''}`}>
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
                {fieldErrors.rate && <p className={styles.fieldErrorMsg}>{fieldErrors.rate}</p>}
              </div>
            </div>
          </div>{/* topSplitRow */}

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
                    <div className={styles.availableItemIconWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={template.icon} alt={template.name}
                        className={styles.availableItemIcon}
                        style={{
                          ...(ICON_SIZE_CATALOG[template.id] ? { maxWidth: ICON_SIZE_CATALOG[template.id], maxHeight: ICON_SIZE_CATALOG[template.id] } : {}),
                          ...(ICON_POSITION[template.id] ? { objectFit: 'cover' as const, objectPosition: ICON_POSITION[template.id] } : {}),
                          ...(ICON_SCALE[template.id] ? { transform: ICON_SCALE[template.id] } : {}),
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <span className={styles.availableItemName}>{template.name}</span>
                  </button>
                );
              })}
              <button type="button"
                className={`${styles.availableItem} ${styles.availableItemCustom}`}
                onClick={handleAddCustomItem}>
                <span className={styles.availableItemCustomPlus}>+</span>
                <span className={styles.availableItemName}>기타 항목 추가</span>
              </button>
            </div>
          </div>

          {/* 계산 결과 사이드바 (fixed) */}
          <div className={styles.calcSidebar}>
            <h3 className={styles.calcSidebarTitle}>계산 결과</h3>
            {addedItems.length > 0 && royalCrystalPrice > 0 && (
              <>
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
              </>
            )}
            {error && <p className={styles.errorMsg}>{error}</p>}
            <button type="submit" className={styles.registerButton}
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={submitting}>
              {submitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </form>
      </div>

      {userProfile && !userProfile.nickname && <NicknameModal />}
    </Container>
  );
}
