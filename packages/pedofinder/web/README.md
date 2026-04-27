# Pedofinder Web Frontend

Complete TypeScript-based web interface for the Pedofinder document analysis platform. Built with Vue 3, ECharts visualizations, and Appwrite backend integration.

## Features

- **Full-Text Search** - Search documents using Appwrite's built-in search
- **Semantic Search** - Vector-based similarity search using Pinecone (optional)
- **Interactive Network Graph** - Visualize entity relationships with ECharts force-directed graph
- **Statistics Dashboard** - Analytics and insights with multiple chart types
- **Entity Profiles** - Detailed views of people, organizations, and locations
- **Document Viewer** - Read documents with highlighted entities
- **Responsive Design** - Works on desktop, tablet, and mobile devices

## Tech Stack

- **Vue 3.5+** - Composition API for reactive components
- **TypeScript 5.8+** - Full type safety
- **Vite 6** - Fast build tool and dev server
- **Vue Router 4** - Client-side routing
- **ECharts 5** - All data visualizations (graphs, charts, network diagrams)
- **Appwrite SDK 16** - Self-hosted backend (https://appwrite.blackleafdigital.com/v1)
- **Zod 3** - Runtime type validation
- **Pinecone** - Optional vector search integration

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── search/              # Search interface components
│   │   │   ├── SearchBar.vue
│   │   │   ├── SearchFilters.vue
│   │   │   └── SearchResults.vue
│   │   ├── visualization/       # ECharts visualizations
│   │   │   ├── NetworkGraph.vue      # Force-directed entity graph
│   │   │   ├── StatisticsCharts.vue  # Multiple chart types
│   │   │   ├── WordCloud.vue         # Word frequency cloud
│   │   │   └── Timeline.vue          # Event timeline
│   │   ├── entity/              # Entity display components
│   │   │   ├── EntityCard.vue
│   │   │   └── EntityProfile.vue
│   │   └── document/            # Document components
│   │       ├── DocumentList.vue
│   │       └── DocumentViewer.vue
│   ├── views/
│   │   ├── Home.vue             # Main search page
│   │   ├── GraphView.vue        # Network graph visualization
│   │   ├── Statistics.vue       # Statistics dashboard
│   │   ├── EntityView.vue       # Entity profile page
│   │   └── DocumentView.vue     # Document viewer
│   ├── services/
│   │   ├── appwrite.ts          # Appwrite client & API
│   │   ├── pinecone.ts          # Pinecone vector search
│   │   └── search.ts            # Unified search service
│   ├── types/
│   │   ├── entities.ts          # Entity type definitions
│   │   ├── documents.ts         # Document types
│   │   └── api.ts              # API response types
│   ├── styles/
│   │   └── main.css            # Global styles
│   ├── router.ts               # Vue Router configuration
│   ├── App.vue                 # Root component
│   └── main.ts                 # Application entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Installation

### Prerequisites

- Node.js 18+ or Bun
- pnpm (or npm/yarn)
- Access to Appwrite instance at https://appwrite.blackleafdigital.com/v1
- (Optional) Pinecone API key for semantic search

### Setup

1. **Install dependencies:**
   ```bash
   cd packages/pedofinder/web
   pnpm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```env
   # Appwrite Configuration (Required)
   VITE_APPWRITE_ENDPOINT=https://appwrite.blackleafdigital.com/v1
   VITE_APPWRITE_PROJECT_ID=691779a3003300288357
   VITE_APPWRITE_DATABASE_ID=pedofinder

   # Pinecone Configuration (Optional - for semantic search)
   VITE_PINECONE_API_KEY=your_api_key
   VITE_PINECONE_ENVIRONMENT=your_environment
   VITE_PINECONE_INDEX_NAME=pedofinder-embeddings
   ```

3. **Start development server:**
   ```bash
   pnpm dev
   ```

   The app will be available at `http://localhost:3000`

4. **Build for production:**
   ```bash
   pnpm build
   ```

   Output will be in `dist/` directory.

5. **Preview production build:**
   ```bash
   pnpm preview
   ```

## Appwrite Integration

The application connects to a self-hosted Appwrite instance with the following structure:

### Database: `pedofinder`

#### Collections (Tables):

1. **documents** - Processed documents
   - Fields: filename, document_id, raw_text, processed_text, summary, tags, entities, processing_status
   - Full-text search enabled on: raw_text, processed_text, summary

2. **entities_people** - Person entities
   - Fields: name, normalized_name, mention_count, document_ids, confidence, related_entities, aliases, titles

3. **entities_orgs** - Organization entities
   - Fields: name, normalized_name, mention_count, document_ids, confidence, related_entities, industry

4. **entities_locations** - Location entities
   - Fields: name, normalized_name, mention_count, document_ids, confidence, related_entities, coordinates

5. **entities_dates** - Date entities
   - Fields: date_text, normalized_date, mention_count, document_ids, confidence, context

### API Usage

```typescript
// Search documents
import { documentsApi } from '@/services/appwrite';

const results = await documentsApi.search('Jeffrey Epstein', {
  limit: 20,
  offset: 0,
  orderBy: 'mention_count',
  orderDirection: 'desc',
});

// Get top people
import { peopleApi } from '@/services/appwrite';

const topPeople = await peopleApi.getTopByMentions(20);

// Get entity by ID
import { entitiesApi } from '@/services/appwrite';

const entity = await entitiesApi.getById('entity_id', 'person');
```

## Pinecone Integration (Optional)

For semantic search capabilities:

1. **Set up Pinecone:**
   - Create a Pinecone account at https://www.pinecone.io/
   - Create an index with the same dimensions as your embeddings
   - Add API credentials to `.env`

2. **Implement embedding service:**

   The Pinecone service is ready but requires an embedding generation service. You need to:

   ```typescript
   // Example: Using OpenAI embeddings
   import OpenAI from 'openai';

   async function generateEmbedding(text: string): Promise<number[]> {
     const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
     const response = await openai.embeddings.create({
       model: 'text-embedding-3-small',
       input: text,
     });
     return response.data[0].embedding;
   }

   // Then use with Pinecone
   import { pineconeService } from '@/services/pinecone';

   const embedding = await generateEmbedding(query);
   const results = await pineconeService.searchByVector(embedding, { topK: 10 });
   ```

## ECharts Visualizations

All visualizations use Apache ECharts for consistent, high-performance rendering.

### Network Graph (GraphView.vue)

- **Type:** Force-directed graph
- **Features:**
  - Interactive node selection (click to view entity)
  - Zoom and pan controls
  - Color-coded by entity type
  - Node size based on mention count
  - Edge thickness based on co-occurrence frequency
  - Automatic layout with physics simulation

### Statistics Charts (StatisticsCharts.vue)

1. **Top People Bar Chart** - Horizontal bar chart of most mentioned people
2. **Entity Distribution Pie Chart** - Breakdown of entity types
3. **Document Timeline** - Line chart with area fill showing document processing over time
4. **Processing Status Pie Chart** - Current status of all documents

### Customization

ECharts options can be customized in each component:

```typescript
const chartOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: { /* ... */ },
  series: [{ /* ... */ }],
  // ... more options
}));
```

## Type Safety

The application uses Zod schemas for runtime validation and TypeScript types for compile-time safety.

### Example Type Usage

```typescript
import { EntityPersonSchema, type EntityPerson } from '@/types/entities';

// Runtime validation
const person = EntityPersonSchema.parse(apiResponse);

// TypeScript type checking
function displayPerson(person: EntityPerson) {
  console.log(person.name, person.mention_count);
}
```

## Development

### Adding a New View

1. Create component in `src/views/YourView.vue`
2. Add route in `src/router.ts`:
   ```typescript
   {
     path: '/your-path',
     name: 'YourView',
     component: () => import('./views/YourView.vue'),
     meta: { title: 'Your View - Pedofinder' },
   }
   ```
3. Add navigation link in `App.vue`

### Adding a New API Endpoint

1. Define types in `src/types/`
2. Add API function in `src/services/appwrite.ts`:
   ```typescript
   export const yourApi = {
     async yourMethod(params) {
       const response = await databases.listDocuments(
         DATABASE_ID,
         'your_collection',
         [/* queries */]
       );
       return response;
     },
   };
   ```

### Adding a New Visualization

1. Create component in `src/components/visualization/`
2. Import and register ECharts components in `src/main.ts` if needed
3. Use `<v-chart>` component with ECharts options

## Performance Optimization

- **Code splitting** - Routes are lazy-loaded
- **Bundle optimization** - Vendor chunks for Vue, ECharts, Appwrite
- **Tree shaking** - Only used ECharts components are included
- **Image optimization** - Use WebP format when possible
- **Pagination** - Large result sets are paginated

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

## Troubleshooting

### Appwrite Connection Issues

1. Verify `.env` variables are set correctly
2. Check Appwrite instance is accessible
3. Ensure project ID and database ID are correct
4. Check browser console for CORS errors

### ECharts Not Rendering

1. Ensure container has explicit height in CSS
2. Check that required ECharts components are registered in `main.ts`
3. Verify data format matches ECharts documentation

### Type Errors

1. Run `pnpm type-check` to identify issues
2. Ensure Zod schemas match API responses
3. Check TypeScript version compatibility

## License

See parent project LICENSE.md

## Support

For issues, questions, or contributions, please refer to the main Pedofinder project repository.
