import { NextResponse } from "next/server"
import { fetchStockQuotes } from "@/lib/yahoo-finance"

export async function GET(request: Request, { params }: { params: { symbol: string } }) {
  const symbol = params.symbol

  if (!symbol) {
    return NextResponse.json({ error: "종목 코드가 필요합니다" }, { status: 400 })
  }

  try {
    const stockData = await fetchStockQuotes([symbol])

    if (!stockData || stockData.length === 0) {
      return NextResponse.json({ error: "주식을 찾을 수 없습니다" }, { status: 404 })
    }

    // Ensure the stock data has the isKoreanStock flag
    const stock = {
      ...stockData[0],
      isKoreanStock: stockData[0].symbol.includes(".KS"),
    }

    return NextResponse.json({ stock })
  } catch (error) {
    console.error(`${symbol}에 대한 주식 데이터 가져오기 오류:`, error)
    return NextResponse.json({ error: "주식 데이터를 가져오는데 실패했습니다" }, { status: 500 })
  }
}
