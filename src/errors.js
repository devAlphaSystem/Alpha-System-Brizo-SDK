/**
 * Custom error class for Brizo SDK errors
 */
class BrizoError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} [statusCode] - HTTP status code
   * @param {string} [code] - Error code
   * @param {Object} [details] - Additional error details
   */
  constructor(message, statusCode = null, code = null, details = null) {
    super(message);
    this.name = "BrizoError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BrizoError);
    }
  }

  /**
   * Create a BrizoError from an API response
   * @param {Object} response - Fetch response object
   * @param {Object} [body] - Parsed response body
   * @returns {BrizoError}
   */
  static fromResponse(response, body = null) {
    const message = body?.message || body?.error || `Request failed with status ${response.status}`;
    return new BrizoError(message, response.status, body?.code || null, body?.details || null);
  }
}

/**
 * Error thrown when authentication fails
 */
class AuthenticationError extends BrizoError {
  constructor(message = "Authentication failed") {
    super(message, 401, "AUTH_ERROR");
    this.name = "AuthenticationError";
  }
}

/**
 * Error thrown when a resource is not found
 */
class NotFoundError extends BrizoError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Error thrown when validation fails
 */
class ValidationError extends BrizoError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
class RateLimitError extends BrizoError {
  constructor(message = "Rate limit exceeded", retryAfter = null) {
    super(message, 429, "RATE_LIMIT");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when storage/bandwidth limits are exceeded
 */
class LimitExceededError extends BrizoError {
  constructor(message, limitType = null) {
    super(message, 403, "LIMIT_EXCEEDED");
    this.name = "LimitExceededError";
    this.limitType = limitType;
  }
}

/**
 * Error thrown when upload fails
 */
class UploadError extends BrizoError {
  constructor(message, details = null) {
    super(message, 500, "UPLOAD_ERROR", details);
    this.name = "UploadError";
  }
}

module.exports = {
  BrizoError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  LimitExceededError,
  UploadError,
};
