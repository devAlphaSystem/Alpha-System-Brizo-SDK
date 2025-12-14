/**
 * Metrics module for Brizo SDK
 * Handles usage metrics and statistics
 */

class Metrics {
  /**
   * @param {import('./http')} httpClient - HTTP client instance
   */
  constructor(httpClient) {
    this.http = httpClient;
    this._cache = null;
    this._cacheExpiry = 0;
    this._cacheTTL = 5000;
  }

  /**
   * Invalidate the metrics cache
   */
  invalidateCache() {
    this._cache = null;
    this._cacheExpiry = 0;
  }

  /**
   * Get usage metrics and statistics
   * @param {Object} [options] - Options
   * @param {boolean} [options.useCache=true] - Whether to use cached data
   * @returns {Promise<Object>} Metrics data including storage, uploads, and chart data
   */
  async get(options = {}) {
    const useCache = options.useCache !== false;
    const now = Date.now();

    if (useCache && this._cache && now < this._cacheExpiry) {
      return this._cache;
    }

    const response = await this.http.get("/v1/metrics");
    this._cache = response.data.data;
    this._cacheExpiry = now + this._cacheTTL;

    return this._cache;
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>} Storage usage data
   */
  async getStorageUsage() {
    const metrics = await this.get();
    return {
      used: metrics.storageUsedRaw,
      usedFormatted: metrics.storageUsed,
      limit: metrics.storageLimitRaw,
      limitFormatted: metrics.storageLimit,
      percentage: metrics.storageLimitRaw ? Math.round((metrics.storageUsedRaw / metrics.storageLimitRaw) * 100) : 0,
    };
  }

  /**
   * Get API requests usage information
   * @returns {Promise<Object>} API requests usage data
   */
  async getApiRequestsUsage() {
    const metrics = await this.get();
    return {
      used: metrics.apiRequests,
      limit: metrics.apiRequestsLimit,
      percentage: metrics.apiRequestsLimit ? Math.round((metrics.apiRequests / metrics.apiRequestsLimit) * 100) : 0,
      tracked: metrics.showApiRequestsCard,
    };
  }

  /**
   * Get upload statistics
   * @returns {Promise<Object>} Upload statistics
   */
  async getUploadStats() {
    const metrics = await this.get();
    return {
      totalUploads: metrics.totalUploads,
      filesStored: metrics.filesStored,
    };
  }
}

module.exports = Metrics;
