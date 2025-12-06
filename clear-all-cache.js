/**
 * Next.js 캐시 완전 초기화 스크립트
 * 가격이 안 보일 때 사용
 *
 * 사용법: node clear-all-cache.js
 */

const fs = require('fs');
const path = require('path');

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

console.log('🧹 캐시 초기화 시작...\n');

const cachePaths = [
  '.next/cache',
  '.next',
  'node_modules/.cache',
];

let deletedCount = 0;

cachePaths.forEach(cachePath => {
  const fullPath = path.join(process.cwd(), cachePath);

  if (fs.existsSync(fullPath)) {
    console.log(`🗑️  삭제 중: ${cachePath}`);
    try {
      deleteFolderRecursive(fullPath);
      console.log(`✅ 삭제 완료: ${cachePath}\n`);
      deletedCount++;
    } catch (error) {
      console.log(`⚠️  삭제 실패: ${cachePath} - ${error.message}\n`);
    }
  } else {
    console.log(`ℹ️  없음: ${cachePath}\n`);
  }
});

console.log('=================================================');
console.log(`✨ 캐시 초기화 완료! (${deletedCount}개 폴더 삭제)`);
console.log('=================================================');
console.log('\n다음 단계:');
console.log('1. npm run build  (프로덕션 빌드)');
console.log('2. npm run dev    (개발 서버 재시작)');
console.log('\n또는 배포된 사이트라면:');
console.log('- Netlify/Vercel에서 "Clear cache and redeploy" 실행');
