# CLAUDE.md - Project Documentation for Claude Code

## Project Overview
This is **ZachHandley's Personal Portfolio Website** - an interactive 3D medieval-themed link hub built as a modern web application. The site features a dragon character, interactive crates for navigation, and a rich 3D medieval environment to showcase Zach's professional and personal links.

## Project Type
- **Personal Portfolio Website** with 3D interactive elements
- **Single-page application (SPA)** with immersive user experience
- **Link aggregation site** similar to Linktree but with 3D medieval theming

## Technology Stack

### Frontend Framework
- **Astro 5.7.13** - Main static site framework with SSR capabilities
- **Svelte 5.28.2** - Primary UI framework for reactive components
- **Vue 3.5.13** - Secondary framework for Vue components
- **TypeScript 5.8.3** - Type-safe development

### 3D Graphics & Animation
- **Three.js 0.176.0** - Core 3D graphics library
- **Threlte 8.0.4** - Svelte integration for Three.js
- **@threlte/extras 9.2.1** - Additional Threlte utilities
- **@threlte/flex 2.0.3** - Layout utilities for 3D scenes

### Styling & UI
- **Tailwind CSS 4.1.6** - Utility-first CSS framework
- **Inter Font Family** - Typography (multiple weights/styles)
- **Custom CSS** for 3D-specific styling and accessibility

### Development Tools
- **pnpm** - Package manager (lock file present)
- **Devbox** - Development environment management
- **TypeScript paths** - Module resolution with aliases
- **Vite plugins** - Build optimization and polyfills

### Deployment & Hosting
- **Cloudflare Workers** - Serverless deployment target
- **Wrangler** - Cloudflare deployment tool
- **Node.js compatibility** - For server-side features

### Analytics & Monitoring
- **Microsoft Clarity** - User behavior tracking and performance monitoring

## Project Structure

### Root Level
```
/home/zach/github/ZachHandley/
├── README.md                    # Main project description
├── LICENSE.md                   # License information
└── website/                     # Main application directory
```

### Website Directory (`/website/`)
```
website/
├── package.json                 # Dependencies and scripts
├── astro.config.ts             # Astro configuration
├── tsconfig.json               # TypeScript configuration
├── svelte.config.js            # Svelte configuration
├── wrangler.toml               # Cloudflare deployment config
├── devbox.json                 # Development environment
├── pnpm-lock.yaml              # Dependency lock file
├── public/                     # Static assets
│   ├── models/                 # 3D models (.glb files)
│   ├── sounds/                 # Audio files
│   ├── textures/               # Texture files
│   ├── fonts/                  # Inter font family
│   └── files/                  # Downloadable files (resume, VCF)
└── src/                        # Source code
```

### Source Code Structure (`/website/src/`)
```
src/
├── pages/
│   └── index.astro             # Main page entry point
├── layouts/
│   └── Layout.astro            # Base HTML layout
├── components/
│   ├── global/                 # Astro global components
│   ├── svelte/                 # Svelte components
│   │   ├── LinkApp.svelte      # Main application component
│   │   ├── models/             # 3D model components
│   │   │   ├── Dragon.svelte
│   │   │   ├── FireAnimation.svelte
│   │   │   ├── CrateExplode.svelte
│   │   │   └── ground/         # Environment models
│   │   └── scene/              # 3D scene components
│   │       ├── BaseScene.svelte    # Main 3D scene
│   │       ├── Ground.svelte       # Environment layout
│   │       ├── StackedLinks.svelte # Link display UI
│   │       ├── effects/            # Visual effects
│   │       └── links/              # Interactive link components
│   └── vue/                    # Vue components (unused currently)
├── types/                      # TypeScript type definitions
│   ├── baseSchemas.ts          # Zod schemas for data validation
│   ├── fireballTypes.ts        # 3D effect types
│   └── skeletonProps.ts        # Component prop types
├── utils/                      # Utility functions
├── styles/
│   └── global.css              # Global styles (Tailwind import)
└── assets/                     # Source assets
    └── models/                 # Original GLTF models
```

## Key Features & Architecture

### 3D Scene Architecture
- **BaseScene.svelte** - Main 3D scene coordinator
- **Dragon.svelte** - Central character model
- **Ground.svelte** - Environment with interactive crates
- **Fireball effects** - Visual feedback for interactions
- **Medieval assets** - Trees, rocks, mountains, temple elements

### Link Management System
- **Category-based organization** (personal, professional, projects, downloads)
- **Interactive crates** - Each crate represents a category
- **Responsive link display** - StackedLinks component shows category contents
- **Multiple link types** - URLs, downloads, contact info

### Accessibility Features
- **Screen reader support** - Hidden accessible navigation
- **Keyboard navigation** - Tab-based interaction mode
- **Focus management** - Proper ARIA labels and structure
- **Skip links** - Direct access to content

### Responsive Design
- **Mobile-first approach** - Touch-friendly interactions
- **Viewport adaptation** - 3D scene scales with screen size
- **Progressive enhancement** - Fallback navigation for accessibility

## Build System & Configuration

### Package Management
- **pnpm** as package manager
- **Node.js compatibility** flags for Cloudflare Workers
- **Development dependencies** include formatters and build tools

### Build Process
1. **Astro build** - Static site generation with SSR
2. **Vite bundling** - Module bundling and optimization
3. **TypeScript compilation** - Type checking and transpilation
4. **Asset optimization** - Image and model optimization

### Deployment
- **Target**: Cloudflare Workers with static assets
- **Configuration**: `wrangler.toml` for deployment settings
- **Assets**: Served from Cloudflare's CDN
- **Domain**: `dev.zachhandley.com` (development) / `zachhandley.com` (production)

## Development Environment

### Local Development
```bash
cd website
pnpm install        # Install dependencies
pnpm run dev        # Start development server (port 3000)
pnpm run build      # Build for production
pnpm run preview    # Preview production build
```

### Required Tools
- **Node.js** (for pnpm and build tools)
- **pnpm** (package manager)
- **Devbox** (optional, for consistent dev environment)

### Environment Configuration
- **TypeScript paths** - Alias imports (`~/components/*`, `~/types/*`, etc.)
- **Vite plugins** - Node polyfills, top-level await, console removal
- **Integration settings** - Svelte and Vue component inclusion patterns

## Data Models & Types

### Link Schema (Zod)
```typescript
{
  name: string,           // Display name
  url?: string,          // Target URL
  type: "url" | "download" | "contact" | "action" | "category",
  icon?: string,         // Iconify icon name
  category?: string,     // Category for grouping
  position?: [x, y, z],  // 3D position (optional)
  action?: () => void    // Custom action (optional)
}
```

### Categories
- **personal** - Social media and personal links
- **professional** - Work-related profiles and companies
- **projects** - Portfolio projects and websites
- **downloads** - Resume, contact info, downloadable assets

## Important Files & Configurations

### Core Configuration Files
- `/website/package.json` - Dependencies and build scripts
- `/website/astro.config.ts` - Astro and Cloudflare configuration
- `/website/tsconfig.json` - TypeScript compiler options
- `/website/wrangler.toml` - Cloudflare Workers deployment config

### Entry Points
- `/website/src/pages/index.astro` - Main page (prerendered)
- `/website/src/components/svelte/LinkApp.svelte` - Main Svelte app
- `/website/src/components/svelte/scene/BaseScene.svelte` - 3D scene root

### Asset Directories
- `/website/public/models/` - 3D models (.glb format, Draco compressed)
- `/website/public/sounds/` - Audio files (Fireball.wav)
- `/website/public/files/` - Downloadable files (resume.pdf, contact.vcf)

## Development Notes

### 3D Asset Pipeline
- **Source models** - GLTF format in `/src/assets/models/`
- **Optimized models** - Compressed .glb files in `/public/models/`
- **Model attribution** - All models sourced from Quaternius
- **Asset preloading** - Fire animations and textures preloaded for performance

### Performance Considerations
- **Asset optimization** - Draco compression for 3D models
- **Preloading strategy** - Critical 3D assets loaded on initialization
- **Console removal** - Production builds strip console statements
- **Bundle optimization** - Top-level await and Node.js polyfills

### Current Development Status
Based on git status, active development includes:
- Crate explosion effects (`CrateExplode.svelte`)
- Link interaction improvements
- Fire animation optimizations
- UI responsiveness enhancements

## Future Development

### Planned Features (from TODO)
- Fix crate click event handling
- Improve text responsiveness
- Add GitHub repository links to UI
- Interactive dragon animations
- Day/night cycle toggle
- Medieval ambient audio
- Particle system improvements
- Mini-game integration

### Architecture Improvements
- Performance optimization for mobile devices
- Enhanced accessibility features
- Advanced 3D animations and interactions
- Content management system integration

---

**Note for Claude Code instances**: This is Zach Handley's personal portfolio website. When making changes, maintain the medieval theme, ensure accessibility compliance, and preserve the 3D interactive experience. Always test responsiveness and 3D performance on various devices.