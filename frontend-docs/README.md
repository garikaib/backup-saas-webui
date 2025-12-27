# Frontend Documentation

This directory contains frontend-specific documentation for the Backup SaaS Admin application.

## Project Overview

- **Framework**: Nuxt 3 (latest) with NuxtUI
- **State Management**: Pinia
- **API Base**: Configured dynamically via environment variables

## Documentation Index

| Document | Description |
|----------|-------------|
| [Frontend Flow](./frontend-flow.md) | Component architecture and data flow |
| [Component Guide](./components.md) | Reusable component documentation |
| [State Management](./stores.md) | Pinia store patterns and usage |

## Related Documentation

- **Backend API Reference**: See `../backend-api-docs/api_reference.md`
- **Development Workflow**: See `../.agent/workflows/frontend-workflow.md`

## Quick Start

```bash
# Dev server should already be running on port 3000
# If not running, contact project lead

# View the app
open http://localhost:3000
```

## Architecture Overview

```
app/
├── components/      # Reusable Vue components
├── composables/     # Vue composables (hooks)
├── layouts/         # Page layouts
├── middleware/      # Route middleware (auth, etc.)
├── pages/           # File-based routing
├── plugins/         # Nuxt plugins
├── stores/          # Pinia stores
└── utils/           # Utility functions
```
