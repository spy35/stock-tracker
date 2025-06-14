// app/api/watchlist/remove/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 })
    }

    const body = await request.json()
    const { symbol } = body

    if (!symbol) {
      return NextResponse.json({ error: "종목 코드가 필요합니다." }, { status: 400 })
    }

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    // 직접 SQL 쿼리 사용
    try {
      // Favorite 테이블이 있는지 확인
      const tableExists = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'Favorite'
      `;
      
      const count = Array.isArray(tableExists) && tableExists.length > 0 ? tableExists[0].count : 0;
      
      if (count === 0) {
        return NextResponse.json({ message: "관심 종목이 제거되었습니다." });
      }
      
      // 관심 종목 제거
      await prisma.$executeRaw`
        DELETE FROM Favorite
        WHERE userId = ${user.id} AND symbol = ${symbol}
      `;
      
      return NextResponse.json({ message: "관심 종목이 제거되었습니다." });
    } catch (sqlError) {
      console.error("SQL 쿼리 오류:", sqlError);
      throw new Error("데이터베이스 작업 중 오류가 발생했습니다.");
    }
  } catch (error) {
    console.error("관심 종목 제거 오류:", error)
    return NextResponse.json({ error: "관심 종목 제거에 실패했습니다." }, { status: 500 })
  }
}