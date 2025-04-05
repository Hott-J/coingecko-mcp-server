# CoinGecko MCP Server

MCP Server for the CoinGecko Cryptocurrency API.

## Tools

1. `coingecko_price`
   - Get current price data for cryptocurrencies
   - Inputs:
     - `ids` (string[]): List of coin IDs (e.g., bitcoin, ethereum)
     - `vs_currencies` (string[]): List of currencies to compare against (e.g., usd, eur)
     - `include_market_cap` (boolean, optional): Include market cap data
     - `include_24hr_vol` (boolean, optional): Include 24hr volume data
     - `include_24hr_change` (boolean, optional): Include 24hr price change data
   - Returns: Price data for requested coins in specified currencies

2. `coingecko_list`
   - Get list of all supported coins with ids, names, and symbols
   - Inputs:
     - `include_platform` (boolean, optional): Include platform contract addresses
   - Returns: Array of coin data with id, symbol, and name

3. `coingecko_coin_data`
   - Get current data for a coin (price, market, volume, etc.)
   - Inputs:
     - `id` (string): Coin ID (e.g., bitcoin, ethereum)
     - `vs_currencies` (string[], optional): List of currencies to get price data in (default: ["usd"])
   - Returns: Detailed coin data including price, market info, and metadata

4. `coingecko_trending`
   - Get trending coins on CoinGecko in the last 24 hours
   - Returns: List of trending coins with metadata

## Setup

### Usage with Claude Desktop

Add the following to your `claude_desktop_config.json`:

#### Docker

```json
{
  "mcpServers": {
    "coingecko": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "mcp/coingecko"
      ]
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "coingecko": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-coingecko"
      ]
    }
  }
}
```

## Build

Docker build:

```bash
docker build -t mcp/coingecko -f src/coingecko/Dockerfile .
```

## License

This MCP server is licensed under the MIT License.
