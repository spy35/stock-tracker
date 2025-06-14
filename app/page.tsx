"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Search, RefreshCw } from "lucide-react"
import { formatKoreanCurrency, formatUSDCurrency } from "@/lib/yahoo-finance"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Stock {
  symbol: string
  shortName: string
  longName: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  isKoreanStock?: boolean
  regularMarketTime?: number
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

interface PaginationData {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

// 배열을 지정된 크기의 청크로 나누는 유틸리티 함수
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

// 페이지네이션 관련 상수
const ITEMS_PER_PAGE = 20

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [stocks, setStocks] = useState<Stock[]>([])
  const [stockCharts, setStockCharts] = useState<Record<string, StockChartData>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(60000) // 1분
  const [refreshProgress, setRefreshProgress] = useState(0)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1,
  })

  // 검색어 디바운싱
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      // 검색어 변경 시 첫 페이지로 리셋
      setCurrentPage(1)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // 주식 데이터 가져오기 함수
  const fetchStocks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Encode the search term to handle Korean characters properly
      const encodedSearchTerm = encodeURIComponent(debouncedSearchTerm)
      const response = await fetch(
        `/api/stocks?page=${currentPage}&pageSize=${ITEMS_PER_PAGE}${debouncedSearchTerm ? `&query=${encodedSearchTerm}` : ""}`,
        {
          cache: "no-store",
        },
      )

      if (!response.ok) {
        throw new Error(`오류: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setStocks(data.stocks || [])
      setPagination(
        data.pagination || {
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
          totalItems: data.stocks?.length || 0,
          totalPages: Math.ceil((data.stocks?.length || 0) / ITEMS_PER_PAGE),
        },
      )

      // 주식 데이터를 가져온 후 차트 데이터도 가져오기
      if (data.stocks && data.stocks.length > 0) {
        console.log("불러오는 중...")
        fetchStockCharts(data.stocks.map((stock: Stock) => stock.symbol))
      }

      setLastUpdated(new Date())
    } catch (err) {
      console.error("주식 데이터 로드 실패:", err)
      setError("주식 데이터를 불러오는데 실패했습니다. 나중에 다시 시도해주세요.")
      console.log("불러오는 중...")
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearchTerm])

  // 주식 차트 데이터를 순차적으로 가져오기 함수
  const fetchStockCharts = useCallback(async (symbols: string[]) => {
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

          // 각 청크 처리 후 상태 업데이트
          setStockCharts(chartMap)

          // 주식 가격 데이터 업데이트
          setStocks((prevStocks) =>
            prevStocks.map((stock) => {
              const chartData = chartMap[stock.symbol]
              if (chartData && chartData.latestPrice) {
                return {
                  ...stock,
                  regularMarketPrice: chartData.latestPrice,
                  regularMarketChange: chartData.priceChange,
                  regularMarketChangePercent: chartData.percentChange,
                }
              }
              return stock
            }),
          )

          // 마지막 업데이트 시간 갱신
          setLastUpdated(new Date())

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
    } finally {
      setRefreshing(false)
      setRefreshProgress(100)
      // 잠시 후 프로그레스 바 숨기기
      setTimeout(() => setRefreshProgress(0), 1000)
    }
  }, [])

  // 수동 새로고침 함수
  const handleRefresh = useCallback(() => {
    if (stocks.length > 0) {
      fetchStockCharts(stocks.map((stock) => stock.symbol))
    } else {
      fetchStocks()
    }
  }, [fetchStocks, fetchStockCharts, stocks])

  // 자동 새로고침 토글 함수
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev)
  }, [])

  // 페이지 변경 핸들러
  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > pagination.totalPages) return
      setCurrentPage(page)
    },
    [pagination.totalPages],
  )

  // 검색어 또는 페이지 변경 시 데이터 가져오기
  useEffect(() => {
    fetchStocks()
  }, [fetchStocks, currentPage, debouncedSearchTerm])

  // 자동 새로고침 설정
  useEffect(() => {
    // 이전 인터벌 정리
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    // 자동 새로고침이 활성화된 경우에만 인터벌 설정
    if (autoRefresh && stocks.length > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchStockCharts(stocks.map((stock) => stock.symbol))
      }, refreshInterval)
    }

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, fetchStockCharts, stocks])

  // 마지막 업데이트 시간 포맷팅
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // 페이지네이션 렌더링 함수
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null

    // 페이지 번호 배열 생성
    const pageNumbers = []

    // 현재 페이지 주변 페이지 번호만 표시 (최대 5개)
    const maxPagesToShow = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    const endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1)

    // 시작 페이지 조정
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(currentPage - 1)
              }}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>

          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange(1)
                  }}
                  isActive={currentPage === 1}
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  handlePageChange(page)
                }}
                isActive={currentPage === page}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {endPage < pagination.totalPages && (
            <>
              {endPage < pagination.totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange(pagination.totalPages)
                  }}
                  isActive={currentPage === pagination.totalPages}
                >
                  {pagination.totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(currentPage + 1)
              }}
              className={currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-5xl font-bold">주식 트래커</h1>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-2">마지막 업데이트: {formatLastUpdated()}</div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAutoRefresh}
                  className={autoRefresh ? "bg-green-50 dark:bg-green-950" : ""}
                >
                  {autoRefresh ? "자동 갱신 켜짐" : "자동 갱신 꺼짐"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{autoRefresh ? "자동 갱신을 끄려면 클릭하세요" : "자동 갱신을 켜려면 클릭하세요"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  className="relative"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>수동으로 새로고침</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="종목 코드 또는 회사명으로 검색 (예: 삼성전자, AAPL)"
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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

      {/* 페이지 정보 표시 */}
      {!loading && stocks.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            총 {pagination.totalItems}개 종목 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, pagination.totalItems)}개 표시
          </div>
          <div className="text-sm">
            페이지 {currentPage} / {pagination.totalPages}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Card key={index} className="h-full">
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-20 mb-2" />
                <Skeleton className="h-4 w-40 mb-4" />
              </CardContent>
              <CardFooter className="pt-0">
                <div className="w-full flex justify-between items-center">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
            다시 시도
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stocks.map((stock) => {
              const chartData = stockCharts[stock.symbol]
              const priceChange = chartData ? chartData.priceChange : stock.regularMarketChange
              const percentChange = chartData ? chartData.percentChange : stock.regularMarketChangePercent
              const isPositive = priceChange >= 0

              return (
                <Link href={`/stock/${stock.symbol}`} key={stock.symbol}>
                  <Card className={`h-full hover:shadow-md transition-shadow ${refreshing ? "animate-pulse" : ""}`}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold">{stock.symbol}</h2>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {stock.shortName || stock.longName}
                          </p>
                        </div>
                        <div className={`flex items-center ${isPositive ? "text-green-600" : "text-red-600"}`}>
                          {isPositive ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                          <span className="font-medium">
                            {percentChange >= 0 ? "+" : ""}
                            {percentChange.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="w-full flex justify-between items-center">
                        <span className="text-2xl font-bold">
                          {stock.isKoreanStock
                            ? formatKoreanCurrency(stock.regularMarketPrice)
                            : formatUSDCurrency(stock.regularMarketPrice)}
                          <span className="text-xs ml-1 text-gray-500">/ 주</span>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          거래량: {(stock.regularMarketVolume / 1000000).toFixed(1)}백만
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              )
            })}

            {stocks.length === 0 && (
              <div className="col-span-full text-center py-10">
                <p className="text-muted-foreground">검색 결과가 없습니다.</p>
                <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
                  검색 초기화
                </Button>
              </div>
            )}
          </div>

          {/* 페이지네이션 컴포넌트 */}
          {renderPagination()}
        </>
      )}
    </div>
  )
}
