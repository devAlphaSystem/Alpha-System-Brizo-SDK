# Brizo SDK for Node.js

Official Node.js SDK for [Brizo](https://brizo-cloud.com) - Simple, powerful cloud storage for developers.

## Features

- **Simple Upload** - Upload files in one call (handles presigned URLs automatically)
- **Folder Management** - Create, rename, delete folders with nested support
- **Search & Filter** - Find files by name, type, or folder
- **Batch Operations** - Upload multiple files with concurrency control
- **TypeScript Ready** - Full type definitions included
- **Zero Dependencies** - Uses only Node.js built-in modules

## Installation

```bash
npm install @alphasystem/brizo
```

## Quick Start

```javascript
const Brizo = require('@alphasystem/brizo');

// Initialize the client
const brizo = new Brizo({
  apiKey: 'your-api-key' // Get from https://brizo-cloud.com/dashboard/api-keys
});

// Upload a file
const file = await brizo.files.upload({
  file: './photo.jpg'
});
console.log('Uploaded:', file.originalName, file.shareUrl);

// List your files
const files = await brizo.files.list();
console.log('Total files:', files.totalItems);
```

## Table of Contents

- [Configuration](#configuration)
- [Files](#files)
  - [Upload a File](#upload-a-file)
  - [Upload Multiple Files](#upload-multiple-files)
  - [List Files](#list-files)
  - [Get File Info](#get-file-info)
  - [Move File](#move-file)
  - [Rename File](#rename-file)
  - [Delete File](#delete-file)
  - [Get Download URL](#get-download-url)
  - [Get Stream URL](#get-stream-url)
  - [Get Share URL](#get-share-url)
- [Folders](#folders)
  - [Create Folder](#create-folder)
  - [Create Folder Path](#create-folder-path)
  - [List Folders](#list-folders)
  - [Get Folder Info](#get-folder-info)
  - [Get Folder Path](#get-folder-path-breadcrumb)
  - [Rename Folder](#rename-folder)
  - [Move Folder](#move-folder)
  - [Delete Folder](#delete-folder)
- [Metrics](#metrics)
  - [Get All Metrics](#get-all-metrics)
  - [Usage Information](#usage-information)
- [Error Handling](#error-handling)
- [TypeScript](#typescript)
- [API Reference](#api-reference)

## Configuration

```javascript
const Brizo = require('@alphasystem/brizo');

const brizo = new Brizo({
  // Required: Your API key
  apiKey: 'brz_xxxxxxxxxxxxxxxx',
  
  // Optional: Request timeout in milliseconds (default: 30000)
  timeout: 60000,
  
  // Optional: Additional headers for all requests
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

### Environment Variables

We recommend storing your API key in an environment variable:

```javascript
const brizo = new Brizo({
  apiKey: process.env.BRIZO_API_KEY
});
```

## Files

### Upload a File

Upload a file from path or Buffer. The SDK handles the 3-step upload process automatically:
1. Get presigned upload URL
2. Upload to storage
3. Register file in your account

```javascript
// Upload from file path
const file = await brizo.files.upload({
  file: './documents/report.pdf'
});

// Upload from Buffer
const buffer = Buffer.from('Hello, World!');
const file = await brizo.files.upload({
  file: buffer,
  filename: 'hello.txt',
  mimeType: 'text/plain'
});

// Upload to a specific folder
const file = await brizo.files.upload({
  file: './photo.jpg',
  folderId: 'folder-id-here'
});

// Track upload progress
const file = await brizo.files.upload({
  file: './large-video.mp4',
  onProgress: (percentage) => {
    console.log(`Upload progress: ${percentage}%`);
  }
});
```

#### Upload Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `file` | `string \| Buffer` | Yes | File path or Buffer |
| `filename` | `string` | For Buffer | Filename (auto-detected from path) |
| `mimeType` | `string` | No | MIME type (auto-detected from extension) |
| `folderId` | `string` | No | Target folder ID |
| `onProgress` | `function` | No | Progress callback (0-100) |

### Upload Multiple Files

Upload multiple files with concurrency control:

```javascript
const files = [
  { file: './photo1.jpg' },
  { file: './photo2.jpg' },
  { file: './photo3.jpg' },
  { file: Buffer.from('data'), filename: 'data.txt' }
];

const result = await brizo.files.uploadBatch(files, {
  concurrency: 3, // Upload 3 files at a time
  
  onFileComplete: (file, error) => {
    if (error) {
      console.log('Failed:', error.message);
    } else {
      console.log('Uploaded:', file.originalName);
    }
  },
  
  onProgress: (percentage, completed, total) => {
    console.log(`Overall progress: ${percentage}% (${completed}/${total})`);
  }
});

console.log('Successful:', result.successful.length);
console.log('Failed:', result.failed.length);
```

### List Files

```javascript
// List all files (paginated)
const files = await brizo.files.list();

// With options
const files = await brizo.files.list({
  page: 1,
  perPage: 50,
  search: 'report',           // Search by filename
  type: 'image',              // Filter by MIME type (partial match)
  sort: '-size',              // Sort by size descending
  folderId: 'folder-id'       // Filter by folder
});

// Iterate through pages
let page = 1;
let hasMore = true;

while (hasMore) {
  const result = await brizo.files.list({ page, perPage: 100 });
  
  for (const file of result.items) {
    console.log(file.originalName, file.size);
  }
  
  hasMore = page < result.totalPages;
  page++;
}
```

#### Sort Options

- `created` / `-created` - Sort by creation date
- `name` / `-name` - Sort by filename
- `size` / `-size` - Sort by file size
- `updated` / `-updated` - Sort by last update

### Get File Info

```javascript
const file = await brizo.files.get('file-id');

console.log({
  id: file.id,
  name: file.originalName,
  size: file.size,
  type: file.mimeType,
  downloads: file.downloads,
  shareUrl: file.shareUrl,
  isShared: file.isShared,
  isFavorite: file.isFavorite,
  created: file.created
});
```

### Move File

```javascript
// Move to a folder
await brizo.files.move('file-id', 'folder-id');

// Move to root
await brizo.files.move('file-id', 'root');
```

### Rename File

```javascript
await brizo.files.rename('file-id', 'new-filename.jpg');
```

### Delete File

```javascript
await brizo.files.delete('file-id');
```

### Get Download URL

```javascript
const url = await brizo.files.getDownloadUrl('file-id');

// Use the URL to download the file
// Note: This returns a URL that redirects to a signed download URL
```

### Get Stream URL

Get a URL for inline display (e.g., images, videos in browser):

```javascript
const url = await brizo.files.getStreamUrl('file-id');

// Use for displaying images/videos directly in browser
console.log(`<img src="${url}" />`);
```

### Get Share URL

```javascript
const file = await brizo.files.get('file-id');
const shareUrl = brizo.files.getShareUrl(file);

if (shareUrl) {
  console.log('Public URL:', shareUrl);
}
```

> **Note:** File and folder sharing can only be toggled through the Brizo Drive web interface. The SDK can read share URLs from files that have already been shared.

## Folders

### Create Folder

```javascript
// Create in root
const folder = await brizo.folders.create({
  name: 'My Photos'
});

// Create nested folder
const subFolder = await brizo.folders.create({
  name: 'Vacation 2024',
  parentId: folder.id
});
```

### Create Folder Path

Create nested folders in one call:

```javascript
// Creates: photos/2024/vacation (and all parent folders if needed)
const folder = await brizo.folders.createPath('photos/2024/vacation');
console.log('Created folder:', folder.id);
```

### List Folders

```javascript
// List root folders
const folders = await brizo.folders.list();

// List folders in a parent
const subFolders = await brizo.folders.list({
  parentId: 'parent-folder-id'
});

// List ALL folders recursively (with full paths)
const allFolders = await brizo.folders.listAll();
for (const folder of allFolders) {
  console.log(folder.pathString); // e.g., "photos/2024/vacation"
}
```

### Get Folder Info

```javascript
const folder = await brizo.folders.get('folder-id');

console.log({
  id: folder.id,
  name: folder.name,
  parent: folder.parent,
  isShared: folder.isShared,
  shareUrl: folder.shareUrl,
  publicId: folder.publicId,
  created: folder.created
});
```

### Get Folder Path (Breadcrumb)

```javascript
const path = await brizo.folders.getPath('folder-id');
// Returns: [{ id: '...', name: 'photos' }, { id: '...', name: '2024' }, ...]
```

### Rename Folder

```javascript
await brizo.folders.rename('folder-id', 'New Name');
```

### Move Folder

```javascript
// Move to another folder
await brizo.folders.move('folder-id', 'new-parent-folder-id');

// Move to root
await brizo.folders.move('folder-id', 'root');
// or
await brizo.folders.move('folder-id', '');
```

### Delete Folder

```javascript
// Delete empty folder
await brizo.folders.delete('folder-id');

// Delete folder with contents (files moved to root)
await brizo.folders.delete('folder-id', {
  deleteContents: true
});
```

## Metrics

Track storage usage and API requests.

### Get All Metrics

```javascript
const metrics = await brizo.metrics.get();

console.log({
  totalUploads: metrics.totalUploads,
  filesStored: metrics.filesStored,
  storageUsed: metrics.storageUsed,      // e.g., "2.5 GB"
  storageLimit: metrics.storageLimit,    // e.g., "2 TB" or null if unlimited
  apiRequests: metrics.apiRequests,
  plan: metrics.plan                     // { id, slug, name }
});
```

### Usage Information

```javascript
// Get storage usage details
const storage = await brizo.metrics.getStorageUsage();
console.log({
  used: storage.used,              // bytes
  usedFormatted: storage.usedFormatted,  // "2.5 GB"
  limit: storage.limit,            // bytes or null
  limitFormatted: storage.limitFormatted,
  percentage: storage.percentage   // 0-100
});

// Get API requests usage
const apiUsage = await brizo.metrics.getApiRequestsUsage();
if (apiUsage.tracked) {
  console.log(`${apiUsage.used} / ${apiUsage.limit} API requests`);
}

// Get upload statistics
const stats = await brizo.metrics.getUploadStats();
console.log(`Total uploads: ${stats.totalUploads}, Files stored: ${stats.filesStored}`);
```

## Error Handling

The SDK throws typed errors for different failure scenarios:

```javascript
const { 
  BrizoError, 
  AuthenticationError, 
  NotFoundError, 
  ValidationError,
  RateLimitError,
  LimitExceededError,
  UploadError 
} = require('@alphasystem/brizo');

try {
  await brizo.files.get('invalid-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('File not found');
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof ValidationError) {
    console.log('Validation error:', error.message);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof LimitExceededError) {
    console.log('Storage limit exceeded');
  } else if (error instanceof UploadError) {
    console.log('Upload failed:', error.details);
  } else if (error instanceof BrizoError) {
    console.log('API error:', error.statusCode, error.message);
  } else {
    throw error;
  }
}
```

### Error Properties

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error message |
| `statusCode` | `number` | HTTP status code |
| `code` | `string` | Error code |
| `details` | `any` | Additional details |

## TypeScript

The SDK includes full TypeScript definitions:

```typescript
import Brizo, { 
  BrizoConfig, 
  File, 
  Folder, 
  UploadOptions,
  ListFilesOptions,
  BrizoError 
} from '@alphasystem/brizo';

const config: BrizoConfig = {
  apiKey: process.env.BRIZO_API_KEY!
};

const brizo = new Brizo(config);

async function uploadFile(path: string): Promise<File> {
  const options: UploadOptions = {
    file: path,
    onProgress: (pct: number) => console.log(`${pct}%`)
  };
  
  return brizo.files.upload(options);
}

async function listImages(): Promise<File[]> {
  const options: ListFilesOptions = {
    type: 'image',
    perPage: 100
  };
  
  const result = await brizo.files.list(options);
  return result.items;
}
```

## API Reference

### Brizo Client

| Method | Description |
|--------|-------------|
| `new Brizo(config)` | Create a new client |
| `getApiKey()` | Get masked API key |
| `setApiKey(key)` | Update API key |
| `healthCheck()` | Test API connection |
| `upload(file, filename?, folderId?)` | Quick upload helper |
| `listFiles(options?)` | Quick list helper |
| `listFolders(options?)` | Quick list helper |

### Files Module (`brizo.files`)

| Method | Description |
|--------|-------------|
| `upload(options)` | Upload a file |
| `uploadBatch(files, options?)` | Upload multiple files |
| `list(options?)` | List files with pagination |
| `get(fileId)` | Get file info |
| `delete(fileId)` | Delete a file |
| `move(fileId, folderId)` | Move file to folder |
| `rename(fileId, newName)` | Rename a file |
| `getDownloadUrl(fileId)` | Get download URL |
| `getStreamUrl(fileId)` | Get streaming URL (inline display) |
| `getShareUrl(file)` | Get public share URL |

### Folders Module (`brizo.folders`)

| Method | Description |
|--------|-------------|
| `create(options)` | Create a folder |
| `createPath(path)` | Create nested folders |
| `list(options?)` | List folders |
| `listAll(parentId?)` | List all folders recursively |
| `get(folderId)` | Get folder info |
| `getPath(folderId)` | Get folder breadcrumb |
| `rename(folderId, name)` | Rename a folder |
| `move(folderId, parentId?)` | Move folder to another parent |
| `delete(folderId, options?)` | Delete a folder |
| `getShareUrl(folder)` | Get public share URL |

### Metrics Module (`brizo.metrics`)

| Method | Description |
|--------|-------------|
| `get()` | Get all metrics and statistics |
| `getStorageUsage()` | Get storage usage details |
| `getApiRequestsUsage()` | Get API requests usage |
| `getUploadStats()` | Get upload statistics |

## Requirements

- Node.js 14.0.0 or higher

## License

MIT © [Brizo](https://brizo-cloud.com)

## Support

- 📧 Email: suporte@alphasystem.dev
- 📖 Documentation: https://brizo-cloud.com/docs
- 🐛 Issues: https://github.com/devAlphaSystem/Alpha-System-Brizo-SDK/issues
