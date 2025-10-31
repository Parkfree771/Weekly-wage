import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // 번들 최적화
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 클라이언트 번들에서 서버 전용 모듈 제외
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },

  // 실험적 기능으로 패키지 최적화
  experimental: {
    optimizePackageImports: ['react-bootstrap', 'recharts', 'bootstrap-icons'],
  },
};

export default nextConfig;
