# Payload Plugin Cloudflare Purge

![npm version](https://img.shields.io/npm/v/payload-plugin-cloudflare-purge)
![npm downloads](https://img.shields.io/npm/dm/payload-plugin-cloudflare-purge)

A [Payload CMS](https://payloadcms.com) plugin that automatically purges Cloudflare CDN cache when content changes. This ensures your visitors always see the most recent version of your site without stale cache.

## Features

- 🚀 **Automatic Cache Purge** - Purges on content changes for **collections and globals**.
- ⚡ **Asynchronous Logic** - `urlBuilder` can be `async`, allowing for complex data fetching to build purge lists.
- 🌍 **Localization Support** - Passes the current `locale` to the URL builder.
- 🔧 **Custom URL Building** - Define custom logic for which URLs to purge.
- 📊 **Comprehensive Logging** - Detailed logs with correlation IDs for debugging.
- 🔌 **Endpoint Support** - Optional internal endpoint for manual purge requests.
- 🛡️ **Typed** - Exports all necessary types for a fully typed experience in your project.

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
import { PayloadPluginCloudflarePurge } from 'payload-plugin-cloudflare-purge'

export default buildConfig({
  plugins: [
    PayloadPluginCloudflarePurge({
      enabled: true,
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      baseUrl: 'https://yourdomain.com',
      collections: ['posts', 'pages'],
      globals: ['header', 'footer'], // Target specific globals (case exist)
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
PayloadPluginCloudflarePurge({
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

| Option            | Type                                  | Default                          | Description                                     |
| ----------------- | ------------------------------------- | -------------------------------- | ----------------------------------------------- |
| `enabled`         | `boolean`                             | `false`                          | Enable/disable the plugin                       |
| `zoneId`          | `string`                              | -                                | Cloudflare Zone ID                              |
| `apiToken`        | `string`                              | -                                | Cloudflare API Token                            |
| `baseUrl`         | `string`                              | -                                | Your site's base URL                            |
| `collections`     | `string[]` or `'ALL'`                 | `[]`                             | Collections to monitor                          |
| `globals`         | `string[]` or `'ALL'`                 | `[]`                             | Globals to monitor                              |
| `localized`       | `boolean`                             | `false`                          | Enable localization support (passes `locale`)   |
| `events`          | `Array<'afterChange'\|'afterDelete'>` | `['afterChange', 'afterDelete']` | Events that trigger purge                       |
| `purgeEverything` | `boolean` or `function`               | `false`                          | Purge entire cache                              |
| `urlBuilder`      | `function`                            | Default builder                  | Custom URL builder function (`async` supported) |
| `debug`           | `boolean`                             | `false`                          | Enable debug logging                            |
| `logCFJSON`       | `boolean`                             | `false`                          | Log full Cloudflare JSON responses              |
| `useEndpoint`     | `boolean`                             | `true`                           | Use internal endpoint for purging               |

## Custom URL Builder (Async)

You can provide a custom `async` function to build URLs, allowing you to fetch additional data needed to create a comprehensive purge list.

```typescript
import { PayloadPluginCloudflarePurge } from 'payload-plugin-cloudflare-purge'
import type { UrlBuilderArgs } from 'payload-plugin-cloudflare-purge/types'

PayloadPluginCloudflarePurge({
  // ...
  urlBuilder: async (args: UrlBuilderArgs) => {
    const { doc, req, collectionSlug, baseUrl } = args

    if (collectionSlug === 'posts') {
      // Example: Fetch all category pages this post belongs to
      const category = await req.payload.findByID({
        collection: 'categories',
        id: doc.category.id,
      })

      const urls = [`${baseUrl}/posts/${doc.slug}`]
      if (category) {
        urls.push(`${baseUrl}/categories/${category.slug}`)
      }
      return urls
    }

    return []
  },
})
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

### v2.2.0 (Latest)

**✨ Features**

- **Asynchronous `urlBuilder`**: The `urlBuilder` function can now be `async`, allowing for complex logic that needs to fetch data (e.g., querying the Payload API) to build the list of URLs to purge.
- **Exported Types**: The plugin now properly exports all its types, allowing for a fully typed implementation in your own project via `import type { UrlBuilderArgs } from 'payload-plugin-cloudflare-purge/types'`.

### v2.1.0

**✨ Features**

- **Globals Support**: The plugin now automatically purges cache for changes in Payload `globals`. You can configure this with the new `globals: ['my-global']` or `globals: 'ALL'` option.
- **Localization Support**: Added a `localized: true` option. When enabled, the `urlBuilder` function receives the current `locale` as a parameter, allowing you to build locale-specific URLs (e.g., `/en/my-page`).

**🛠️ Improvements**

- Logging is now conditional on the `debug: true` flag to provide a cleaner console output in production.
- The successful purge log now includes the request body sent to Cloudflare for easier debugging.

### v2.0.0

**Breaking Changes**

- Switched from default export to named export: use `import { PayloadPluginCloudflarePurge } from 'payload-plugin-cloudflare-purge'`.
- Removed unused subpath exports: `payload-plugin-cloudflare-purge/client` and `payload-plugin-cloudflare-purge/rsc`.

**Migration Guide**

- Update imports in your `payload.config.ts` and examples:

```ts
// Before
// import PayloadPluginCloudflarePurge from 'payload-plugin-cloudflare-purge'

// After
import { PayloadPluginCloudflarePurge } from 'payload-plugin-cloudflare-purge'
```

### v1.0.3

## Bug Fixes

- Fixed circular reference JSON serialization error: Resolved the "Converting circular structure to JSON" error by ensuring hooks return only the document (doc) instead of the complete arguments object (args) which contained circular references between PgTable and PgInteger objects

- Improved hook compatibility: Modified both afterChangeHook and afterDeleteHook to return the document directly, preventing circular reference issues during Payload CMS response serialization

### v1.0.2

- Draft-aware purge logic - only purges on actual publication
- Automatic draft configuration detection per collection
- Improved TypeScript examples in documentation

### v1.0.1

- Fixed export, main and type scripts by package.json
- Description repository
- Version package
- Add badges version and npm

### v1.0.0

- Complete rewrite with TypeScript
- PostgreSQL support instead of MongoDB
- Enhanced configuration options
- Improved error handling and logging
- Internal endpoint for manual purges
- Flexible URL building system

```

```
