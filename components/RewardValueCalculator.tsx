'use client';

import React, { useState } from 'react';
import axios from 'axios';
import styles from './RewardValueCalculator.module.css';

const ITEM_ID = '66102116'; // 운명의 수호석
const QUANTITY = 4400;

const RewardValueCalculator: React.FC = () => {
  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateValue = async () => {
    setIsLoading(true);
    setError(null);
    setTotalValue(null);

    try {
      const response = await axios.get(`/api/market/price?itemId=${ITEM_ID}`);
      const averagePrice = response.data.averagePrice;

      if (averagePrice === undefined || averagePrice === null) {
        throw new Error('API에서 가격 정보를 가져올 수 없습니다.');
      }

      setTotalValue(averagePrice * QUANTITY);

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '계산 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h4>'종막 하드' 더보기 보상 가치 계산</h4>
      <p>'운명의 수호석' 4400개의 현재 가치를 계산합니다.</p>
      <button onClick={calculateValue} disabled={isLoading} className={styles.button}>
        {isLoading ? '계산 중...' : '가치 계산하기'}
      </button>
      {totalValue !== null && (
        <div className={styles.result}>
          <p>
            '운명의 수호석' 4400개의 가치는 약{' '}
            <strong>{Math.round(totalValue).toLocaleString()}</strong> 골드입니다.
          </p>
          <small>(1개당 평균가: {(totalValue / QUANTITY).toFixed(2)} 골드)</small>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default RewardValueCalculator;
