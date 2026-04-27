# Installation Checklist

## Files Created: 26 Source Files

### Root Configuration (8 files)
- [x] package.json
- [x] tsconfig.json
- [x] tsconfig.node.json
- [x] vite.config.ts
- [x] .env.example
- [x] .gitignore
- [x] index.html
- [x] README.md
- [x] QUICKSTART.md

### Source Files (26 files)

#### Main Application (3 files)
- [x] src/main.ts
- [x] src/App.vue
- [x] src/router.ts

#### Styles (1 file)
- [x] src/styles/main.css

#### Services (3 files)
- [x] src/services/appwrite.ts
- [x] src/services/pinecone.ts
- [x] src/services/search.ts

#### Types (3 files)
- [x] src/types/entities.ts
- [x] src/types/documents.ts
- [x] src/types/api.ts

#### Views (5 files)
- [x] src/views/Home.vue
- [x] src/views/GraphView.vue
- [x] src/views/Statistics.vue
- [x] src/views/EntityView.vue
- [x] src/views/DocumentView.vue

#### Search Components (3 files)
- [x] src/components/search/SearchBar.vue
- [x] src/components/search/SearchFilters.vue
- [x] src/components/search/SearchResults.vue

#### Visualization Components (4 files)
- [x] src/components/visualization/NetworkGraph.vue
- [x] src/components/visualization/StatisticsCharts.vue
- [x] src/components/visualization/WordCloud.vue
- [x] src/components/visualization/Timeline.vue

#### Entity Components (2 files)
- [x] src/components/entity/EntityCard.vue
- [x] src/components/entity/EntityProfile.vue

#### Document Components (2 files)
- [x] src/components/document/DocumentList.vue
- [x] src/components/document/DocumentViewer.vue

## Installation Steps

### 1. Prerequisites
- [ ] Node.js 18+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Access to Appwrite instance

### 2. Install Dependencies
```bash
cd /home/zach/github/ZachHandley/packages/pedofinder/web
pnpm install
```

Expected output:
- ~40 packages installed
- ~150 MB in node_modules
- No errors

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and verify:
- [ ] VITE_APPWRITE_ENDPOINT set
- [ ] VITE_APPWRITE_PROJECT_ID set
- [ ] VITE_APPWRITE_DATABASE_ID set

### 4. Start Development Server
```bash
pnpm dev
```

Expected output:
- Server starts on http://localhost:3000
- No compilation errors
- No TypeScript errors

### 5. Verify Application

Open http://localhost:3000 and check:
- [ ] Page loads without errors
- [ ] Navigation bar visible
- [ ] Search bar displayed
- [ ] Statistics cards visible (may show 0 if no data)

### 6. Test Navigation
- [ ] Click "Search" - loads Home.vue
- [ ] Click "Network Graph" - loads GraphView.vue
- [ ] Click "Statistics" - loads Statistics.vue

### 7. Build for Production
```bash
pnpm build
```

Expected output:
- Build completes successfully
- dist/ directory created
- ~600 KB gzipped output

### 8. Preview Production Build
```bash
pnpm preview
```

Expected output:
- Preview server starts on http://localhost:4173
- Application loads and works

## Component Verification

### Search Components Work
- [ ] SearchBar accepts input
- [ ] SearchFilters toggle works
- [ ] SearchResults display (when data available)

### Visualization Components Work
- [ ] NetworkGraph renders ECharts graph
- [ ] StatisticsCharts show all 4 charts
- [ ] Charts are interactive (zoom, pan, hover)

### Entity Components Work
- [ ] EntityCard displays entity data
- [ ] EntityProfile shows details
- [ ] Navigation to entity pages works

### Document Components Work
- [ ] DocumentList displays documents
- [ ] DocumentViewer opens documents
- [ ] Entity highlighting works

## API Integration Verification

### Appwrite Connection
```bash
# In browser console:
import { documentsApi } from '@/services/appwrite';
const docs = await documentsApi.list({ limit: 1 });
console.log(docs);
```

Expected:
- [ ] No CORS errors
- [ ] Returns data or empty array
- [ ] No authentication errors

### Service Methods Work
- [ ] documentsApi.list() works
- [ ] peopleApi.getTopByMentions() works
- [ ] organizationsApi.list() works
- [ ] locationsApi.list() works

## Type Safety Verification

### TypeScript Compilation
```bash
pnpm type-check
```

Expected:
- [ ] No type errors
- [ ] All imports resolve
- [ ] Zod schemas validate

### Runtime Validation
- [ ] Zod schemas parse API responses
- [ ] Type guards work correctly
- [ ] No runtime type errors

## Performance Verification

### Build Size
- [ ] Main chunk < 300 KB
- [ ] vue-vendor chunk < 200 KB
- [ ] echarts-vendor chunk < 500 KB
- [ ] Total gzipped < 800 KB

### Runtime Performance
- [ ] Page load < 2 seconds
- [ ] Search response < 500ms
- [ ] Graph renders smoothly
- [ ] No memory leaks

## Browser Compatibility

Test in:
- [ ] Chrome/Edge 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Mobile Safari
- [ ] Chrome Mobile

## Optional: Pinecone Setup

If using semantic search:
- [ ] VITE_PINECONE_API_KEY set
- [ ] VITE_PINECONE_ENVIRONMENT set
- [ ] VITE_PINECONE_INDEX_NAME set
- [ ] Embedding service implemented
- [ ] Semantic search works

## Documentation Verification

Files present:
- [ ] README.md (comprehensive docs)
- [ ] QUICKSTART.md (5-minute setup)
- [ ] WEB_FRONTEND_SUMMARY.md (implementation details)
- [ ] INSTALLATION_CHECKLIST.md (this file)

## Common Issues & Solutions

### Issue: pnpm not found
Solution: `npm install -g pnpm`

### Issue: Port 3000 in use
Solution: Vite will auto-increment to 3001, 3002, etc.

### Issue: Appwrite connection fails
Solution:
1. Check .env variables
2. Verify Appwrite is running
3. Check CORS settings
4. Verify project ID and database ID

### Issue: Charts not rendering
Solution:
1. Check ECharts components registered in main.ts
2. Verify chart container has explicit height
3. Check data format matches ECharts docs

### Issue: Type errors
Solution:
1. Run `pnpm type-check`
2. Update Zod schemas to match API
3. Check TypeScript version compatibility

### Issue: Build fails
Solution:
1. Clear node_modules and reinstall
2. Check for syntax errors
3. Verify all imports are correct

## Success Criteria

All of the following should be true:
- ✅ All 26 source files created
- ✅ Dependencies installed without errors
- ✅ TypeScript compiles without errors
- ✅ Dev server starts successfully
- ✅ Application loads in browser
- ✅ Navigation works
- ✅ Search functionality works (when data available)
- ✅ ECharts visualizations render
- ✅ Production build succeeds
- ✅ No console errors

## Next Steps After Installation

1. **Populate Database**
   - Run Python scraper to download PDFs
   - Process documents to extract entities
   - Verify data in Appwrite

2. **Test Full Workflow**
   - Search for entities
   - View network graph
   - Explore entity profiles
   - Read documents

3. **Customize**
   - Adjust color scheme in main.css
   - Modify ECharts options for charts
   - Add custom filters or views

4. **Deploy**
   - Build for production
   - Deploy to hosting service
   - Configure domain and SSL

## Support

If you encounter issues:
1. Check this checklist
2. Read README.md
3. Check browser console for errors
4. Verify Appwrite connection
5. Check network tab for API calls

## Installation Complete!

If all checkboxes are marked, your installation is complete and ready for use.

Date completed: _____________
Version: 0.1.0
