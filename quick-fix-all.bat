@echo off
chcp 65001 >nul
echo ============================================
echo 🚀 전체 아이템 가격 완전 갱신
echo ============================================
echo.
echo ⚠️  이 스크립트는 37개 전체 아이템을 갱신합니다.
echo ⏱️  약 2-3분 소요됩니다.
echo.
pause
echo.
echo 1. 캐시 초기화 중...
node clear-all-cache.js
echo.
echo 2. 전체 아이템 가격 갱신 중 (37개)...
node force-refresh-prices.js --all
echo.
echo 3. 개발 서버 재시작이 필요합니다.
echo    - 현재 실행 중인 서버를 중지하고 (Ctrl+C)
echo    - npm run dev 명령으로 다시 시작하세요
echo.
echo ============================================
echo ✅ 작업 완료!
echo ============================================
pause
