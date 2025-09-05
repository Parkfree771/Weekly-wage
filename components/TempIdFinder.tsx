'use client';

import React, { useState } from 'react';
import axios from 'axios';

const TempIdFinder: React.FC = () => {
  const [itemName, setItemName] = useState('운명의 파괴석');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findId = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/market/search', { itemName });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '16px', marginTop: '20px' }}>
      <h4>임시 아이템 ID 찾기 도구</h4>
      <input
        type="text"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        style={{ padding: '8px', minWidth: '200px' }}
      />
      <button onClick={findId} disabled={isLoading} style={{ marginLeft: '8px', padding: '8px' }}>
        {isLoading ? '검색 중...' : 'ID 찾기'}
      </button>
      {error && <pre style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{error}</pre>}
      {result && (
        <div>
          <h5>결과:</h5>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: '10px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TempIdFinder;