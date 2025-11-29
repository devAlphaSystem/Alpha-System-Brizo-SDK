const https = require("node:https");
const http = require("node:http");
const { URL } = require("node:url");
const { BrizoError, AuthenticationError, NotFoundError, ValidationError, RateLimitError, LimitExceededError } = require("./errors");

/**
 * HTTP client for making API requests
 * Uses native Node.js http/https modules - no external dependencies
 */
class HttpClient {
  /**
   * @param {Object} config
   * @param {string} config.baseUrl - Base URL for API requests
   * @param {string} config.apiKey - API key for authentication
   * @param {number} [config.timeout=30000] - Request timeout in milliseconds
   * @param {Object} [config.headers] - Additional headers to include
   */
  constructor(config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
      ...config.headers,
    };
  }

  /**
   * Make an HTTP request
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {Object} [options] - Request options
   * @param {Object} [options.body] - Request body
   * @param {Object} [options.query] - Query parameters
   * @param {Object} [options.headers] - Additional headers
   * @param {number} [options.timeout] - Request timeout override
   * @returns {Promise<Object>} Response data
   */
  async request(method, path, options = {}) {
    const url = new URL(path, this.baseUrl);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value));
        }
      }
    }

    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    let body = null;
    if (options.body) {
      body = JSON.stringify(options.body);
      headers["Content-Length"] = Buffer.byteLength(body);
    }

    const requestOptions = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      headers,
      timeout: options.timeout || this.timeout,
    };

    return new Promise((resolve, reject) => {
      const client = url.protocol === "https:" ? https : http;

      const req = client.request(requestOptions, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          let parsedData;
          try {
            parsedData = data ? JSON.parse(data) : {};
          } catch {
            parsedData = { raw: data };
          }

          if (res.statusCode >= 400) {
            const error = this._createError(res.statusCode, parsedData, res.headers);
            reject(error);
            return;
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        });
      });

      req.on("error", (error) => {
        reject(new BrizoError(`Request failed: ${error.message}`, null, "NETWORK_ERROR"));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new BrizoError("Request timeout", null, "TIMEOUT"));
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Create appropriate error based on status code
   * @private
   */
  _createError(statusCode, body, headers = {}) {
    const message = body?.message || body?.error || `Request failed with status ${statusCode}`;

    switch (statusCode) {
      case 401:
        return new AuthenticationError(message);
      case 404:
        return new NotFoundError(message);
      case 400:
        return new ValidationError(message, body?.details);
      case 429: {
        const retryAfter = headers["retry-after"] ? Number.parseInt(headers["retry-after"], 10) : null;
        return new RateLimitError(message, retryAfter);
      }
      case 403:
        if (message.toLowerCase().includes("limit")) {
          return new LimitExceededError(message);
        }
        return new BrizoError(message, statusCode, "FORBIDDEN");
      default:
        return new BrizoError(message, statusCode);
    }
  }

  /**
   * Make a GET request
   */
  get(path, options = {}) {
    return this.request("GET", path, options);
  }

  /**
   * Make a POST request
   */
  post(path, body, options = {}) {
    return this.request("POST", path, { ...options, body });
  }

  /**
   * Make a PATCH request
   */
  patch(path, body, options = {}) {
    return this.request("PATCH", path, { ...options, body });
  }

  /**
   * Make a DELETE request
   */
  delete(path, options = {}) {
    return this.request("DELETE", path, options);
  }

  /**
   * Make a raw PUT request (for file uploads)
   * @param {string} url - Full URL to upload to
   * @param {Buffer|string|ReadableStream} data - Data to upload
   * @param {Object} headers - Request headers
   * @param {number} [timeout] - Request timeout
   * @returns {Promise<Object>}
   */
  async putRaw(fullUrl, data, headers = {}, timeout = null) {
    const url = new URL(fullUrl);

    const requestOptions = {
      method: "PUT",
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      headers,
      timeout: timeout || this.timeout,
    };

    return new Promise((resolve, reject) => {
      const client = url.protocol === "https:" ? https : http;

      const req = client.request(requestOptions, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new BrizoError(`Upload failed with status ${res.statusCode}`, res.statusCode, "UPLOAD_ERROR"));
            return;
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
          });
        });
      });

      req.on("error", (error) => {
        reject(new BrizoError(`Upload failed: ${error.message}`, null, "NETWORK_ERROR"));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new BrizoError("Upload timeout", null, "TIMEOUT"));
      });

      if (Buffer.isBuffer(data)) {
        req.write(data);
        req.end();
      } else if (typeof data === "string") {
        req.write(data);
        req.end();
      } else if (data && typeof data.pipe === "function") {
        data.on("error", (error) => {
          req.destroy();
          reject(new BrizoError(`Stream error: ${error.message}`, null, "STREAM_ERROR"));
        });
        data.pipe(req);
      } else {
        req.end();
      }
    });
  }
}

module.exports = HttpClient;
