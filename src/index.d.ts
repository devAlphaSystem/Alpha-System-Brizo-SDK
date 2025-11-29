// Type definitions for @alphasystem/brizo
// Project: https://github.com/devAlphaSystem/Alpha-System-Brizo-SDK
// Definitions by: Brizo

export = Brizo;
export as namespace Brizo;

/**
 * Main Brizo client class
 */
declare class Brizo {
  /**
   * Create a new Brizo client
   * @param config - Configuration options
   */
  constructor(config: Brizo.BrizoConfig);

  /**
   * Files module for file operations
   */
  readonly files: Brizo.Files;

  /**
   * Folders module for folder operations
   */
  readonly folders: Brizo.Folders;

  /**
   * S3 Credentials module for S3-compatible access
   */
  readonly s3Credentials: Brizo.S3Credentials;

  /**
   * Get the current API key (masked)
   */
  getApiKey(): string;

  /**
   * Update the API key
   * @param apiKey - New API key
   */
  setApiKey(apiKey: string): void;

  /**
   * Test the API connection
   */
  healthCheck(): Promise<Brizo.HealthCheckResponse>;

  /**
   * Quick upload helper
   * @param file - File path or Buffer
   * @param filename - Filename (required for Buffer)
   * @param folderId - Target folder ID
   */
  upload(file: string | Buffer, filename?: string | null, folderId?: string | null): Promise<Brizo.File>;

  /**
   * Quick list helper for files
   */
  listFiles(options?: Brizo.ListFilesOptions): Promise<Brizo.PaginatedFiles>;

  /**
   * Quick list helper for folders
   */
  listFolders(options?: Brizo.ListFoldersOptions): Promise<Brizo.FolderList>;
}

declare namespace Brizo {
  // ============================================================================
  // Configuration
  // ============================================================================

  interface BrizoConfig {
    /**
     * Your Brizo API key
     */
    apiKey: string;

    /**
     * Request timeout in milliseconds
     * @default 30000
     */
    timeout?: number;

    /**
     * Additional headers for all requests
     */
    headers?: Record<string, string>;
  }

  // ============================================================================
  // Common Types
  // ============================================================================

  interface HealthCheckResponse {
    status: string;
    timestamp?: string;
  }

  interface ApiResponse<T> {
    status: string;
    data: T;
    message?: string;
  }

  // ============================================================================
  // File Types
  // ============================================================================

  interface File {
    /**
     * Unique file ID
     */
    id: string;

    /**
     * Internal storage name
     */
    name: string;

    /**
     * Original filename
     */
    originalName: string;

    /**
     * File MIME type
     */
    mimeType: string;

    /**
     * File size in bytes
     */
    size: number;

    /**
     * Public share ID (if available)
     */
    publicId?: string;

    /**
     * Number of downloads
     */
    downloads: number;

    /**
     * Parent folder ID (empty for root)
     */
    folder: string;

    /**
     * Public share URL (if available)
     */
    shareUrl?: string | null;

    /**
     * Creation timestamp
     */
    created: string;

    /**
     * Last update timestamp
     */
    updated: string;
  }

  interface PaginatedFiles {
    /**
     * Current page number
     */
    page: number;

    /**
     * Items per page
     */
    perPage: number;

    /**
     * Total number of items
     */
    totalItems: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Array of file items
     */
    items: File[];
  }

  interface ListFilesOptions {
    /**
     * Page number
     * @default 1
     */
    page?: number;

    /**
     * Items per page (max 100)
     * @default 20
     */
    perPage?: number;

    /**
     * Search by filename
     */
    search?: string;

    /**
     * Filter by MIME type
     */
    type?: string;

    /**
     * Sort order (e.g., '-created', 'name', '-size')
     * @default '-created'
     */
    sort?: string;

    /**
     * Filter by folder ID (use 'root' for root folder)
     */
    folderId?: string;
  }

  interface UploadOptions {
    /**
     * File path (string) or file content (Buffer)
     */
    file: string | Buffer;

    /**
     * Filename (required when file is a Buffer)
     */
    filename?: string;

    /**
     * MIME type (auto-detected if not provided)
     */
    mimeType?: string;

    /**
     * Target folder ID
     */
    folderId?: string;

    /**
     * Progress callback
     * @param percentage - Upload progress (0-100)
     */
    onProgress?: (percentage: number) => void;
  }

  interface BatchUploadOptions {
    /**
     * Number of concurrent uploads
     * @default 3
     */
    concurrency?: number;

    /**
     * Callback when each file completes
     * @param file - Uploaded file (null on error)
     * @param error - Error (null on success)
     */
    onFileComplete?: (file: File | null, error: Error | null) => void;

    /**
     * Overall progress callback
     * @param percentage - Overall progress (0-100)
     * @param completed - Number of completed files
     * @param total - Total number of files
     */
    onProgress?: (percentage: number, completed: number, total: number) => void;
  }

  interface BatchUploadResult {
    /**
     * Successfully uploaded files
     */
    successful: Array<File & { originalFilename: string }>;

    /**
     * Failed uploads
     */
    failed: Array<{
      filename: string;
      error: string;
    }>;
  }

  // ============================================================================
  // Folder Types
  // ============================================================================

  interface Folder {
    /**
     * Unique folder ID
     */
    id: string;

    /**
     * Folder name
     */
    name: string;

    /**
     * Parent folder ID (empty for root)
     */
    parent: string;

    /**
     * Creation timestamp
     */
    created: string;

    /**
     * Last update timestamp
     */
    updated: string;
  }

  interface FolderWithPath extends Folder {
    /**
     * Array of folder names in path
     */
    path: string[];

    /**
     * Path as string (e.g., 'photos/2024/vacation')
     */
    pathString: string;
  }

  interface FolderList {
    /**
     * Array of folders
     */
    items: Folder[];

    /**
     * Total number of items
     */
    totalItems: number;
  }

  interface ListFoldersOptions {
    /**
     * Parent folder ID (empty for root folders)
     */
    parentId?: string;
  }

  interface CreateFolderOptions {
    /**
     * Folder name
     */
    name: string;

    /**
     * Parent folder ID (empty for root)
     */
    parentId?: string;
  }

  interface DeleteFolderOptions {
    /**
     * Delete folder contents (files moved to root)
     * @default false
     */
    deleteContents?: boolean;
  }

  interface FolderPathSegment {
    /**
     * Folder ID
     */
    id: string;

    /**
     * Folder name
     */
    name: string;
  }

  // ============================================================================
  // S3 Credentials Types
  // ============================================================================

  interface S3Credential {
    /**
     * Credential ID
     */
    id: string;

    /**
     * Access Key ID
     */
    accessKeyId: string;

    /**
     * Credential name
     */
    name: string;

    /**
     * Creation timestamp
     */
    created: string;

    /**
     * Last used timestamp
     */
    lastUsed?: string;

    /**
     * Number of requests made
     */
    requestCount: number;
  }

  interface S3CredentialWithSecret extends S3Credential {
    /**
     * Secret Access Key (only shown once at creation)
     */
    secretAccessKey: string;
  }

  interface CreateS3CredentialOptions {
    /**
     * Credential name
     * @default 'Unnamed'
     */
    name?: string;
  }

  interface UpdateS3CredentialOptions {
    /**
     * New credential name
     */
    name: string;
  }

  interface S3ConnectionInfo {
    /**
     * S3-compatible endpoint URL
     */
    endpoint: string;

    /**
     * Bucket name
     */
    bucket: string;

    /**
     * Region
     */
    region: string;

    /**
     * Whether to use path-style URLs
     */
    forcePathStyle: boolean;

    /**
     * Additional info
     */
    info: string;
  }

  interface S3ClientConfig {
    /**
     * S3-compatible endpoint URL
     */
    endpoint: string;

    /**
     * Region
     */
    region: string;

    /**
     * AWS credentials
     */
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
    };

    /**
     * Whether to use path-style URLs
     */
    forcePathStyle: boolean;

    /**
     * Bucket name
     */
    bucket: string;
  }

  // ============================================================================
  // Module Classes
  // ============================================================================

  /**
   * Files module for file operations
   */
  class Files {
    /**
     * List files with pagination and filtering
     */
    list(options?: ListFilesOptions): Promise<PaginatedFiles>;

    /**
     * Get file information by ID
     */
    get(fileId: string): Promise<File>;

    /**
     * Delete a file
     */
    delete(fileId: string): Promise<{ status: string; message: string }>;

    /**
     * Move a file to a different folder
     */
    move(fileId: string, folderId: string): Promise<File>;

    /**
     * Get a download URL for a file
     */
    getDownloadUrl(fileId: string): Promise<string>;

    /**
     * Upload a file (simplified 3-step process in one call)
     */
    upload(options: UploadOptions): Promise<File>;

    /**
     * Upload multiple files
     */
    uploadBatch(files: UploadOptions[], options?: BatchUploadOptions): Promise<BatchUploadResult>;

    /**
     * Get public share URL for a file
     */
    getShareUrl(file: File): string | null;
  }

  /**
   * Folders module for folder operations
   */
  class Folders {
    /**
     * List folders
     */
    list(options?: ListFoldersOptions): Promise<FolderList>;

    /**
     * Get folder information by ID
     */
    get(folderId: string): Promise<Folder>;

    /**
     * Get folder path (breadcrumb)
     */
    getPath(folderId: string): Promise<FolderPathSegment[]>;

    /**
     * Create a new folder
     */
    create(options: CreateFolderOptions): Promise<Folder>;

    /**
     * Rename a folder
     */
    rename(folderId: string, newName: string): Promise<Folder>;

    /**
     * Delete a folder
     */
    delete(folderId: string, options?: DeleteFolderOptions): Promise<{ status: string; message: string }>;

    /**
     * List all folders recursively
     */
    listAll(parentId?: string): Promise<FolderWithPath[]>;

    /**
     * Create folder path (creates all parent folders if needed)
     */
    createPath(path: string): Promise<Folder>;
  }

  /**
   * S3 Credentials module for S3-compatible access
   */
  class S3Credentials {
    /**
     * List all S3 credentials
     */
    list(): Promise<S3Credential[]>;

    /**
     * Create new S3 credentials
     */
    create(options?: CreateS3CredentialOptions): Promise<S3CredentialWithSecret>;

    /**
     * Update S3 credentials (rename)
     */
    update(credentialId: string, options: UpdateS3CredentialOptions): Promise<S3Credential>;

    /**
     * Delete S3 credentials
     */
    delete(credentialId: string): Promise<{ status: string; message: string }>;

    /**
     * Get S3 connection information
     */
    getConnectionInfo(): Promise<S3ConnectionInfo>;

    /**
     * Get S3 client configuration for AWS SDK
     */
    getS3Config(credentials: { accessKeyId: string; secretAccessKey: string }): Promise<S3ClientConfig>;
  }

  // ============================================================================
  // Error Classes
  // ============================================================================

  /**
   * Base error class for Brizo SDK errors
   */
  class BrizoError extends Error {
    /**
     * HTTP status code
     */
    statusCode: number | null;

    /**
     * Error code
     */
    code: string | null;

    /**
     * Additional error details
     */
    details: any;

    constructor(message: string, statusCode?: number | null, code?: string | null, details?: any);

    /**
     * Create error from API response
     */
    static fromResponse(response: Response, body?: any): BrizoError;
  }

  /**
   * Error thrown when authentication fails
   */
  class AuthenticationError extends BrizoError {
    constructor(message?: string);
  }

  /**
   * Error thrown when a resource is not found
   */
  class NotFoundError extends BrizoError {
    constructor(message?: string);
  }

  /**
   * Error thrown when validation fails
   */
  class ValidationError extends BrizoError {
    constructor(message: string, details?: any);
  }

  /**
   * Error thrown when rate limit is exceeded
   */
  class RateLimitError extends BrizoError {
    /**
     * Seconds until rate limit resets
     */
    retryAfter: number | null;

    constructor(message?: string, retryAfter?: number | null);
  }

  /**
   * Error thrown when storage/bandwidth limits are exceeded
   */
  class LimitExceededError extends BrizoError {
    /**
     * Type of limit exceeded
     */
    limitType: string | null;

    constructor(message: string, limitType?: string | null);
  }

  /**
   * Error thrown when upload fails
   */
  class UploadError extends BrizoError {
    constructor(message: string, details?: any);
  }

  /**
   * All error classes
   */
  const errors: {
    BrizoError: typeof BrizoError;
    AuthenticationError: typeof AuthenticationError;
    NotFoundError: typeof NotFoundError;
    ValidationError: typeof ValidationError;
    RateLimitError: typeof RateLimitError;
    LimitExceededError: typeof LimitExceededError;
    UploadError: typeof UploadError;
  };
}
