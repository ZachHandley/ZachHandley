# Medieval Link Site - Zachary Handley

An interactive 3D medieval-themed link hub for Zachary Handley's online presence. Features a dragon, skeletons, and category-based navigation system with crates containing links. Made public because I think it's cool.

All models are sourced from Quaternius

## 🐲 Overview

This custom link site provides an engaging 3D experience for visitors to access Zachary's various online profiles and projects. The medieval theme features:

- A 3D dragon character centered in a rich medieval environment
- Interactive crate-based navigation system for link categories
- Skeleton figures and fire animations for visual interest
- Detailed environment with mountains, trees, rocks, and temple elements
- Mobile-responsive design with accessibility features

## 🛠️ Tech Stack

- **Astro** - Static site framework
- **Svelte** - Reactive UI components
- **Threlte** - Svelte integration for Three.js
- **Three.js** - 3D graphics library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling

## ✨ Features

- **Immersive Medieval Environment**
  - Detailed dragon model as central element
  - Rich scenery with mountains, trees, rocks, and temple
  - Ambient medieval atmosphere
- **Categorized Link System**
  - Crate-based category navigation
  - Stacked links interface for organized access
  - Visual feedback on interaction
- **Special Effects**
  - Fire animations for visual interest
  - Fireball effects for interactive feedback
- **Accessibility**
  - Keyboard navigation support
  - Screen reader compatible
  - Alternative navigation options
- **Mobile Friendly**
  - Touch support
  - Responsive design
  - Optimized performance
- **Microsoft Clarity**
  - Performance monitoring
  - User behavior tracking

## 🏗️ Project Structure

```text
src/
├── components/
│   └── global/
├── svelte/
│   ├── models/
│   │   ├── ground/
│   │   │   ├── Crate.svelte
│   │   │   ├── Flowers.svelte
│   │   │   ├── Grass.svelte
│   │   │   ├── Mountain_Group_1.svelte
│   │   │   ├── Mountain_Group_2.svelte
│   │   │   ├── PineTree_1.svelte
│   │   │   ├── PineTree_4.svelte
│   │   │   ├── Rock_1.svelte
│   │   │   ├── Rock_4.svelte
│   │   │   ├── TempleSecondAge.svelte
│   │   │   └── WoodLog_Moss.svelte
│   │   ├── Dragon.svelte
│   │   ├── FireAnimation.svelte
│   │   └── Skeleton.svelte
│   ├── scene/
│   ├── effects/
│   │   └── Fireball.svelte
│   ├── links/
│   │   ├── CrateLink.svelte
│   │   ├── Link.svelte
│   │   ├── BaseScene.svelte
│   │   ├── Castle.svelte
│   │   ├── Ground.svelte
│   │   ├── StackedLinks.svelte
│   │   └── UserInterface.svelte
│   └── static/
│       └── LinkApp.svelte
├── layouts/
│   └── Layout.astro
└── pages/
    └── index.astro
```

## 🎬 How It Works

1. **Initial Scene**: Medieval environment loads with dragon as central element
2. **Category Selection**: Click crates to:
   - Highlight the selected category
   - Reveal associated links in the stacked links interface
3. **Link Navigation**: Click any link to:
   - Open corresponding URL in new tab
   - Trigger visual feedback with fire/fireball animations

## 🚀 Getting Started

1. **Clone and Install**

   ```bash
   git clone https://github.com/ZachHandley/ZachHandley.git
   cd website
   pnpm install
   ```

2. **Development**

   ```bash
   pnpm run dev
   ```

3. **Build**

   ```bash
   pnpm run build
   ```

## 🎯 Link Categories

- Professional (GitHub, LinkedIn, Portfolio)
- Social (Twitter, Instagram)
- Projects
- Contact
- About

## 🔮 Future Enhancements

- [ ] Add interactive animations for the dragon
- [ ] Implement day/night cycle toggle
- [ ] Add ambient medieval music and sound effects
- [ ] Improve fireball effects with particle systems
- [ ] Implement custom crate designs for each category
- [ ] Make the crates explode on impact
- [ ] Add a mini-game
- [ ] Improve Fireball performance

## 🤝 Contributing

This is a personal project for Zachary Handley. For questions or suggestions, please reach out directly.

## 📝 License

Personal use only - Not for redistribution

---

Built with ❤️ by Zachary Handley
