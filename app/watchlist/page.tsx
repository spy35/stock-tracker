"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, RefreshCw, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatKoreanCurrency, formatUSDCurrency } from "@/lib/yahoo-finance"
import { Progress } from "@/components/ui/progress"

interface WatchlistItem {
  id: string
  symbol: string
  name: string
  isKoreanStock: boolean
  price?: number
  change?: number
  changePercent?: number
}

interface ChartDataPoint {
  date: string
  time: string
  price: number
  volume: number
}

interface StockChartData {
  symbol: string
  chartData: ChartDataPoint[]
  latestPrice: number
  priceChange: number
  percentChange: number
  isKoreanStock: boolean
  error?: string
}

// 배열을 지정된 크기의 청크로 나누는 유틸리티 함수
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

export default function WatchlistPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState(0)

  // 관심 종목 목록 가져오기
  const fetchWatchlist = async () => {
    if (status !== "authenticated") return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/watchlist")

      if (!response.ok) {
        throw new Error("관심 종목을 불러오는데 실패했습니다.")
      }

      const data = await response.json()
      setWatchlist(data.watchlist || [])

      // 가격 정보 가져오기
      if (data.watchlist?.length > 0) {
        fetchStockCharts(data.watchlist.map((item: WatchlistItem) => item.symbol))
      }
    } catch (err: any) {
      console.error("관심 종목 로드 실패:", err)
      setError(err.message || "관심 종목을 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 주식 차트 데이터를 순차적으로 가져오기 함수 (메인 페이지와 동일한 방식)
  const fetchStockCharts = useCallback(
    async (symbols: string[]) => {
      if (!symbols || symbols.length === 0) return

      setRefreshing(true)
      setRefreshProgress(0)

      try {
        // 심볼 배열을 20개 단위로 나누기 (API 제한)
        const MAX_SYMBOLS_PER_REQUEST = 20
        const symbolChunks = chunkArray(symbols, MAX_SYMBOLS_PER_REQUEST)

        // 차트 데이터를 심볼별로 맵으로 변환
        const chartMap: Record<string, StockChartData> = {}

        // 순차적으로 각 청크 처리
        for (let i = 0; i < symbolChunks.length; i++) {
          const chunk = symbolChunks[i]

          try {
            const response = await fetch("/api/stocks/latest-charts", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                symbols: chunk,
                timeframe: "1일", // 메인 페이지에서는 1일 데이터 사용
              }),
              cache: "no-store",
            })

            if (!response.ok) {
              const errorText = await response.text()
              throw new Error(`차트 요청 오류: ${response.status} - ${errorText}`)
            }

            const data = await response.json()

            if (data.error) {
              throw new Error(data.error)
            }

            // 결과를 차트 맵에 추가
            if (data.charts && Array.isArray(data.charts)) {
              data.charts.forEach((chartData: StockChartData) => {
                chartMap[chartData.symbol] = chartData
              })
            }

            // 진행 상황 업데이트
            const progress = Math.round(((i + 1) / symbolChunks.length) * 100)
            setRefreshProgress(progress)

            // 주식 가격 데이터 업데이트
            setWatchlist((prevWatchlist) =>
              prevWatchlist.map((item) => {
                const chartData = chartMap[item.symbol]
                if (chartData && chartData.latestPrice) {
                  return {
                    ...item,
                    price: chartData.latestPrice,
                    change: chartData.priceChange,
                    changePercent: chartData.percentChange,
                  }
                }
                return item
              }),
            )

            console.log(`청크 ${i + 1}/${symbolChunks.length} 처리 완료 (${chunk.length}개 종목)`)

            // 각 청크 사이에 약간의 지연 추가 (API 부하 방지)
            if (i < symbolChunks.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 300))
            }
          } catch (chunkError) {
            console.error(`청크 ${i + 1}/${symbolChunks.length} 처리 중 오류 (${chunk.length}개 심볼):`, chunkError)
            // 개별 청크 오류는 전체 프로세스를 중단하지 않음
          }
        }

        console.log(`총 ${symbols.length}개 종목의 차트 데이터 업데이트 완료`)
      } catch (err: any) {
        console.error("차트 데이터 업데이트 실패:", err)
        toast({
          title: "오류 발생",
          description: "가격 데이터를 불러오는데 실패했습니다.",
          variant: "destructive",
        })
      } finally {
        setRefreshing(false)
        // 잠시 후 프로그레스 바 숨기기
        setTimeout(() => setRefreshProgress(0), 1000)
      }
    },
    [toast],
  )

  // 관심 종목 제거
  const removeFromWatchlist = async (item: WatchlistItem) => {
    try {
      const response = await fetch("/api/watchlist/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol: item.symbol }),
      })

      if (response.ok) {
        setWatchlist((prev) => prev.filter((i) => i.symbol !== item.symbol))
        toast({
          title: "관심 종목 제거",
          description: `${item.name || item.symbol}이(가) 관심 종목에서 제거되었습니다.`,
        })
      } else {
        throw new Error("관심 종목 제거에 실패했습니다.")
      }
    } catch (err: any) {
      toast({
        title: "오류 발생",
        description: err.message || "관심 종목 제거 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 세션 상태가 변경될 때 관심 종목 목록 가져오기
  useEffect(() => {
    if (status === "authenticated") {
      fetchWatchlist()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [status])

  // 로그인 필요 메시지
  if (status === "unauthenticated") {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">관심 종목</h1>
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">관심 종목 기능을 사용하려면 로그인이 필요합니다.</p>
          <Button asChild>
            <Link href="/login">로그인하기</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">관심 종목</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchWatchlist()}
          disabled={loading || refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "새로고침 중..." : "새로고침"}
        </Button>
      </div>

      {refreshProgress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>데이터 갱신 중...</span>
            <span>{refreshProgress}%</span>
          </div>
          <Progress value={refreshProgress} className="h-2" />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-20 mb-2" />
                <Skeleton className="h-4 w-40 mb-4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-500 mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchWatchlist()}>
            다시 시도
          </Button>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">관심 종목이 없습니다.</p>
          <Button asChild>
            <Link href="/">주식 둘러보기</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {watchlist.map((item) => (
            <Card key={item.symbol} className="relative group">
              <CardContent className="pt-6">
                <Link href={`/stock/${item.symbol}`} className="block">
                  <h2 className="text-xl font-bold">{item.symbol}</h2>
                  <p className="text-sm text-muted-foreground truncate mb-4">{item.name}</p>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {item.price !== undefined
                          ? item.isKoreanStock
                            ? formatKoreanCurrency(item.price)
                            : formatUSDCurrency(item.price)
                          : "불러오는 중..."}
                      </p>

                      {item.change !== undefined && item.changePercent !== undefined && (
                        <div className={`flex items-center ${item.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {item.change >= 0 ? (
                            <ArrowUp className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowDown className="h-4 w-4 mr-1" />
                          )}
                          <span>
                            {item.change >= 0 ? "+" : ""}
                            {item.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFromWatchlist(item)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
