import { NextResponse } from "next/server"
import { fetchStockQuotes, popularStockSymbols } from "@/lib/yahoo-finance"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query") || ""
  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20", 10)

  try {
    // If query is provided, filter symbols that match the query
    let allSymbols = popularStockSymbols

    if (query) {
      // Import the Korean company names for searching
      const { koreanCompanyNames } = await import("@/lib/stock-symbols")

      // Convert query to lowercase for case-insensitive matching
      const lowercaseQuery = query.toLowerCase()

      allSymbols = popularStockSymbols.filter((symbol) => {
        // Check if symbol contains the query
        if (symbol.toLowerCase().includes(lowercaseQuery)) {
          return true
        }

        // Check if Korean company name contains the query
        const koreanName = koreanCompanyNames[symbol]
        if (koreanName && koreanName.toLowerCase().includes(lowercaseQuery)) {
          return true
        }

        return false
      })

      // Prioritize exact matches and Korean stocks
      allSymbols.sort((a, b) => {
        const aIsKorean = a.includes(".KS")
        const bIsKorean = b.includes(".KS")

        // Prioritize Korean stocks if query is in Korean (has Korean Unicode range)
        const hasKoreanChar = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/.test(query)

        if (hasKoreanChar) {
          if (aIsKorean && !bIsKorean) return -1
          if (!aIsKorean && bIsKorean) return 1
        }

        // Then prioritize exact matches
        const aExact = a.toLowerCase() === lowercaseQuery
        const bExact = b.toLowerCase() === lowercaseQuery

        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1

        return 0
      })
    }

    // 전체 심볼 수 계산
    const totalSymbols = allSymbols.length

    // 페이지네이션 적용
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedSymbols = allSymbols.slice(startIndex, endIndex)

    // 현재 페이지의 주식 데이터만 가져오기
    const stockData = await fetchStockQuotes(paginatedSymbols)

    return NextResponse.json({
      stocks: stockData,
      pagination: {
        page,
        pageSize,
        totalItems: totalSymbols,
        totalPages: Math.ceil(totalSymbols / pageSize),
      },
    })
  } catch (error) {
    console.error("주식 API 오류:", error)
    return NextResponse.json({ error: "주식 데이터를 가져오는데 실패했습니다" }, { status: 500 })
  }
}
