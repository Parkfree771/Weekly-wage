'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'loa_search_history';
const MAX_HISTORY = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  // 클라이언트에서만 localStorage 접근
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // localStorage 접근 실패 시 무시
    }
  }, []);

  // 검색 히스토리에 추가
  const addToHistory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setHistory(prev => {
      // 중복 제거 후 맨 앞에 추가, 최대 개수 제한
      const updated = [trimmed, ...prev.filter(n => n !== trimmed)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage 저장 실패 시 무시
      }
      return updated;
    });
  }, []);

  // 입력값에 맞는 추천 목록 반환
  const getSuggestions = useCallback((input: string): string[] => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return [];
    return history.filter(h => h.toLowerCase().includes(trimmed));
  }, [history]);

  // 특정 항목 삭제
  const removeFromHistory = useCallback((name: string) => {
    setHistory(prev => {
      const updated = prev.filter(n => n !== name);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage 저장 실패 시 무시
      }
      return updated;
    });
  }, []);

  return {
    history,
    addToHistory,
    getSuggestions,
    removeFromHistory,
  };
}
