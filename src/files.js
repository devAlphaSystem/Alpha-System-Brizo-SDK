/**
 * Files module for Brizo SDK
 * Handles file operations including upload, download, list, and delete
 */

const fs = require("node:fs");
const path = require("node:path");
const { UploadError, ValidationError } = require("./errors");

class Files {
  /**
   * @param {import('./http')} httpClient - HTTP client instance
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * List files with pagination and filtering
   * @param {Object} [options] - List options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.perPage=20] - Items per page (max 100)
   * @param {string} [options.search] - Search by filename
   * @param {string} [options.type] - Filter by MIME type
   * @param {string} [options.sort='-created'] - Sort order (e.g., '-created', 'name', '-size')
   * @param {string} [options.folderId] - Filter by folder ID (use 'root' for root folder)
   * @returns {Promise<Object>} Paginated list of files
   */
  async list(options = {}) {
    const response = await this.http.get("/v1/files", {
      query: {
        page: options.page || 1,
        perPage: options.perPage || 20,
        search: options.search,
        type: options.type,
        sort: options.sort || "-created",
        folderId: options.folderId,
      },
    });

    return response.data.data;
  }

  /**
   * Get file information by ID
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} File information
   */
  async get(fileId) {
    if (!fileId) {
      throw new ValidationError("File ID is required");
    }

    const response = await this.http.get(`/v1/files/${fileId}`);
    return response.data.data;
  }

  /**
   * Delete a file
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} Deletion result
   */
  async delete(fileId) {
    if (!fileId) {
      throw new ValidationError("File ID is required");
    }

    const response = await this.http.delete(`/v1/files/${fileId}`);
    return response.data;
  }

  /**
   * Move a file to a different folder
   * @param {string} fileId - File ID
   * @param {string} folderId - Target folder ID (use 'root' for root folder)
   * @returns {Promise<Object>} Updated file
   */
  async move(fileId, folderId) {
    if (!fileId) {
      throw new ValidationError("File ID is required");
    }

    const response = await this.http.patch(`/v1/files/${fileId}/move`, {
      folderId: folderId || "root",
    });

    return response.data.data;
  }

  /**
   * Get a signed download URL for a file
   * @param {string} fileId - File ID
   * @returns {Promise<string>} Signed download URL
   */
  async getDownloadUrl(fileId) {
    if (!fileId) {
      throw new ValidationError("File ID is required");
    }

    const response = await this.http.request("GET", `/v1/files/${fileId}/download`, {
      followRedirect: false,
    });

    if (response.headers?.location) {
      return response.headers.location;
    }

    throw new ValidationError("Failed to get download URL");
  }

  /**
   * Upload a file (simplified 3-step process in one call)
   * @param {Object} options - Upload options
   * @param {string|Buffer} options.file - File path or Buffer
   * @param {string} [options.filename] - Filename (required if file is a Buffer)
   * @param {string} [options.mimeType] - MIME type (auto-detected if not provided)
   * @param {string} [options.folderId] - Target folder ID
   * @param {Function} [options.onProgress] - Progress callback (percentage: number)
   * @returns {Promise<Object>} Uploaded file record
   */
  async upload(options) {
    if (!options || options.file === undefined || options.file === null) {
      throw new ValidationError("File is required");
    }

    if (typeof options.file === "string" && options.file.trim() === "") {
      throw new ValidationError("File path cannot be empty");
    }

    let fileBuffer;
    let filename;
    let size;
    let mimeType;

    if (typeof options.file === "string") {
      const filePath = options.file;

      if (!fs.existsSync(filePath)) {
        throw new ValidationError(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      size = stats.size;
      filename = options.filename || path.basename(filePath);
      mimeType = options.mimeType || this._getMimeType(filename);
      fileBuffer = fs.readFileSync(filePath);
    } else if (Buffer.isBuffer(options.file)) {
      fileBuffer = options.file;
      size = fileBuffer.length;
      filename = options.filename;
      mimeType = options.mimeType;

      if (!filename) {
        throw new ValidationError("Filename is required when uploading a Buffer");
      }

      if (!mimeType) {
        mimeType = this._getMimeType(filename);
      }
    } else {
      throw new ValidationError("File must be a file path (string) or Buffer");
    }

    const presignResponse = await this.http.post("/v1/upload/presign", {
      filename,
      fileType: mimeType,
      size,
      folderId: options.folderId || "",
    });

    const { url, key, headers: uploadHeaders } = presignResponse.data.data;

    try {
      if (options.onProgress) {
        options.onProgress(0);
      }

      await this.http.putRaw(url, fileBuffer, {
        "Content-Type": mimeType,
        "Content-Length": size,
        ...uploadHeaders,
      });

      if (options.onProgress) {
        options.onProgress(100);
      }
    } catch (error) {
      throw new UploadError(`Failed to upload file: ${error.message}`, {
        filename,
        size,
        key,
      });
    }

    const completeResponse = await this.http.post("/v1/upload/complete", {
      key,
      filename,
      size,
      type: mimeType,
      folderId: options.folderId || "",
    });

    return completeResponse.data.data.file;
  }

  /**
   * Upload multiple files
   * @param {Array<Object>} files - Array of upload options (same as upload method)
   * @param {Object} [options] - Batch options
   * @param {number} [options.concurrency=3] - Number of concurrent uploads
   * @param {Function} [options.onFileComplete] - Callback when each file completes
   * @param {Function} [options.onProgress] - Overall progress callback
   * @returns {Promise<Object>} Results with successful and failed uploads
   */
  async uploadBatch(files, options = {}) {
    const concurrency = options.concurrency || 3;
    const results = {
      successful: [],
      failed: [],
    };

    let completed = 0;
    const total = files.length;

    const uploadFile = async (fileOptions) => {
      let uploadResult = null;
      let uploadError = null;

      try {
        uploadResult = await this.upload(fileOptions);
        results.successful.push({
          ...uploadResult,
          originalFilename: fileOptions.filename || fileOptions.file,
        });
      } catch (error) {
        uploadError = error;
        results.failed.push({
          filename: fileOptions.filename || fileOptions.file,
          error: error.message,
        });
      }

      completed++;
      const currentCompleted = completed;

      if (options.onFileComplete) {
        options.onFileComplete(uploadResult, uploadError);
      }

      if (options.onProgress) {
        options.onProgress(Math.round((currentCompleted / total) * 100), currentCompleted, total);
      }
    };

    const chunks = [];
    for (let i = 0; i < files.length; i += concurrency) {
      chunks.push(files.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(uploadFile));
    }

    return results;
  }

  /**
   * Get public share URL for a file
   * @param {Object} file - File object with publicId
   * @returns {string|null} Public URL or null if not shareable
   */
  getShareUrl(file) {
    if (!file || !file.shareUrl) {
      return null;
    }
    return file.shareUrl;
  }

  /**
   * Get MIME type from filename
   * @private
   */
  _getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    const mimeTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      ico: "image/x-icon",
      bmp: "image/bmp",
      tiff: "image/tiff",
      tif: "image/tiff",

      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      odt: "application/vnd.oasis.opendocument.text",
      ods: "application/vnd.oasis.opendocument.spreadsheet",

      txt: "text/plain",
      html: "text/html",
      htm: "text/html",
      css: "text/css",
      csv: "text/csv",
      xml: "text/xml",
      md: "text/markdown",

      js: "application/javascript",
      mjs: "application/javascript",
      json: "application/json",
      ts: "text/typescript",
      py: "text/x-python",
      rb: "text/x-ruby",
      java: "text/x-java",
      c: "text/x-c",
      cpp: "text/x-c++",
      h: "text/x-c",
      hpp: "text/x-c++",
      go: "text/x-go",
      rs: "text/x-rust",
      php: "application/x-php",
      sh: "application/x-sh",
      yaml: "text/yaml",
      yml: "text/yaml",

      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      m4a: "audio/mp4",
      flac: "audio/flac",
      aac: "audio/aac",

      mp4: "video/mp4",
      webm: "video/webm",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      mkv: "video/x-matroska",
      wmv: "video/x-ms-wmv",

      zip: "application/zip",
      rar: "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
      tar: "application/x-tar",
      gz: "application/gzip",
      bz2: "application/x-bzip2",

      woff: "font/woff",
      woff2: "font/woff2",
      ttf: "font/ttf",
      otf: "font/otf",
      eot: "application/vnd.ms-fontobject",

      exe: "application/x-msdownload",
      dll: "application/x-msdownload",
      dmg: "application/x-apple-diskimage",
      iso: "application/x-iso9660-image",
      apk: "application/vnd.android.package-archive",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}

module.exports = Files;
