import { NextResponse } from "next/server"
import { fetchLatestPrices } from "@/lib/yahoo-finance"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const symbols = body.symbols || []

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: "유효한 종목 코드 배열이 필요합니다" }, { status: 400 })
    }

    // 최대 요청 가능한 종목 수 제한
    if (symbols.length > 100) {
      return NextResponse.json({ error: "한 번에 최대 100개의 종목만 요청할 수 있습니다" }, { status: 400 })
    }

    // 최신 가격 데이터만 가져오기
    const latestPrices = await fetchLatestPrices(symbols)

    return NextResponse.json({ prices: latestPrices })
  } catch (error) {
    console.error("최신 가격 데이터 가져오기 오류:", error)
    return NextResponse.json({ error: "최신 가격 데이터를 가져오는데 실패했습니다" }, { status: 500 })
  }
}
