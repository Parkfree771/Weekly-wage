# cron-job.org 설정 가이드

GitHub Actions 대신 cron-job.org를 사용하여 무료로 가격 데이터 수집

## 1. 계정 생성

1. https://cron-job.org 접속
2. **Sign up** 클릭
3. 이메일로 계정 생성 (무료)

## 2. Cron Jobs 생성

총 **3개의 Cron Job** 필요:

### Job 1: 거래소 - 재련 재료 + 젬 (매시 정각)

- **Title**: `거래소 - 재련재료 + 젬`
- **URL**: `https://your-site.netlify.app/api/cron/collect-prices?category=refine,gem`
- **Schedule**:
  - Type: `Every hour`
  - Minute: `0`
- **Request method**: `GET`
- **Headers** 추가:
  ```
  Authorization: Bearer 56c29d5cd0186011a00522f1de612263
  Content-Type: application/json
  ```
- **Timeout**: `60 seconds`

### Job 2: 거래소 - 재련 추가재료 + 각인서 (매시 5분)

- **Title**: `거래소 - 재련추가재료 + 각인서`
- **URL**: `https://your-site.netlify.app/api/cron/collect-prices?category=refine_additional,engraving`
- **Schedule**:
  - Type: `Every hour`
  - Minute: `5`
- **Request method**: `GET`
- **Headers** 추가:
  ```
  Authorization: Bearer 56c29d5cd0186011a00522f1de612263
  Content-Type: application/json
  ```
- **Timeout**: `60 seconds`

### Job 3: 경매장 - 악세 + 보석 (매시 10분)

- **Title**: `경매장 - 악세 + 보석`
- **URL**: `https://your-site.netlify.app/api/cron/collect-prices?category=accessory,jewel`
- **Schedule**:
  - Type: `Every hour`
  - Minute: `10`
- **Request method**: `GET`
- **Headers** 추가:
  ```
  Authorization: Bearer 56c29d5cd0186011a00522f1de612263
  Content-Type: application/json
  ```
- **Timeout**: `60 seconds`

## 3. 설정 완료 후

### 각 Job 활성화
- **Enable** 스위치 ON

### 테스트 실행
- 각 Job에서 **Run now** 클릭
- **Execution history** 탭에서 결과 확인
- HTTP Status 200이면 성공!

### 알림 설정 (선택사항)
- **Notifications** 탭
- 실패 시 이메일 알림 설정 가능

## 4. GitHub Actions 비활성화

cron-job.org가 정상 작동하면 GitHub Actions 워크플로우 삭제:

```bash
rm .github/workflows/collect-prices.yml
git add .
git commit -m "Remove GitHub Actions - Switch to cron-job.org"
git push
```

## 주의사항

⚠️ **SITE_URL 변경**
- Netlify 사이트 URL로 교체 필요
- 예: `https://lostark-weekly-gold.netlify.app`

⚠️ **CRON_SECRET 보안**
- cron-job.org 계정 비밀번호 안전하게 관리
- CRON_SECRET 절대 공개 금지

## 장점

✅ 완전 무료
✅ GitHub Actions 사용량 0
✅ 간단한 설정
✅ 안정적인 서비스
✅ 실행 히스토리 확인 가능
✅ 실패 시 자동 재시도

## 비교

| 항목 | GitHub Actions | cron-job.org |
|------|----------------|--------------|
| 가격 | 무료 2000분/월 → 초과 시 유료 | 완전 무료 |
| 설정 | YAML 파일 + Secrets | 웹 UI 클릭만 |
| 모니터링 | GitHub Actions 탭 | cron-job.org 대시보드 |
| 안정성 | 높음 | 높음 |
| 사용 편의성 | 중간 | 매우 쉬움 |
