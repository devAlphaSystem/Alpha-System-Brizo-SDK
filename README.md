# Brizo SDK for Node.js

Official Node.js SDK for [Brizo](https://brizo-cloud.com) - Simple, powerful cloud storage for developers.

## Features

- **Simple Upload** - Upload files in one call (handles presigned URLs automatically)
- **Folder Management** - Create, rename, delete folders with nested support
- **Search & Filter** - Find files by name, type, or folder
- **Batch Operations** - Upload multiple files with concurrency control
- **S3 Compatible** - Use with AWS SDK for direct S3 access
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
  - [Delete File](#delete-file)
  - [Get Download URL](#get-download-url)
- [Folders](#folders)
  - [Create Folder](#create-folder)
  - [Create Folder Path](#create-folder-path)
  - [List Folders](#list-folders)
  - [Rename Folder](#rename-folder)
  - [Delete Folder](#delete-folder)
- [S3 Compatibility](#s3-compatibility)
  - [Create S3 Credentials](#create-s3-credentials)
  - [Use with AWS SDK](#use-with-aws-sdk)
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

### Get Share URL

```javascript
const file = await brizo.files.get('file-id');
const shareUrl = brizo.files.getShareUrl(file);

if (shareUrl) {
  console.log('Public URL:', shareUrl);
}
```

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

### Get Folder Path (Breadcrumb)

```javascript
const path = await brizo.folders.getPath('folder-id');
// Returns: [{ id: '...', name: 'photos' }, { id: '...', name: '2024' }, ...]
```

### Rename Folder

```javascript
await brizo.folders.rename('folder-id', 'New Name');
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

## S3 Compatibility

Brizo provides an S3-compatible API for direct storage access using standard S3 tools and SDKs.

### Create S3 Credentials

```javascript
// Create credentials
const creds = await brizo.s3Credentials.create({
  name: 'My App Production'
});

console.log('Access Key:', creds.accessKeyId);
console.log('Secret Key:', creds.secretAccessKey); // Save this! Only shown once

// List credentials
const allCreds = await brizo.s3Credentials.list();

// Delete credentials
await brizo.s3Credentials.delete('credential-id');
```

### Use with AWS SDK

```javascript
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// Get S3 configuration
const s3Config = await brizo.s3Credentials.getS3Config({
  accessKeyId: 'your-access-key-id',
  secretAccessKey: 'your-secret-access-key'
});

// Create S3 client
const s3 = new S3Client({
  endpoint: s3Config.endpoint,
  region: s3Config.region,
  credentials: s3Config.credentials,
  forcePathStyle: s3Config.forcePathStyle
});

// Upload a file
await s3.send(new PutObjectCommand({
  Bucket: s3Config.bucket,
  Key: 'my-folder/my-file.txt',
  Body: 'Hello, World!',
  ContentType: 'text/plain'
}));

// Download a file
const response = await s3.send(new GetObjectCommand({
  Bucket: s3Config.bucket,
  Key: 'my-folder/my-file.txt'
}));

const content = await response.Body.transformToString();
console.log(content);
```

### Get Connection Info

```javascript
const info = await brizo.s3Credentials.getConnectionInfo();

console.log({
  endpoint: info.endpoint,
  bucket: info.bucket,
  region: info.region
});
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
    console.log('Storage/bandwidth limit exceeded');
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
| `getDownloadUrl(fileId)` | Get download URL |
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
| `delete(folderId, options?)` | Delete a folder |

### S3 Credentials Module (`brizo.s3Credentials`)

| Method | Description |
|--------|-------------|
| `create(options?)` | Create S3 credentials |
| `list()` | List all credentials |
| `update(id, options)` | Rename credentials |
| `delete(id)` | Delete credentials |
| `getConnectionInfo()` | Get S3 endpoint info |
| `getS3Config(credentials)` | Get AWS SDK config |

## Requirements

- Node.js 14.0.0 or higher

## License

MIT © [Brizo](https://brizo-cloud.com)

## Support

- 📧 Email: suporte@alphasystem.dev
- 📖 Documentation: https://brizo-cloud.com/docs
- 🐛 Issues: https://github.com/devAlphaSystem/Alpha-System-Brizo-SDK/issues
