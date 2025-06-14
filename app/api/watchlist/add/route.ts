// app/api/watchlist/add/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 })
    }

    const body = await request.json()
    const { symbol, name, isKoreanStock } = body

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
      // 1. Favorites 테이블이 없으면 생성
      await prisma.$executeRaw`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Favorite')
        BEGIN
          CREATE TABLE Favorite (
            id NVARCHAR(255) PRIMARY KEY,
            userId NVARCHAR(255) NOT NULL,
            symbol NVARCHAR(255) NOT NULL,
            name NVARCHAR(255) NOT NULL,
            isKoreanStock BIT NOT NULL DEFAULT 0,
            createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
          )
        END
      `;
      
      // 2. 유니크 제약 조건 추가
      await prisma.$executeRaw`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_NAME = 'UQ_Favorite_userId_symbol')
        BEGIN
          ALTER TABLE Favorite
          ADD CONSTRAINT UQ_Favorite_userId_symbol UNIQUE (userId, symbol)
        END
      `;
      
      // 3. 이미 관심 목록에 있는지 확인
      const existingItems = await prisma.$queryRaw`
        SELECT id FROM Favorite
        WHERE userId = ${user.id} AND symbol = ${symbol}
      `;
      
      if (Array.isArray(existingItems) && existingItems.length > 0) {
        return NextResponse.json({ message: "이미 관심 목록에 있는 종목입니다." });
      }
      
      // 4. 관심 종목 추가
      await prisma.$executeRaw`
        INSERT INTO Favorite (id, userId, symbol, name, isKoreanStock)
        VALUES (${randomUUID()}, ${user.id}, ${symbol}, ${name || symbol}, ${isKoreanStock ? 1 : 0})
      `;
      
      return NextResponse.json({ message: "관심 종목이 추가되었습니다." });
    } catch (sqlError) {
      console.error("SQL 쿼리 오류:", sqlError);
      throw new Error("데이터베이스 작업 중 오류가 발생했습니다.");
    }
  } catch (error) {
    console.error("관심 종목 추가 오류:", error)
    return NextResponse.json({ error: "관심 종목 추가에 실패했습니다." }, { status: 500 })
  }
}