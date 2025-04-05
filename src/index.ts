#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { TcpServerTransport } from "@modelcontextprotocol/sdk/server/tcp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// 타입 정의
type SuccessfulSimplePrice = { [coinId: string]: { [currency: string]: number } };
type FailedPriceResponse = { error: string; success?: boolean };
type SimplePrice = SuccessfulSimplePrice | FailedPriceResponse;

type CoinList = {
  id: string;
  symbol: string;
  name: string;
}[];

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  description: {
    [lang: string]: string;
  };
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data: {
    current_price: Record<string, number>;
    market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
  };
  last_updated: string;
}

interface TrendingCoins {
  coins: {
    item: {
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number;
      thumb: string;
      small: string;
      large: string;
      score: number;
    };
  }[];
}

// Tool 정의
const SIMPLE_PRICE_TOOL: Tool = {
  name: "coingecko_price",
  description: "Get current price data for cryptocurrencies",
  inputSchema: {
    type: "object",
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        description: "List of coin IDs (e.g., bitcoin, ethereum, etc.)"
      },
      vs_currencies: {
        type: "array",
        items: { type: "string" },
        description: "List of currencies to compare against (e.g., usd, eur, etc.)"
      },
      include_market_cap: {
        type: "boolean",
        description: "Include market cap data",
        default: false
      },
      include_24hr_vol: {
        type: "boolean",
        description: "Include 24hr volume data",
        default: false
      },
      include_24hr_change: {
        type: "boolean",
        description: "Include 24hr price change data",
        default: false
      }
    },
    required: ["ids", "vs_currencies"]
  }
};

const COIN_LIST_TOOL: Tool = {
  name: "coingecko_list",
  description: "Get list of all supported coins with ids, names, and symbols",
  inputSchema: {
    type: "object",
    properties: {
      include_platform: {
        type: "boolean",
        description: "Include platform contract addresses (e.g., for tokens on Ethereum)",
        default: false
      }
    }
  }
};

const COIN_DATA_TOOL: Tool = {
  name: "coingecko_coin_data",
  description: "Get current data for a coin (price, market, volume, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Coin ID (e.g., bitcoin, ethereum)"
      },
      vs_currencies: {
        type: "array",
        items: { type: "string" },
        description: "List of currencies to get price data in (e.g., usd, eur, etc.)",
        default: ["usd"]
      }
    },
    required: ["id"]
  }
};

const TRENDING_COINS_TOOL: Tool = {
  name: "coingecko_trending",
  description: "Get trending coins on CoinGecko in the last 24 hours",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

const COINGECKO_TOOLS = [
  SIMPLE_PRICE_TOOL,
  COIN_LIST_TOOL,
  COIN_DATA_TOOL,
  TRENDING_COINS_TOOL,
] as const;

// API 핸들러

async function handleSimplePrice(
  ids: string[],
  vs_currencies: string[],
  include_market_cap = false,
  include_24hr_vol = false,
  include_24hr_change = false
) {
  try {
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.append("ids", ids.join(","));
    url.searchParams.append("vs_currencies", vs_currencies.join(","));
    if (include_market_cap) url.searchParams.append("include_market_cap", "true");
    if (include_24hr_vol) url.searchParams.append("include_24hr_vol", "true");
    if (include_24hr_change) url.searchParams.append("include_24hr_change", "true");

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      return {
        content: [{
          type: "text",
          text: `CoinGecko API Error: ${errorData.error || response.statusText}`
        }],
        isError: true
      };
    }

    const data = await response.json() as SimplePrice;
    return {
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

async function handleCoinList(include_platform = false) {
  try {
    const url = new URL("https://api.coingecko.com/api/v3/coins/list");
    if (include_platform) url.searchParams.append("include_platform", "true");

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      return {
        content: [{
          type: "text",
          text: `CoinGecko API Error: ${errorData.error || response.statusText}`
        }],
        isError: true
      };
    }

    const data = await response.json() as CoinList;
    return {
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

async function handleCoinData(id: string, vs_currencies: string[] = ["usd"]) {
  try {
    const url = new URL(`https://api.coingecko.com/api/v3/coins/${id}`);
    url.searchParams.append("localization", "false");
    url.searchParams.append("tickers", "false");
    url.searchParams.append("market_data", "true");
    url.searchParams.append("community_data", "false");
    url.searchParams.append("developer_data", "false");
    url.searchParams.append("sparkline", "false");

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      return {
        content: [{
          type: "text",
          text: `CoinGecko API Error: ${errorData.error || response.statusText}`
        }],
        isError: true
      };
    }

    const data = await response.json() as CoinData;

    const price = data.market_data.current_price;
    const marketCap = data.market_data.market_cap;
    const volume = data.market_data.total_volume;
    const high = data.market_data.high_24h;
    const low = data.market_data.low_24h;

    const filteredData = {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      description: data.description.en,
      image: data.image,
      market_data: {
        current_price: {} as Record<string, number>,
        market_cap: {} as Record<string, number>,
        total_volume: {} as Record<string, number>,
        high_24h: {} as Record<string, number>,
        low_24h: {} as Record<string, number>,
        price_change_percentage_24h: data.market_data.price_change_percentage_24h,
        price_change_percentage_7d: data.market_data.price_change_percentage_7d,
        price_change_percentage_30d: data.market_data.price_change_percentage_30d
      },
      last_updated: data.last_updated
    };

    for (const currency of vs_currencies) {
      if (price[currency]) {
        filteredData.market_data.current_price[currency] = price[currency];
        filteredData.market_data.market_cap[currency] = marketCap[currency];
        filteredData.market_data.total_volume[currency] = volume[currency];
        filteredData.market_data.high_24h[currency] = high[currency];
        filteredData.market_data.low_24h[currency] = low[currency];
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(filteredData, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

async function handleTrendingCoins() {
  try {
    const url = new URL("https://api.coingecko.com/api/v3/search/trending");

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      return {
        content: [{
          type: "text",
          text: `CoinGecko API Error: ${errorData.error || response.statusText}`
        }],
        isError: true
      };
    }

    const data = await response.json() as TrendingCoins;

    return {
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// MCP Server 설정
const server = new Server(
  {
    name: "mcp-server/coingecko",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// 툴 요청 핸들러
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: COINGECKO_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  try {
    const requestParams = request.params.arguments as any;
    switch (request.params.name) {
      case "coingecko_price":
        return await handleSimplePrice(
          requestParams.ids,
          requestParams.vs_currencies,
          requestParams.include_market_cap,
          requestParams.include_24hr_vol,
          requestParams.include_24hr_change
        );
      case "coingecko_list":
        return await handleCoinList(requestParams.include_platform);
      case "coingecko_coin_data":
        return await handleCoinData(
          requestParams.id,
          requestParams.vs_currencies
        );
      case "coingecko_trending":
        return await handleTrendingCoins();
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function runServer() {
  const transport = new TcpServerTransport({ port: 3000 });
  await server.connect(transport);
  console.error("CoinGecko MCP Server running on TCP port 3000");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
