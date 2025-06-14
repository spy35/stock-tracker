import { NextResponse } from "next/server"
import { fetchHistoricalData, formatHistoricalData, mapTimeframeToYahooInterval } from "@/lib/yahoo-finance"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { symbols = [], timeframe = "1일" } = body

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: "유효한 종목 코드 배열이 필요합니다" }, { status: 400 })
    }

    // 최대 요청 가능한 종목 수 제한
    if (symbols.length > 20) {
      return NextResponse.json({ error: "한 번에 최대 20개의 종목 차트만 요청할 수 있습니다" }, { status: 400 })
    }

    const { interval, range } = mapTimeframeToYahooInterval(timeframe)

    // 모든 심볼에 대한 차트 데이터를 병렬로 가져오기
    const chartDataPromises = symbols.map(async (symbol) => {
      try {
        const historicalData = await fetchHistoricalData(symbol, interval, range)
        const formattedData = formatHistoricalData(historicalData)

        // 마지막 가격 데이터 계산
        const lastDataPoint = formattedData[formattedData.length - 1] || { price: 0 }
        const firstDataPoint = formattedData[0] || { price: 0 }

        const priceChange = Number.parseFloat((lastDataPoint.price - firstDataPoint.price).toFixed(2))
        const percentChange = Number.parseFloat(((priceChange / firstDataPoint.price) * 100).toFixed(2))

        return {
          symbol,
          chartData: formattedData,
          latestPrice: lastDataPoint.price,
          priceChange,
          percentChange,
          isKoreanStock: symbol.includes(".KS"),
        }
      } catch (error) {
        console.error(`${symbol}에 대한 차트 데이터 가져오기 오류:`, error)
        return {
          symbol,
          chartData: [],
          latestPrice: 0,
          priceChange: 0,
          percentChange: 0,
          isKoreanStock: symbol.includes(".KS"),
          error: `${symbol} 차트 데이터를 가져오는데 실패했습니다`,
        }
      }
    })

    const results = await Promise.all(chartDataPromises)

    return NextResponse.json({ charts: results })
  } catch (error) {
    console.error("차트 데이터 가져오기 오류:", error)
    return NextResponse.json({ error: "차트 데이터를 가져오는데 실패했습니다" }, { status: 500 })
  }
}
