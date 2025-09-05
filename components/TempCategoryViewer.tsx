'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TempCategoryViewer: React.FC = () => {
  const [categories, setCategories] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/market/options');
      setCategories(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '카테고리 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div style={{ border: '1px solid #ccc', padding: '16px', marginTop: '20px' }}>
      <h4>마켓 카테고리 코드 뷰어</h4>
      {isLoading && <p>로딩 중...</p>}
      {error && <pre style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{error}</pre>}
      {categories && (
        <div>
          <h5>결과:</h5>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {JSON.stringify(categories, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TempCategoryViewer;
