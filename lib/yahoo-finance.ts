// Yahoo Finance API helper functions with mock data fallback
import { popularStockSymbols, koreanCompanyNames, koreanSectors, koreanIndustries } from "./stock-symbols"

// Cache for consistent mock data across the application
const mockDataCache: Record<string, any> = {}

// Mock data generator functions
function generateMockPrice(base: number, symbol: string) {
  // Use a deterministic approach based on symbol to ensure consistency
  const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const randomSeed = (hash % 100) / 1000
  return +(base + base * randomSeed).toFixed(2)
}

function generateMockChange(currentPrice: number, previousPrice: number) {
  const change = +(currentPrice - previousPrice).toFixed(2)
  const changePercent = +((change / previousPrice) * 100).toFixed(2)
  return { change, changePercent }
}

function generateMockHistoricalData(symbol: string, timeframe: string) {
  // Check if we already have cached data for this symbol and timeframe
  const cacheKey = `${symbol}_${timeframe}_history`
  if (mockDataCache[cacheKey]) {
    return mockDataCache[cacheKey]
  }

  const basePrice = getBasePrice(symbol)
  const points = getPointsForTimeframe(timeframe)
  const volatility = getVolatilityForSymbol(symbol)

  const now = new Date()
  const data = []

  // Use a deterministic seed based on the symbol for consistent randomness
  const symbolSeed = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  let currentPrice = basePrice

  for (let i = points; i >= 0; i--) {
    const pointDate = new Date(now)

    // Adjust date based on timeframe
    if (timeframe === "1일") {
      pointDate.setMinutes(now.getMinutes() - i * 5)
    } else if (timeframe === "1주") {
      pointDate.setHours(now.getHours() - i * 4)
    } else if (timeframe === "1개월") {
      pointDate.setDate(now.getDate() - i)
    } else if (timeframe === "3개월") {
      pointDate.setDate(now.getDate() - i * 3)
    } else if (timeframe === "1년") {
      pointDate.setDate(now.getDate() - i * 7)
    } else if (timeframe === "5년") {
      pointDate.setMonth(now.getMonth() - i * 2)
    }

    // Generate price with some randomness but following a trend
    // Use a deterministic approach based on symbol and index
    const randomFactor = Math.sin(symbolSeed + i) * volatility
    currentPrice = Math.max(0.01, currentPrice * (1 + randomFactor))

    // Generate volume
    const volume = Math.floor((Math.sin(symbolSeed + i * 2) + 1.1) * 5000000) + 100000

    data.push({
      date: formatKoreanDate(pointDate),
      time: pointDate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      price: +currentPrice.toFixed(2),
      volume,
    })
  }

  // Cache the generated data
  mockDataCache[cacheKey] = data
  return data
}

function formatKoreanDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

function getBasePrice(symbol: string) {
  // Generate consistent prices for specific symbols
  const symbolMap: Record<string, number> = {
    "005930.KS": 72500, // Samsung Electronics
    "000660.KS": 135000, // SK Hynix
    "051910.KS": 580000, // LG Chem
    "035420.KS": 213000, // NAVER
    "005380.KS": 185000, // Hyundai Motor
    "000270.KS": 87500, // Kia
    "068270.KS": 176000, // Celltrion
    "035720.KS": 47500, // Kakao
    "207940.KS": 780000, // Samsung Biologics
    "006400.KS": 710000, // Samsung SDI
    AAPL: 175.5,
    MSFT: 380.2,
    GOOGL: 142.75,
    AMZN: 178.3,
    META: 480.15,
    TSLA: 175.4,
    NVDA: 880.25,
  }

  // If we don't have a predefined price, generate a consistent one based on the symbol
  if (!symbolMap[symbol]) {
    const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return 50 + (hash % 200)
  }

  return symbolMap[symbol]
}

function getPointsForTimeframe(timeframe: string) {
  switch (timeframe) {
    case "1일":
      return 78 // 5-minute intervals for 6.5 hours
    case "1주":
      return 32 // 15-minute intervals for 5 days
    case "1개월":
      return 30 // daily for a month
    case "3개월":
      return 90 // daily for 3 months
    case "1년":
      return 52 // weekly for a year
    case "5년":
      return 60 // monthly for 5 years
    default:
      return 30
  }
}

function getVolatilityForSymbol(symbol: string) {
  // Some stocks are more volatile than others
  const volatilityMap: Record<string, number> = {
    TSLA: 0.03,
    NVDA: 0.025,
    AAPL: 0.01,
    MSFT: 0.01,
    GOOGL: 0.015,
    AMZN: 0.02,
    META: 0.018,
    "005930.KS": 0.01, // Samsung Electronics
    "000660.KS": 0.02, // SK Hynix
    "051910.KS": 0.015, // LG Chem
  }

  return volatilityMap[symbol] || 0.015
}

// Generate mock stock data
export function generateMockStockData(symbols: string[]) {
  return symbols.map((symbol) => {
    // Check if we already have cached data for this symbol
    const cacheKey = `${symbol}_stock`
    if (mockDataCache[cacheKey]) {
      return mockDataCache[cacheKey]
    }

    const basePrice = getBasePrice(symbol)
    // Use deterministic price generation
    const currentPrice = generateMockPrice(basePrice, symbol)
    const previousClose = generateMockPrice(basePrice * 0.98, symbol + "prev")
    const { change, changePercent } = generateMockChange(currentPrice, previousClose)
    const isKoreanStock = symbol.includes(".KS")

    // Generate a deterministic volume based on the symbol
    const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const volume = 100000 + (hash % 10) * 1000000

    // Generate a deterministic market cap
    const marketCap = currentPrice * (10000000 + (hash % 100) * 1000000000)

    const stockData = {
      symbol,
      shortName: getCompanyName(symbol),
      longName: getCompanyName(symbol),
      regularMarketPrice: currentPrice,
      regularMarketPreviousClose: previousClose,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      regularMarketVolume: volume,
      marketCap: marketCap,
      fiftyTwoWeekLow: basePrice * 0.7,
      fiftyTwoWeekHigh: basePrice * 1.3,
      sector: getSector(symbol),
      industry: getIndustry(symbol),
      isKoreanStock,
    }

    // Cache the generated data
    mockDataCache[cacheKey] = stockData
    return stockData
  })
}

function getCompanyName(symbol: string) {
  // Return Korean company name if available
  if (koreanCompanyNames[symbol]) {
    return koreanCompanyNames[symbol]
  }

  // Default English company names
  const companyNames: Record<string, string> = {
    AAPL: "Apple Inc.",
    MSFT: "Microsoft Corporation",
    GOOGL: "Alphabet Inc.",
    AMZN: "Amazon.com, Inc.",
    META: "Meta Platforms, Inc.",
    TSLA: "Tesla, Inc.",
    NVDA: "NVIDIA Corporation",
    JPM: "JPMorgan Chase & Co.",
    V: "Visa Inc.",
    JNJ: "Johnson & Johnson",
    WMT: "Walmart Inc.",
    PG: "Procter & Gamble Company",
    MA: "Mastercard Incorporated",
    UNH: "UnitedHealth Group Incorporated",
    HD: "The Home Depot, Inc.",
    BAC: "Bank of America Corporation",
    XOM: "Exxon Mobil Corporation",
    PFE: "Pfizer Inc.",
    CSCO: "Cisco Systems, Inc.",
    VZ: "Verizon Communications Inc.",
    NFLX: "Netflix, Inc.",
    ADBE: "Adobe Inc.",
    CRM: "Salesforce, Inc.",
    INTC: "Intel Corporation",
    CMCSA: "Comcast Corporation",
  }

  return companyNames[symbol] || `${symbol} Corporation`
}

function getSector(symbol: string) {
  const sectors = [
    "Technology",
    "Healthcare",
    "Financial Services",
    "Consumer Cyclical",
    "Communication Services",
    "Industrials",
    "Consumer Defensive",
    "Energy",
    "Basic Materials",
    "Real Estate",
    "Utilities",
  ]

  // Consistent sector for specific symbols
  const sectorMap: Record<string, string> = {
    "005930.KS": "Technology",
    "000660.KS": "Technology",
    "051910.KS": "Basic Materials",
    "035420.KS": "Communication Services",
    "005380.KS": "Consumer Cyclical",
    "000270.KS": "Consumer Cyclical",
    "068270.KS": "Healthcare",
    "035720.KS": "Communication Services",
    "207940.KS": "Healthcare",
    "006400.KS": "Technology",
    "055550.KS": "Financial Services",
    "105560.KS": "Financial Services",
    AAPL: "Technology",
    MSFT: "Technology",
    GOOGL: "Communication Services",
    AMZN: "Consumer Cyclical",
    META: "Communication Services",
    TSLA: "Consumer Cyclical",
    NVDA: "Technology",
    JPM: "Financial Services",
    JNJ: "Healthcare",
    XOM: "Energy",
  }

  // If we don't have a predefined sector, use a deterministic approach
  if (!sectorMap[symbol]) {
    const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const sectorIndex = hash % sectors.length
    return koreanSectors[sectors[sectorIndex]] || sectors[sectorIndex]
  }

  const sector = sectorMap[symbol]
  // Return Korean sector name if available
  return koreanSectors[sector] || sector
}

function getIndustry(symbol: string) {
  const industries = {
    Technology: ["Software", "Semiconductors", "Hardware", "IT Services"],
    Healthcare: ["Pharmaceuticals", "Medical Devices", "Biotechnology", "Healthcare Services"],
    "Financial Services": ["Banks", "Insurance", "Asset Management", "Financial Technology"],
    "Consumer Cyclical": ["Retail", "Automotive", "Entertainment", "Hospitality"],
    "Communication Services": ["Telecom", "Media", "Social Media", "Entertainment"],
    Industrials: ["Aerospace", "Defense", "Machinery", "Transportation"],
    "Consumer Defensive": ["Food", "Beverages", "Household Products", "Personal Products"],
    Energy: ["Oil & Gas", "Renewable Energy", "Energy Equipment", "Energy Services"],
    "Basic Materials": ["Chemicals", "Metals & Mining", "Paper & Forest Products", "Construction Materials"],
    "Real Estate": ["REITs", "Real Estate Services", "Development", "Property Management"],
    Utilities: ["Electric Utilities", "Gas Utilities", "Water Utilities", "Renewable Utilities"],
  }

  const industryMap: Record<string, string> = {
    "005930.KS": "Semiconductors",
    "000660.KS": "Semiconductors",
    "051910.KS": "Chemicals",
    "035420.KS": "Internet Content & Information",
    "005380.KS": "Automotive",
    "000270.KS": "Automotive",
    "068270.KS": "Biotechnology",
    "035720.KS": "Internet Content & Information",
    "207940.KS": "Biotechnology",
    "006400.KS": "Electronic Components",
    "055550.KS": "Banks",
    "105560.KS": "Banks",
    AAPL: "Consumer Electronics",
    MSFT: "Software-Infrastructure",
    GOOGL: "Internet Content & Information",
    AMZN: "Internet Retail",
    META: "Internet Content & Information",
    TSLA: "Auto Manufacturers",
    NVDA: "Semiconductors",
    JPM: "Banks-Diversified",
    JNJ: "Drug Manufacturers-General",
    XOM: "Oil & Gas Integrated",
  }

  let industry = industryMap[symbol]

  if (!industry) {
    const sector = getSector(symbol)
    const sectorIndustries = industries[sector as keyof typeof industries] || industries["Technology"]

    // Use a deterministic approach to select an industry
    const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const industryIndex = hash % sectorIndustries.length
    industry = sectorIndustries[industryIndex]
  }

  // Return Korean industry name if available
  return koreanIndustries[industry] || industry
}

// Function to fetch stock quotes for multiple symbols
export async function fetchStockQuotes(symbols: string[]) {
  try {
    // 참고: https://github.com/ranaroussi/yfinance/issues/1592
    // 참고: https://stackoverflow.com/questions/47245376/getting-301-error-when-making-http-get-requests-using-c-sockets
    // 적절한 User-Agent와 Accept 헤더 추가
    const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://finance.yahoo.com/",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      next: { revalidate: 60 }, // Revalidate every minute
    })

    if (!response.ok) {
      console.warn(`Yahoo Finance API returned ${response.status}. Falling back to mock data.`)
      console.warn("불러오는 중...")
      return generateMockStockData(symbols)
    }

    const data = await response.json()

    // Add isKoreanStock flag to real data
    const stockData = data.quoteResponse.result.map((stock: any) => ({
      ...stock,
      isKoreanStock: stock.symbol.includes(".KS"),
    }))

    return stockData
  } catch (error) {
    console.warn("Error fetching stock quotes, using mock data instead:", error)
    console.warn("불러오는 중...")
    return generateMockStockData(symbols)
  }
}

// 최신 가격만 효율적으로 가져오는 함수
export async function fetchLatestPrices(symbols: string[]) {
  try {
    // 참고: https://github.com/ranaroussi/yfinance/issues/1592
    // 참고: https://stackoverflow.com/questions/47245376/getting-301-error-when-making-http-get-requests-using-c-sockets
    // 적절한 User-Agent와 Accept 헤더 추가
    const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://finance.yahoo.com/",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      next: { revalidate: 0 }, // 캐시 사용 안함
    })

    if (!response.ok) {
      console.warn(`Yahoo Finance API returned ${response.status}. Falling back to mock data.`)
      console.warn("불러오는 중...")
      return generateLatestPrices(symbols)
    }

    const data = await response.json()

    // 필요한 데이터만 추출하여 경량화
    const latestPrices = data.quoteResponse.result.map((stock: any) => ({
      symbol: stock.symbol,
      regularMarketPrice: stock.regularMarketPrice,
      regularMarketChange: stock.regularMarketChange,
      regularMarketChangePercent: stock.regularMarketChangePercent,
      regularMarketTime: stock.regularMarketTime,
      isKoreanStock: stock.symbol.includes(".KS"),
    }))

    return latestPrices
  } catch (error) {
    console.warn("Error fetching latest prices, using mock data instead:", error)
    console.warn("불러오는 중...")
    return generateLatestPrices(symbols)
  }
}

// 모의 최신 가격 데이터 생성 함수
function generateLatestPrices(symbols: string[]) {
  return symbols.map((symbol) => {
    // 기존 모의 데이터 생성 로직 활용
    const basePrice = getBasePrice(symbol)
    const currentPrice = generateMockPrice(basePrice, symbol)
    const previousClose = generateMockPrice(basePrice * 0.98, symbol + "prev")
    const { change, changePercent } = generateMockChange(currentPrice, previousClose)
    const isKoreanStock = symbol.includes(".KS")

    return {
      symbol,
      regularMarketPrice: currentPrice,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      regularMarketTime: Math.floor(Date.now() / 1000),
      isKoreanStock,
    }
  })
}

// Function to fetch historical data for a specific symbol
export async function fetchHistoricalData(symbol: string, interval: string, range: string) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          Referer: "https://finance.yahoo.com/",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
        next: { revalidate: 60 }, // Revalidate every minute
      },
    )

    if (!response.ok) {
      console.warn(`Yahoo Finance API returned ${response.status} for historical data. Falling back to mock data.`)
      console.warn("불러오는 중...")
      const timeframe = mapYahooIntervalToTimeframe(interval, range)
      return { mockData: generateMockHistoricalData(symbol, timeframe) }
    }

    const data = await response.json()
    return data.chart.result[0]
  } catch (error) {
    console.warn("Error fetching historical data, using mock data instead:", error)
    console.warn("불러오는 중...")
    const timeframe = mapYahooIntervalToTimeframe(interval, range)
    return { mockData: generateMockHistoricalData(symbol, timeframe) }
  }
}

// Function to search for stocks
export async function searchStocks(query: string) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          Referer: "https://finance.yahoo.com/",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      },
    )

    if (!response.ok) {
      console.warn(`Yahoo Finance API returned ${response.status} for search. Falling back to filtered symbols.`)
      return filterSymbolsByQuery(query)
    }

    const data = await response.json()
    return data.quotes
  } catch (error) {
    console.warn("Error searching stocks, using filtered symbols instead:", error)
    return filterSymbolsByQuery(query)
  }
}

function filterSymbolsByQuery(query: string) {
  const lowercaseQuery = query.toLowerCase()

  // Check if query contains Korean characters
  const hasKoreanChar = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/.test(query)

  // Search in both symbol and Korean company names
  return popularStockSymbols
    .map((symbol) => {
      const companyName = koreanCompanyNames[symbol] || getCompanyName(symbol)
      const isKoreanStock = symbol.includes(".KS")

      // Calculate match score
      let score = 0

      // Exact symbol match gets highest score
      if (symbol.toLowerCase() === lowercaseQuery) {
        score = 10
      }
      // Symbol contains query
      else if (symbol.toLowerCase().includes(lowercaseQuery)) {
        score = 5
      }

      // Company name exact match
      if (companyName.toLowerCase() === lowercaseQuery) {
        score += 8
      }
      // Company name contains query
      else if (companyName.toLowerCase().includes(lowercaseQuery)) {
        score += 4
      }

      // Boost Korean stocks if searching in Korean
      if (hasKoreanChar && isKoreanStock) {
        score += 2
      }

      return {
        symbol,
        shortName: koreanCompanyNames[symbol] || getCompanyName(symbol),
        score,
      }
    })
    .filter((item) => item.score > 0) // Only include items with a match
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, 20) // Limit to 20 results
}

// Map timeframe to Yahoo Finance interval
export function mapTimeframeToYahooInterval(timeframe: string): { interval: string; range: string } {
  switch (timeframe) {
    case "1일":
      return { interval: "5m", range: "1d" }
    case "1주":
      return { interval: "15m", range: "5d" }
    case "1개월":
      return { interval: "1d", range: "1mo" }
    case "3개월":
      return { interval: "1d", range: "3mo" }
    case "1년":
      return { interval: "1wk", range: "1y" }
    case "5년":
      return { interval: "1mo", range: "5y" }
    default:
      return { interval: "1d", range: "1mo" }
  }
}

// Map Yahoo interval back to our timeframe
function mapYahooIntervalToTimeframe(interval: string, range: string): string {
  if (interval === "5m" && range === "1d") return "1일"
  if (interval === "15m" && range === "5d") return "1주"
  if (interval === "1d" && range === "1mo") return "1개월"
  if (interval === "1d" && range === "3mo") return "3개월"
  if (interval === "1wk" && range === "1y") return "1년"
  if (interval === "1mo" && range === "5y") return "5년"
  return "1개월" // Default
}

// Format historical data for charts
export function formatHistoricalData(data: any) {
  // Check if we're using mock data
  if (data.mockData) {
    return data.mockData
  }

  if (!data || !data.timestamp || !data.indicators || !data.indicators.quote) {
    return []
  }

  const { timestamp, indicators } = data
  const quotes = indicators.quote[0]

  return timestamp.map((time: number, index: number) => {
    const date = new Date(time * 1000)
    return {
      date: formatKoreanDate(date),
      time: date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      price: quotes.close[index] || quotes.open[index] || 0,
      volume: quotes.volume[index] || 0,
    }
  })
}

// Clear the mock data cache (useful for testing)
export function clearMockDataCache() {
  Object.keys(mockDataCache).forEach((key) => {
    delete mockDataCache[key]
  })
}

// Format number as Korean currency
export function formatKoreanCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value)
}

// Format number as US currency
export function formatUSDCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

// Format large numbers in Korean style
export function formatLargeNumber(value: number): string {
  if (value >= 1000000000000) {
    return `${(value / 1000000000000).toFixed(2)}조`
  } else if (value >= 100000000) {
    return `${(value / 100000000).toFixed(2)}억`
  } else if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}만`
  } else {
    return value.toLocaleString("ko-KR")
  }
}

// Export popular stock symbols
export { popularStockSymbols }
