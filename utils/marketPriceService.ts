// Remove mock prices - we're using real API data now
// import { MOCK_PRICES, MOCK_PRICES_BY_NAME } from '@/data/mockPrices';

type PriceData = {
  price: number;
  timestamp: number;
};

type PriceCache = {
  [itemId: number]: PriceData;
};

class MarketPriceService {
  private cache: PriceCache = {};
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_DURATION;
  }

  /**
   * 캐시를 무효화해야 하는 시간대인지 확인 (한국 시간 기준)
   * - 평소(월~일): 오전 06:00~06:59
   * - 수요일: 오전 10:00~10:59
   */
  private shouldBypassCache(): boolean {
    const now = new Date();
    // 한국 시간(KST, UTC+9) 계산
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = now.getTime() + kstOffset;
    const kstDate = new Date(kstTime);

    const kstHour = kstDate.getUTCHours(); // KST 시간
    const kstDay = kstDate.getUTCDay(); // 0=일요일, 3=수요일

    // 수요일(3) 오전 10시~10시 59분
    if (kstDay === 3 && kstHour === 10) {
      console.log('[Cache Bypass] 수요일 오전 10시대 - 캐시 무시');
      return true;
    }

    // 평소 오전 6시~6시 59분
    if (kstHour === 6) {
      console.log('[Cache Bypass] 오전 6시대 - 캐시 무시');
      return true;
    }

    return false;
  }

  async getItemPrice(itemId: number): Promise<number> {
    console.log(`Getting recent price for item ID: ${itemId}`);

    // 특정 시간대에는 캐시 무시
    const bypassCache = this.shouldBypassCache();

    // Check if we have cached data that's still valid
    const cachedData = this.cache[itemId];
    if (!bypassCache && cachedData && !this.isExpired(cachedData.timestamp)) {
      console.log(`Using cached recent price for ${itemId}: ${cachedData.price}`);
      return cachedData.price;
    }

    try {
      console.log(`Fetching recent price from API for item ${itemId}`);
      // Use current price API that prioritizes CurrentMinPrice
      const response = await fetch('/api/market/search-current-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: parseInt(itemId.toString()) })
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch recent price for item ${itemId}:`, response.status, response.statusText);
        // Fallback to old API
        const fallbackResponse = await fetch(`/api/market/price?itemId=${itemId}`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.averagePrice || cachedData?.price || 0;
        }
        return cachedData?.price || 0;
      }

      const data = await response.json();
      console.log(`Recent price API response for ${itemId}:`, data);
      
      let price = data.price || 0;
      
      console.log(`Extracted recent price for ${itemId}: ${price}`);

      // Update cache
      this.cache[itemId] = {
        price,
        timestamp: Date.now()
      };

      return price;
    } catch (error) {
      console.error(`Error fetching recent price for item ${itemId}:`, error);
      // Fallback to old API
      try {
        const fallbackResponse = await fetch(`/api/market/price?itemId=${itemId}`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackPrice = fallbackData.averagePrice || 0;
          
          // Update cache with fallback data
          if (fallbackPrice > 0) {
            this.cache[itemId] = {
              price: fallbackPrice,
              timestamp: Date.now()
            };
          }
          
          return fallbackPrice;
        }
      } catch (fallbackError) {
        console.error(`Fallback API also failed for item ${itemId}:`, fallbackError);
      }
      
      return cachedData?.price || 0;
    }
  }

  async getItemPriceByName(itemName: string): Promise<number> {
    // Convert UI display name to actual market item name for search
    let searchItemName = itemName;
    if (itemName === '운명의 파편') {
      searchItemName = '운명의 파편 주머니(소)';
    }

    // 특정 시간대에는 캐시 무시
    const bypassCache = this.shouldBypassCache();

    const cacheKey = `search_${searchItemName}`;
    const cachedData = this.cache[cacheKey as any];
    if (!bypassCache && cachedData && !this.isExpired(cachedData.timestamp)) {
      console.log(`Using cached price for ${searchItemName}: ${cachedData.price}`);
      return cachedData.price;
    }

    try {
      // Use search API to find price
      const response = await fetch('/api/market/search-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemName: searchItemName })
      });

      if (!response.ok) {
        console.error(`Failed to search price for item ${itemName}:`, response.statusText);
        return cachedData?.price || 0;
      }

      const data = await response.json();
      console.log(`Search price response for ${itemName}:`, data);
      
      let price = data.price || 0;
      
      // Note: Removed mock price fallback - using real API data

      // Update cache
      this.cache[cacheKey as any] = {
        price,
        timestamp: Date.now()
      };

      console.log(`Cached new price for ${searchItemName}: ${price}`);
      return price;
    } catch (error) {
      console.error(`Error searching price for item ${itemName}:`, error);
      return cachedData?.price || 0;
    }
  }

  async getMultiplePrices(itemIds: number[]): Promise<{ [itemId: number]: number }> {
    const prices: { [itemId: number]: number } = {};
    
    // Use Promise.all to fetch all prices concurrently
    const pricePromises = itemIds.map(async (itemId) => {
      const price = await this.getItemPrice(itemId);
      return { itemId, price };
    });

    const results = await Promise.all(pricePromises);
    
    results.forEach(({ itemId, price }) => {
      prices[itemId] = price;
    });

    return prices;
  }

  async getCurrentLowestPrice(itemName: string): Promise<number> {
    // Convert UI display name to actual market item name for search
    let searchItemName = itemName;
    if (itemName === '운명의 파편') {
      searchItemName = '운명의 파편 주머니(소)';
    }
    
    try {
      // Use search API to find current lowest price
      const response = await fetch('/api/market/search-current-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemName: searchItemName })
      });

      if (!response.ok) {
        console.error(`Failed to get current price for item ${searchItemName}:`, response.statusText);
        return 0;
      }

      const data = await response.json();
      console.log(`Current price response for ${searchItemName}:`, data);
      
      return data.price || 0;
    } catch (error) {
      console.error(`Error getting current price for item ${searchItemName}:`, error);
      return 0;
    }
  }

  clearCache(): void {
    this.cache = {};
  }

  async forceRefreshPrice(itemId: number): Promise<number> {
    console.log(`Force refreshing price for item ID: ${itemId}`);
    
    // Clear cache for this specific item
    delete this.cache[itemId];
    
    // Get fresh price
    return await this.getItemPrice(itemId);
  }

  async forceRefreshPriceByName(itemName: string): Promise<number> {
    console.log(`Force refreshing price for item: ${itemName}`);
    
    // Clear cache for this specific item name
    const cacheKey = `search_${itemName}`;
    delete this.cache[cacheKey as any];
    
    // Get fresh price
    return await this.getItemPriceByName(itemName);
  }

  async forceRefreshCurrentPrice(itemName: string): Promise<number> {
    console.log(`Force refreshing current price for item: ${itemName}`);
    
    // No caching for getCurrentLowestPrice, so it always gets fresh data
    return await this.getCurrentLowestPrice(itemName);
  }

  async forceRefreshMultiplePrices(itemIds: number[]): Promise<{ [itemId: number]: number }> {
    console.log(`Force refreshing prices for ${itemIds.length} items`);
    
    // Clear cache for all specified items
    itemIds.forEach(itemId => {
      delete this.cache[itemId];
    });
    
    // Get fresh prices
    return await this.getMultiplePrices(itemIds);
  }

  getCacheStatus(): { [itemId: number]: { price: number; age: number; expired: boolean } } {
    const status: { [itemId: number]: { price: number; age: number; expired: boolean } } = {};
    
    Object.entries(this.cache).forEach(([itemIdStr, data]) => {
      const itemId = parseInt(itemIdStr);
      const age = Date.now() - data.timestamp;
      status[itemId] = {
        price: data.price,
        age,
        expired: this.isExpired(data.timestamp)
      };
    });

    return status;
  }
}

// Export singleton instance
export const marketPriceService = new MarketPriceService();