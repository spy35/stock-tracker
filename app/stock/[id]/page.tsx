"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowLeft, ArrowUp, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatKoreanCurrency, formatUSDCurrency, formatLargeNumber } from "@/lib/yahoo-finance"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
// import { ThemeToggle } from "@/components/theme-toggle"

interface StockData {
  symbol: string
  shortName: string
  longName: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  marketCap: number
  fiftyTwoWeekLow: number
  fiftyTwoWeekHigh: number
  sector?: string
  industry?: string
  isKoreanStock?: boolean
}

interface ChartDataPoint {
  date: string
  time: string
  price: number
  volume: number
}

export default function StockDetailPage({ params }: { params: { id: string } }) {
  const symbol = params.id
  const [stock, setStock] = useState<StockData | null>(null)
  const [timeframe, setTimeframe] = useState("1개월")
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [checkingWatchlist, setCheckingWatchlist] = useState(false)
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)

  // Fetch stock details
  useEffect(() => {
    const fetchStockDetails = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/stock/${symbol}`)

        if (!response.ok) {
          throw new Error(`오류: ${response.status}`)
        }

        const data = await response.json()
        setStock(data.stock)
        console.log("불러오는 중...")
      } catch (err) {
        console.error("주식 상세 정보 로드 실패:", err)
        setError("주식 데이터를 불러오는데 실패했습니다. 나중에 다시 시도해주세요.")
        console.log("불러오는 중...")
      } finally {
        setLoading(false)
      }
    }

    if (symbol) {
      fetchStockDetails()
    }
  }, [symbol])

  // Fetch historical data for chart
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setChartLoading(true)

      try {
        const response = await fetch(`/api/stock/${symbol}/history?timeframe=${timeframe}`)

        if (!response.ok) {
          throw new Error(`오류: ${response.status}`)
        }

        const data = await response.json()
        setChartData(data.data || [])
        console.log("불러오는 중...")
      } catch (err) {
        console.error("과거 데이터 로드 실패:", err)
        console.log("불러오는 중...")
        // We don't set the main error here to avoid hiding the stock details
      } finally {
        setChartLoading(false)
      }
    }

    if (symbol) {
      fetchHistoricalData()
    }
  }, [symbol, timeframe])

  // 관심 종목 상태 확인
  useEffect(() => {
    const checkWatchlist = async () => {
      if (!session?.user) return

      setCheckingWatchlist(true)
      try {
        const response = await fetch(`/api/watchlist/check?symbol=${symbol}`)
        if (response.ok) {
          const data = await response.json()
          setIsInWatchlist(data.isInWatchlist)
        }
      } catch (err) {
        console.error("관심 종목 확인 실패:", err)
      } finally {
        setCheckingWatchlist(false)
      }
    }

    if (symbol && session?.user) {
      checkWatchlist()
    }
  }, [symbol, session])

  // 관심 종목 추가/제거 함수
  const toggleWatchlist = async () => {
    if (!session?.user) {
      toast({
        title: "로그인 필요",
        description: "관심 종목 기능을 사용하려면 로그인이 필요합니다.",
        variant: "destructive",
      })
      return
    }

    if (!stock) return

    setAddingToWatchlist(true)
    try {
      const endpoint = isInWatchlist ? "/api/watchlist/remove" : "/api/watchlist/add"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.shortName || stock.longName,
          isKoreanStock: stock.isKoreanStock || false,
        }),
      })

      if (response.ok) {
        setIsInWatchlist(!isInWatchlist)
        toast({
          title: isInWatchlist ? "관심 종목에서 제거됨" : "관심 종목에 추가됨",
          description: `${stock.shortName || stock.symbol}이(가) ${isInWatchlist ? "관심 종목에서 제거되었습니다." : "관심 종목에 추가되었습니다."}`,
        })
      } else {
        const error = await response.json()
        throw new Error(error.message || "요청 처리 중 오류가 발생했습니다.")
      }
    } catch (err: any) {
      toast({
        title: "오류 발생",
        description: err.message || "관심 종목 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setAddingToWatchlist(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="pl-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              모든 주식으로 돌아가기
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex flex-col items-end">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="pl-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              모든 주식으로 돌아가기
            </Button>
          </Link>
        </div>

        <div className="text-center py-10">
          <p className="text-red-500">{error || "주식을 찾을 수 없습니다"}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  // Calculate price change from first to last data point for the chart
  const firstPrice = chartData[0]?.price || 0
  const lastPrice = chartData[chartData.length - 1]?.price || 0
  const priceChange = Number.parseFloat((lastPrice - firstPrice).toFixed(2))
  const percentChange = Number.parseFloat(((priceChange / firstPrice) * 100).toFixed(2))

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            모든 주식으로 돌아가기
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant={isInWatchlist ? "default" : "outline"}
            size="sm"
            onClick={toggleWatchlist}
            disabled={checkingWatchlist || addingToWatchlist}
            className={isInWatchlist ? "bg-yellow-500 hover:bg-yellow-600" : ""}
          >
            <Star className={`h-4 w-4 mr-2 ${isInWatchlist ? "fill-white" : ""}`} />
            {isInWatchlist ? "관심 종목 제거" : "관심 종목 추가"}
          </Button>
          {/* <ThemeToggle /> */}
        </div>
      </div>

      <div className="grid gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-5xl font-bold">{stock.symbol}</h1>
            <p className="text-xl text-muted-foreground">{stock.shortName || stock.longName}</p>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-3xl font-bold">
              {!chartLoading && chartData.length > 0
                ? stock.isKoreanStock
                  ? formatKoreanCurrency(chartData[chartData.length - 1].price)
                  : formatUSDCurrency(chartData[chartData.length - 1].price)
                : stock.isKoreanStock
                  ? formatKoreanCurrency(stock.regularMarketPrice)
                  : formatUSDCurrency(stock.regularMarketPrice)}
            </div>
            <div
              className={`flex items-center ${!chartLoading && chartData.length > 0 ? (priceChange >= 0 ? "text-green-600" : "text-red-600") : stock.regularMarketChange >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {!chartLoading && chartData.length > 0 ? (
                priceChange >= 0 ? (
                  <ArrowUp className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 mr-1" />
                )
              ) : stock.regularMarketChange >= 0 ? (
                <ArrowUp className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDown className="h-4 w-4 mr-1" />
              )}
              <span className="font-medium">
                {!chartLoading && chartData.length > 0 ? (
                  <>
                    {priceChange >= 0 ? "+" : ""}
                    {priceChange.toFixed(2)} ({percentChange >= 0 ? "+" : ""}
                    {percentChange.toFixed(2)}%)
                  </>
                ) : (
                  <>
                    {stock.regularMarketChange >= 0 ? "+" : ""}
                    {stock.regularMarketChange.toFixed(2)} ({stock.regularMarketChange >= 0 ? "+" : ""}
                    {stock.regularMarketChangePercent.toFixed(2)}%)
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>가격 차트</CardTitle>
              <Tabs defaultValue="1개월" value={timeframe} onValueChange={setTimeframe}>
                <TabsList>
                  <TabsTrigger value="1일">1일</TabsTrigger>
                  <TabsTrigger value="1주">1주</TabsTrigger>
                  <TabsTrigger value="1개월">1개월</TabsTrigger>
                  <TabsTrigger value="3개월">3개월</TabsTrigger>
                  <TabsTrigger value="1년">1년</TabsTrigger>
                  <TabsTrigger value="5년">5년</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {!chartLoading && chartData.length > 0 && (
              <CardDescription className={priceChange >= 0 ? "text-green-600" : "text-red-600"}>
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)} ({percentChange >= 0 ? "+" : ""}
                {percentChange.toFixed(2)}%) {timeframe}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-[400px] w-full flex items-center justify-center">
                <p className="text-muted-foreground">이 기간에 대한 차트 데이터가 없습니다</p>
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey={timeframe === "1일" || timeframe === "1주" ? "time" : "date"}
                      tickFormatter={(value) => {
                        if (timeframe === "5년") {
                          return value.split("년")[0] + "년"
                        }
                        return value
                      }}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={(value) => (stock.isKoreanStock ? `${(value / 1000).toFixed(0)}천` : `$${value}`)}
                    />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip
                      formatter={(value: number) => [
                        stock.isKoreanStock ? formatKoreanCurrency(value) : formatUSDCurrency(value),
                        "가격",
                      ]}
                      labelFormatter={(label) => {
                        const dataPoint = chartData.find((d) => d.time === label || d.date === label)
                        return timeframe === "1일" || timeframe === "1주"
                          ? `${dataPoint?.date} ${dataPoint?.time}`
                          : `날짜: ${label}`
                      }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = chartData.find((d) => d.time === label || d.date === label)
                          const price = payload[0].value as number

                          return (
                            <div className="bg-background border border-border shadow-md rounded-md p-3">
                              <p className="font-medium">
                                {timeframe === "1일" || timeframe === "1주"
                                  ? `${dataPoint?.date} ${dataPoint?.time}`
                                  : `날짜: ${label}`}
                              </p>
                              <p className="text-lg font-bold mt-1">
                                {stock.isKoreanStock ? formatKoreanCurrency(price) : formatUSDCurrency(price)}
                                <span className="text-xs ml-1 text-muted-foreground">/ 주</span>
                              </p>
                              <p className="text-sm mt-1">거래량: {dataPoint?.volume.toLocaleString("ko-KR")}</p>
                              <p className="text-xs mt-2 text-blue-500">출처: Yahoo Finance</p>
                            </div>
                          )
                        }

                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={priceChange >= 0 ? "#10b981" : "#ef4444"}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>주식 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">시가총액</p>
                  <p className="font-medium">{stock.marketCap ? formatLargeNumber(stock.marketCap) : "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">거래량</p>
                  <p className="font-medium">{stock.regularMarketVolume.toLocaleString("ko-KR")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">산업</p>
                  <p className="font-medium">{stock.industry || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">52주 범위</p>
                  <p className="font-medium">
                    {stock.isKoreanStock
                      ? `${formatKoreanCurrency(stock.fiftyTwoWeekLow || 0)} - ${formatKoreanCurrency(stock.fiftyTwoWeekHigh || 0)}`
                      : `$${stock.fiftyTwoWeekLow?.toFixed(2) || "N/A"} - $${stock.fiftyTwoWeekHigh?.toFixed(2) || "N/A"}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>거래량</CardTitle>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : chartData.length === 0 ? (
                <div className="h-[200px] w-full flex items-center justify-center">
                  <p className="text-muted-foreground">이 기간에 대한 거래량 데이터가 없습니다</p>
                </div>
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={timeframe === "1일" || timeframe === "1주" ? "time" : "date"} />
                      <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}백만`} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toLocaleString("ko-KR")}`, "거래량"]}
                        labelFormatter={(label) => {
                          const dataPoint = chartData.find((d) => d.time === label || d.date === label)
                          return timeframe === "1일" || timeframe === "1주"
                            ? `${dataPoint?.date} ${dataPoint?.time}`
                            : `날짜: ${label}`
                        }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const dataPoint = chartData.find((d) => d.time === label || d.date === label)
                            const volume = payload[0].value as number

                            return (
                              <div className="bg-background border border-border shadow-md rounded-md p-3">
                                <p className="font-medium">
                                  {timeframe === "1일" || timeframe === "1주"
                                    ? `${dataPoint?.date} ${dataPoint?.time}`
                                    : `날짜: ${label}`}
                                </p>
                                <p className="text-lg font-bold mt-1">{volume.toLocaleString("ko-KR")}</p>
                                <p className="text-xs mt-2 text-blue-500">출처: Yahoo Finance</p>
                              </div>
                            )
                          }

                          return null
                        }}
                      />
                      <Bar dataKey="volume" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
