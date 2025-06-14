/** @type {import('next').NextConfig} */
const nextConfig = {
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
