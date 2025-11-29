/**
 * S3 Credentials module for Brizo SDK
 * Handles S3-compatible credentials management
 */

const { ValidationError } = require("./errors");

class S3Credentials {
  /**
   * @param {import('./http')} httpClient - HTTP client instance
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * List all S3 credentials
   * @returns {Promise<Array>} List of credentials (without secret keys)
   */
  async list() {
    const response = await this.http.get("/v1/s3-credentials");
    return response.data.data;
  }

  /**
   * Create new S3 credentials
   * @param {Object} [options] - Create options
   * @param {string} [options.name='Unnamed'] - Credential name
   * @returns {Promise<Object>} Created credentials (including secret key - save it!)
   */
  async create(options = {}) {
    const response = await this.http.post("/v1/s3-credentials", {
      name: options.name || "Unnamed",
    });

    return response.data.data;
  }

  /**
   * Update S3 credentials (rename)
   * @param {string} credentialId - Credential ID
   * @param {Object} options - Update options
   * @param {string} options.name - New name
   * @returns {Promise<Object>} Updated credentials
   */
  async update(credentialId, options) {
    if (!credentialId) {
      throw new ValidationError("Credential ID is required");
    }
    if (!options || !options.name) {
      throw new ValidationError("Name is required");
    }

    const response = await this.http.patch(`/v1/s3-credentials/${credentialId}`, {
      name: options.name,
    });

    return response.data.data;
  }

  /**
   * Delete S3 credentials
   * @param {string} credentialId - Credential ID
   * @returns {Promise<Object>} Deletion result
   */
  async delete(credentialId) {
    if (!credentialId) {
      throw new ValidationError("Credential ID is required");
    }

    const response = await this.http.delete(`/v1/s3-credentials/${credentialId}`);
    return response.data;
  }

  /**
   * Get S3 connection information
   * @returns {Promise<Object>} Connection info (endpoint, bucket, region)
   */
  async getConnectionInfo() {
    const response = await this.http.get("/v1/s3-credentials/connection-info");
    return response.data.data;
  }

  /**
   * Get S3 client configuration for AWS SDK
   * @param {Object} credentials - Credentials with accessKeyId and secretAccessKey
   * @returns {Promise<Object>} Configuration object for S3Client
   */
  async getS3Config(credentials) {
    if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new ValidationError("Credentials with accessKeyId and secretAccessKey are required");
    }

    const connectionInfo = await this.getConnectionInfo();

    return {
      endpoint: connectionInfo.endpoint,
      region: connectionInfo.region || "auto",
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      forcePathStyle: connectionInfo.forcePathStyle !== false,
      bucket: connectionInfo.bucket,
    };
  }
}

module.exports = S3Credentials;
