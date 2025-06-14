import { PrismaClient } from "@prisma/client";

// 글로벌 객체 선언 (TypeScript에서 글로벌 변수 정의)
declare global {
  var prisma: PrismaClient | undefined;
}

// PrismaClient를 전역 객체에 추가하여 핫 리로드 시 여러 인스턴스가 생성되는 것을 방지
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;