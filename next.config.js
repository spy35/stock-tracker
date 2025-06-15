const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone 모드를 활성화합니다.
  output: "standalone",

  // 파일 경로 추적 문제를 해결하기 위한 설정
  experimental: {
    outputFileTracingRoot: path.join(__dirname, './'),
  },

  // Next.js 15에서 변경된 설정
  serverExternalPackages: ["@prisma/client", "bcrypt"],

  // 이미지 최적화 설정
  images: {
    unoptimized: true,
    domains: ["localhost"],
  },

  // 빌드 최적화
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
// Next.js 설정을 내보냅니다.
