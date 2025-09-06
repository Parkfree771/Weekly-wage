'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { marketPriceService } from '@/utils/marketPriceService';
import styles from './RewardValueCalculator.module.css';

const ITEM_ID = '66102116'; // 운명의 수호석
const QUANTITY = 4400;

const RewardValueCalculator: React.FC = () => {
  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const calculateValue = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 5분 캐시를 활용한 최근 거래가 가져오기
      console.log('Getting current price for 운명의 수호석');
      const price = await marketPriceService.getItemPrice(parseInt(ITEM_ID));

      if (price === undefined || price === null || price === 0) {
        throw new Error('현재 거래가 정보를 가져올 수 없습니다.');
      }

      setTotalValue(price * QUANTITY);
      setLastUpdated(new Date());

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '계산 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트시 및 5분마다 자동 갱신
  useEffect(() => {
    calculateValue();
    
    const interval = setInterval(() => {
      calculateValue();
    }, 5 * 60 * 1000); // 5분마다 실행
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <h4>'종막 하드' 더보기 보상 가치 계산</h4>
      <p>'운명의 수호석' 4400개의 최근 거래가 기준 가치입니다.</p>
      
      {isLoading && (
        <div className={styles.loadingInfo}>
          <span>최근 거래가 정보를 가져오는 중...</span>
        </div>
      )}

      {lastUpdated && (
        <div className={styles.updateInfo}>
          <small>최종 갱신: {lastUpdated.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })} (5분마다 자동갱신)</small>
        </div>
      )}

      {totalValue !== null && (
        <div className={styles.result}>
          <p>
            '운명의 수호석' 4400개의 가치는 약{' '}
            <strong>{Math.round(totalValue).toLocaleString()}</strong> 골드입니다.
          </p>
          <small>(1개당 최근 거래가: {(totalValue / QUANTITY).toFixed(2)} 골드)</small>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default RewardValueCalculator;
