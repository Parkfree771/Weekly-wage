/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: require('path').join(__dirname),

  // 성능 최적화
  compress: true,
  poweredByHeader: false,
  
  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1년
  },
  
  // 번들 최적화 (swcMinify는 Next.js 13+에서 기본값이므로 제거)
  modularizeImports: {
    'react-bootstrap': {
      transform: 'react-bootstrap/{{member}}',
    },
  },
  
  // 헤더 최적화
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/lostark',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/api/market/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig