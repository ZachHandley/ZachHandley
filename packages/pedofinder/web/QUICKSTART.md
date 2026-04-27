# Pedofinder Web - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd packages/pedofinder/web
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_APPWRITE_ENDPOINT=https://appwrite.blackleafdigital.com/v1
VITE_APPWRITE_PROJECT_ID=691779a3003300288357
VITE_APPWRITE_DATABASE_ID=pedofinder
```

### 3. Start Development Server
```bash
pnpm dev
```

Visit: http://localhost:3000

### 4. Build for Production
```bash
pnpm build
pnpm preview
```

## Project Overview

```
web/
├── src/
│   ├── components/     # 11 reusable components
│   ├── views/          # 5 main pages
│   ├── services/       # API clients
│   ├── types/          # TypeScript types
│   └── styles/         # Global CSS
└── dist/              # Production build output
```

## Key Pages

- **/** - Home (Search)
- **/graph** - Network Graph
- **/statistics** - Analytics Dashboard
- **/entity/:type/:id** - Entity Profile
- **/document/:id** - Document Viewer

## Tech Stack

- Vue 3.5 + TypeScript 5.8
- ECharts 5.5 (all visualizations)
- Appwrite SDK 16 (backend)
- Vite 6 (build tool)
- Zod 3 (validation)

## Common Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm type-check   # Validate TypeScript
```

## API Services

```typescript
// Search documents
import { documentsApi } from '@/services/appwrite';
const results = await documentsApi.search('query');

// Get top people
import { peopleApi } from '@/services/appwrite';
const people = await peopleApi.getTopByMentions(20);

// Get entity
import { entitiesApi } from '@/services/appwrite';
const entity = await entitiesApi.getById(id, 'person');
```

## ECharts Visualizations

All visualizations use ECharts:
- Network Graph (force-directed)
- Bar Charts (top entities)
- Pie Charts (distributions)
- Line Charts (timelines)
- Word Clouds (frequency)

## Type Safety

```typescript
import { EntityPersonSchema } from '@/types/entities';

// Runtime validation
const person = EntityPersonSchema.parse(data);

// TypeScript inference
type Person = z.infer<typeof EntityPersonSchema>;
```

## Styling

Dark theme with CSS variables:
```css
--color-bg: #0f172a
--color-primary: #3b82f6
--color-person: #8b5cf6
--color-org: #f59e0b
--color-location: #10b981
```

## Optional: Pinecone Setup

For semantic search:

1. Add to `.env`:
```env
VITE_PINECONE_API_KEY=your_key
VITE_PINECONE_ENVIRONMENT=your_env
VITE_PINECONE_INDEX_NAME=pedofinder-embeddings
```

2. Implement embedding service (see README.md)

## Troubleshooting

**Appwrite connection fails:**
- Check `.env` variables
- Verify Appwrite instance is running
- Check browser console for CORS errors

**Charts not rendering:**
- Ensure container has explicit height
- Check ECharts components are registered
- Verify data format

**Type errors:**
- Run `pnpm type-check`
- Update Zod schemas to match API
- Check TypeScript version

## Production Deployment

1. Build: `pnpm build`
2. Output: `dist/` directory
3. Deploy to:
   - Cloudflare Pages
   - Vercel
   - Netlify
   - Any static host

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment
3. ✅ Start dev server
4. 🔄 Verify Appwrite connection
5. 🔄 Test search functionality
6. 🔄 Explore network graph
7. 🔄 Build for production

## Documentation

- **README.md** - Full documentation
- **WEB_FRONTEND_SUMMARY.md** - Implementation details
- **QUICKSTART.md** - This file

## Support

See README.md for detailed information on:
- Component structure
- API usage
- Type system
- Customization
- Performance optimization
