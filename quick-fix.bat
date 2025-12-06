@echo off
chcp 65001 >nul
echo ============================================
echo 🚀 빠른 가격 갱신 스크립트
echo ============================================
echo.
echo 1. 캐시 초기화 중...
node clear-all-cache.js
echo.
echo 2. 가격 갱신 중...
node force-refresh-prices.js
echo.
echo 3. 개발 서버 재시작이 필요합니다.
echo    - 현재 실행 중인 서버를 중지하고 (Ctrl+C)
echo    - npm run dev 명령으로 다시 시작하세요
echo.
echo ============================================
echo ✅ 작업 완료!
echo ============================================
pause
