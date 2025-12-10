/**
 * Folders module for Brizo SDK
 * Handles folder operations including create, list, and delete
 */

const { ValidationError } = require("./errors");

class Folders {
  /**
   * @param {import('./http')} httpClient - HTTP client instance
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * List folders
   * @param {Object} [options] - List options
   * @param {string} [options.parentId] - Parent folder ID (empty for root folders)
   * @returns {Promise<Object>} List of folders
   */
  async list(options = {}) {
    const response = await this.http.get("/v1/folders", {
      query: {
        parentId: options.parentId || "",
      },
    });

    return response.data.data;
  }

  /**
   * Get folder information by ID
   * @param {string} folderId - Folder ID
   * @returns {Promise<Object>} Folder information
   */
  async get(folderId) {
    if (!folderId) {
      throw new ValidationError("Folder ID is required");
    }

    const response = await this.http.get(`/v1/folders/${folderId}`);
    return response.data.data;
  }

  /**
   * Get folder path (breadcrumb)
   * @param {string} folderId - Folder ID
   * @returns {Promise<Array>} Array of folder path segments
   */
  async getPath(folderId) {
    if (!folderId) {
      throw new ValidationError("Folder ID is required");
    }

    const response = await this.http.get(`/v1/folders/${folderId}/path`);
    return response.data.data;
  }

  /**
   * Create a new folder
   * @param {Object} options - Create options
   * @param {string} options.name - Folder name
   * @param {string} [options.parentId] - Parent folder ID (empty for root)
   * @returns {Promise<Object>} Created folder
   */
  async create(options) {
    if (!options || !options.name) {
      throw new ValidationError("Folder name is required");
    }

    const response = await this.http.post("/v1/folders", {
      name: options.name,
      parentId: options.parentId || "",
    });

    return response.data.data;
  }

  /**
   * Rename a folder
   * @param {string} folderId - Folder ID
   * @param {string} newName - New folder name
   * @returns {Promise<Object>} Updated folder
   */
  async rename(folderId, newName) {
    if (!folderId) {
      throw new ValidationError("Folder ID is required");
    }
    if (!newName) {
      throw new ValidationError("New folder name is required");
    }

    const response = await this.http.patch(`/v1/folders/${folderId}`, {
      name: newName,
    });

    return response.data.data;
  }

  /**
   * Move a folder to a different parent folder
   * @param {string} folderId - Folder ID
   * @param {string} [parentId] - New parent folder ID (empty string or 'root' for root)
   * @returns {Promise<Object>} Updated folder
   */
  async move(folderId, parentId = "") {
    if (!folderId) {
      throw new ValidationError("Folder ID is required");
    }

    const response = await this.http.patch(`/v1/folders/${folderId}`, {
      parentId: parentId === "root" ? "" : parentId,
    });

    return response.data.data;
  }

  /**
   * Delete a folder
   * @param {string} folderId - Folder ID
   * @param {Object} [options] - Delete options
   * @param {boolean} [options.deleteContents=false] - Delete folder contents (files moved to root)
   * @returns {Promise<Object>} Deletion result
   */
  async delete(folderId, options = {}) {
    if (!folderId) {
      throw new ValidationError("Folder ID is required");
    }

    const response = await this.http.delete(`/v1/folders/${folderId}`, {
      query: {
        deleteContents: options.deleteContents ? "true" : undefined,
      },
    });

    return response.data;
  }

  /**
   * List all folders recursively
   * @param {string} [parentId] - Parent folder ID (empty for root)
   * @returns {Promise<Array>} Flat array of all folders with their paths
   */
  async listAll(parentId = "") {
    const allFolders = [];
    const errors = [];

    const fetchRecursive = async (parent, pathPrefix = []) => {
      try {
        const result = await this.list({ parentId: parent });
        const folders = result.items || [];

        for (const folder of folders) {
          const folderWithPath = {
            ...folder,
            path: [...pathPrefix, folder.name],
            pathString: [...pathPrefix, folder.name].join("/"),
          };
          allFolders.push(folderWithPath);

          await fetchRecursive(folder.id, folderWithPath.path);
        }
      } catch (error) {
        errors.push({ parentId: parent, error: error.message });
      }
    };

    await fetchRecursive(parentId);

    if (errors.length > 0) {
      allFolders._errors = errors;
    }

    return allFolders;
  }

  /**
   * Create folder path (creates all parent folders if needed)
   * @param {string} path - Folder path (e.g., 'photos/2024/vacation')
   * @returns {Promise<Object>} The deepest folder created
   */
  async createPath(path) {
    if (!path) {
      throw new ValidationError("Path is required");
    }

    const parts = path.split("/").filter((p) => p.trim());

    if (parts.length === 0) {
      throw new ValidationError("Invalid path");
    }

    let parentId = "";
    let lastFolder = null;

    for (const part of parts) {
      const existing = await this.list({ parentId });
      const existingFolder = existing.items?.find((f) => f.name.toLowerCase() === part.toLowerCase());

      if (existingFolder) {
        lastFolder = existingFolder;
        parentId = existingFolder.id;
      } else {
        lastFolder = await this.create({ name: part, parentId });
        parentId = lastFolder.id;
      }
    }

    return lastFolder;
  }

  /**
   * Get public share URL for a folder
   * @param {Object} folder - Folder object with shareUrl
   * @returns {string|null} Public URL or null if not shared
   */
  getShareUrl(folder) {
    if (!folder || !folder.shareUrl) {
      return null;
    }
    return folder.shareUrl;
  }
}

module.exports = Folders;
