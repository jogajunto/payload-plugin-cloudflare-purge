# Payload Plugin Cloudflare Purge

A [Payload CMS](https://payloadcms.com) plugin that automatically purges Cloudflare CDN cache when content changes. This ensures your visitors always see the most recent version of your site without stale cache.

## Features

- 🚀 **Automatic Cache Purge** - Purges Cloudflare CDN cache on content changes
- ⚡ **Flexible Configuration** - Support for multiple events and collections
- 🔧 **Custom URL Building** - Define custom logic for which URLs to purge
- 📊 **Comprehensive Logging** - Detailed logs with correlation IDs for debugging
- 🛡️ **Error Handling** - Robust error handling and retry logic
- 🔌 **Endpoint Support** - Optional internal endpoint for manual purge requests

## Installation

```bash
npm install payload-plugin-cloudflare-purge
# or
yarn add payload-plugin-cloudflare-purge
# or
pnpm add payload-plugin-cloudflare-purge
```

## Configuration

### Basic Setup

Add the plugin to your `payload.config.ts`:

```typescript
import { buildConfig } from 'payload'
import cloudflarePurge from 'payload-plugin-cloudflare-purge'

export default buildConfig({
  plugins: [
    cloudflarePurge({
      enabled: true,
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      baseUrl: 'https://yourdomain.com',
      collections: ['posts', 'pages'],
    }),
  ],
  // ... other config
})
```

### Environment Variables

```bash
CLOUDFLARE_ZONE_ID=your_zone_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
```

### Advanced Configuration

```typescript
cloudflarePurge({
  enabled: true,
  zoneId: process.env.CLOUDFLARE_ZONE_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  baseUrl: 'https://yourdomain.com',
  collections: 'ALL', // Purge for all collections
  events: ['afterChange', 'afterDelete'],
  purgeEverything: false,
  urlBuilder: ({ doc, collectionSlug }) => {
    // Custom URL building logic
    return [`https://yourdomain.com/${collectionSlug}/${doc.slug}`]
  },
  debug: process.env.NODE_ENV === 'development',
  logCFJSON: false,
  useEndpoint: true,
})
```

## API Endpoint

The plugin adds a POST endpoint at `/api/cloudflare-purge` for manual purge requests:

```typescript
// Example manual purge request
const response = await fetch('/api/cloudflare-purge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your_token_here', // If not using internal call
  },
  body: JSON.stringify({
    files: ['/specific-url-to-purge'],
    purgeEverything: false,
  }),
})
```

## Options

| Option            | Type                                  | Default                          | Description                        |
| ----------------- | ------------------------------------- | -------------------------------- | ---------------------------------- |
| `enabled`         | `boolean`                             | `false`                          | Enable/disable the plugin          |
| `zoneId`          | `string`                              | -                                | Cloudflare Zone ID                 |
| `apiToken`        | `string`                              | -                                | Cloudflare API Token               |
| `baseUrl`         | `string`                              | -                                | Your site's base URL               |
| `collections`     | `string[]` or `'ALL'`                 | `[]`                             | Collections to monitor             |
| `events`          | `Array<'afterChange'\|'afterDelete'>` | `['afterChange', 'afterDelete']` | Events that trigger purge          |
| `purgeEverything` | `boolean` or `function`               | `false`                          | Purge entire cache                 |
| `urlBuilder`      | `function`                            | Default builder                  | Custom URL builder function        |
| `debug`           | `boolean`                             | `false`                          | Enable debug logging               |
| `logCFJSON`       | `boolean`                             | `false`                          | Log full Cloudflare JSON responses |
| `useEndpoint`     | `boolean`                             | `true`                           | Use internal endpoint for purging  |

## Custom URL Builder

You can provide a custom function to build URLs for purging:

```typescript
urlBuilder: ({ doc, collectionSlug, baseUrl }) => {
  if (collectionSlug === 'posts') {
    return [`${baseUrl}/blog/${doc.slug}`, `${baseUrl}/blog/feed`, `${baseUrl}/api/posts/${doc.id}`]
  }
  return []
}
```

## Development

The plugin includes a comprehensive development environment:

1. **Start PostgreSQL**: `docker-compose up -d`
2. **Setup environment**: Copy `.env.example` to `.env` and configure
3. **Install dependencies**: `pnpm install` (or npm/yarn)
4. **Start dev server**: `pnpm dev`
5. **Run tests**: `pnpm test`

## Testing

```bash
# Run integration tests
pnpm test

# Run tests with watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Error Handling

The plugin includes comprehensive error handling:

- Network failure retries
- API token validation
- Zone ID verification
- Detailed error logging with correlation IDs

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0

- Complete rewrite with TypeScript
- PostgreSQL support instead of MongoDB
- Enhanced configuration options
- Improved error handling and logging
- Internal endpoint for manual purges
- Flexible URL building system
