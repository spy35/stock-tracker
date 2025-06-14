/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15에서 변경된 설정
  serverExternalPackages: ["@prisma/client", "bcrypt"],

  // 이미지 최적화 설정
  images: {
    unoptimized: true,
    domains: ["localhost"],
  },

  // 환경 변수 설정
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
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
