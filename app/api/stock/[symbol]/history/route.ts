import { NextResponse } from "next/server"
import { fetchHistoricalData, formatHistoricalData, mapTimeframeToYahooInterval } from "@/lib/yahoo-finance"

export async function GET(request: Request, { params }: { params: { symbol: string } }) {
  const { searchParams } = new URL(request.url)
  const timeframe = searchParams.get("timeframe") || "1개월"
  const symbol = params.symbol

  if (!symbol) {
    return NextResponse.json({ error: "종목 코드가 필요합니다" }, { status: 400 })
  }

  try {
    const { interval, range } = mapTimeframeToYahooInterval(timeframe)
    const historicalData = await fetchHistoricalData(symbol, interval, range)
    const formattedData = formatHistoricalData(historicalData)

    return NextResponse.json({ data: formattedData })
  } catch (error) {
    console.error(`${symbol}에 대한 과거 데이터 가져오기 오류:`, error)
    return NextResponse.json({ error: "과거 데이터를 가져오는데 실패했습니다" }, { status: 500 })
  }
}
