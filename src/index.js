/**
 * Brizo SDK - Official Node.js SDK for Brizo Cloud Storage
 *
 * A simple, powerful SDK for integrating Brizo storage into your applications.
 * Features simplified file uploads (3 steps in 1 call) and folder management.
 */

const HttpClient = require("./http");
const Files = require("./files");
const Folders = require("./folders");
const Metrics = require("./metrics");
const { BrizoError, AuthenticationError, NotFoundError, ValidationError, RateLimitError, LimitExceededError, UploadError } = require("./errors");

/**
 * Brizo API base URL
 */
const API_BASE_URL = "https://api.brizo-cloud.com";

/**
 * Main Brizo client class
 * @example
 * const brizo = new Brizo({ apiKey: 'your-api-key' });
 *
 * // Upload a file
 * const file = await brizo.files.upload({ file: './photo.jpg' });
 *
 * // List files
 * const files = await brizo.files.list();
 *
 * // Create a folder
 * const folder = await brizo.folders.create({ name: 'My Photos' });
 */
class Brizo {
  /**
   * Create a new Brizo client
   * @param {Object} config - Configuration options
   * @param {string} config.apiKey - Your Brizo API key
   * @param {number} [config.timeout=30000] - Request timeout in milliseconds
   * @param {Object} [config.headers] - Additional headers for all requests
   */
  constructor(config) {
    if (!config || !config.apiKey) {
      throw new ValidationError("API key is required. Get your API key from https://brizo-cloud.com/settings/api-keys");
    }

    this.config = {
      baseUrl: API_BASE_URL,
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      headers: config.headers || {},
    };

    this._http = new HttpClient(this.config);

    this.files = new Files(this._http);
    this.folders = new Folders(this._http);
    this.metrics = new Metrics(this._http);
  }

  /**
   * Get the current API key
   * @returns {string} API key (masked)
   */
  getApiKey() {
    const key = this.config.apiKey;
    if (key.length <= 8) {
      return "****";
    }
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Update the API key
   * @param {string} apiKey - New API key
   */
  setApiKey(apiKey) {
    if (!apiKey) {
      throw new ValidationError("API key is required");
    }

    this.config.apiKey = apiKey;
    this._http = new HttpClient(this.config);

    this.files = new Files(this._http);
    this.folders = new Folders(this._http);
    this.metrics = new Metrics(this._http);
  }

  /**
   * Test the API connection
   * @returns {Promise<Object>} Health check response
   */
  async healthCheck() {
    const response = await this._http.get("/health");
    return response.data;
  }

  /**
   * Quick upload helper - upload a file with minimal options
   * @param {string|Buffer} file - File path or Buffer
   * @param {string} [filename] - Filename (required for Buffer)
   * @param {string} [folderId] - Target folder ID
   * @returns {Promise<Object>} Uploaded file
   */
  async upload(file, filename = null, folderId = null) {
    return this.files.upload({
      file,
      filename,
      folderId,
    });
  }

  /**
   * Quick list helper - list files with default pagination
   * @param {Object} [options] - List options
   * @returns {Promise<Object>} Paginated files
   */
  async listFiles(options = {}) {
    return this.files.list(options);
  }

  /**
   * Quick list helper - list folders
   * @param {Object} [options] - List options
   * @returns {Promise<Object>} Folders list
   */
  async listFolders(options = {}) {
    return this.folders.list(options);
  }
}

module.exports = Brizo;
module.exports.Brizo = Brizo;
module.exports.default = Brizo;

module.exports.BrizoError = BrizoError;
module.exports.AuthenticationError = AuthenticationError;
module.exports.NotFoundError = NotFoundError;
module.exports.ValidationError = ValidationError;
module.exports.RateLimitError = RateLimitError;
module.exports.LimitExceededError = LimitExceededError;
module.exports.UploadError = UploadError;

module.exports.errors = {
  BrizoError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  LimitExceededError,
  UploadError,
};
