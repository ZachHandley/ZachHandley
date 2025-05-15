<script lang="ts">
  import { T, type Props } from "@threlte/core";
  import * as THREE from "three";
  import { useDraco } from "@threlte/extras";
  import BrickWall from "./ground/WallBricks.svelte";
  import EntranceBrickWall from "./ground/WallEntranceBricks.svelte";
  import SquareWindow from "./ground/WindowSquare.svelte";
  import PointyTower from "./ground/PointyTower.svelte";
  import LargeSquareTowerBricks from "./ground/LargeSquareTowerBricks.svelte";
  import TallWallBricks from "./ground/TallWallBricks.svelte";
  import type { DRACOLoader } from "three/examples/jsm/Addons.js";
  import type { Snippet } from "svelte";

  let castleRef = $state<THREE.Group | undefined>(undefined);

  let {
    ref = $bindable(),
    fallback,
    error,
    children,
    dracoLoader,
    ...props
  }: Props<THREE.Group> & {
    ref?: THREE.Group;
    fallback?: Snippet;
    dracoLoader?: DRACOLoader;
  } = $props();

  if (!dracoLoader) {
    dracoLoader = useDraco();
  }
  
  // Define castle layout components
  const castleLayout = {
    // Main walls
    walls: [
      { position: [-2, 0, -2], rotation: [0, 0, 0], scale: 1 },
      { position: [2, 0, -2], rotation: [0, 0, 0], scale: 1 },
      { position: [-2, 0, 2], rotation: [0, Math.PI, 0], scale: 1 },
      { position: [2, 0, 2], rotation: [0, Math.PI, 0], scale: 1 },
      
      // Side walls
      { position: [-4, 0, 0], rotation: [0, Math.PI * 1.5, 0], scale: 1 },
      { position: [4, 0, 0], rotation: [0, Math.PI * 0.5, 0], scale: 1 }
    ],
    
    // Tall walls (inner bailey)
    tallWalls: [
      { position: [-1, 0, -0.5], rotation: [0, 0, 0], scale: 0.8 },
      { position: [1, 0, -0.5], rotation: [0, 0, 0], scale: 0.8 },
      { position: [-1, 0, 0.5], rotation: [0, Math.PI, 0], scale: 0.8 },
      { position: [1, 0, 0.5], rotation: [0, Math.PI, 0], scale: 0.8 },
    ],
    
    // Entrance gate
    entrance: [
      { position: [0, 0, -2], rotation: [0, 0, 0], scale: 1 }
    ],
    
    // Corner towers
    cornerTowers: [
      { position: [-4, 0, -2], rotation: [0, Math.PI * 0.25, 0], scale: 1 },
      { position: [4, 0, -2], rotation: [0, Math.PI * -0.25, 0], scale: 1 },
      { position: [-4, 0, 2], rotation: [0, Math.PI * 0.75, 0], scale: 1 },
      { position: [4, 0, 2], rotation: [0, Math.PI * -0.75, 0], scale: 1 }
    ],
    
    // Main central tower
    centralTower: [
      { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1.2 }
    ],
    
    // Windows for walls
    windows: [
      // Front wall windows
      { position: [-2.5, 1, -2.05], rotation: [0, 0, 0], scale: 0.5 },
      { position: [-1.5, 1, -2.05], rotation: [0, 0, 0], scale: 0.5 },
      { position: [1.5, 1, -2.05], rotation: [0, 0, 0], scale: 0.5 },
      { position: [2.5, 1, -2.05], rotation: [0, 0, 0], scale: 0.5 },
      
      // Back wall windows
      { position: [-2.5, 1, 2.05], rotation: [0, Math.PI, 0], scale: 0.5 },
      { position: [-1.5, 1, 2.05], rotation: [0, Math.PI, 0], scale: 0.5 },
      { position: [1.5, 1, 2.05], rotation: [0, Math.PI, 0], scale: 0.5 },
      { position: [2.5, 1, 2.05], rotation: [0, Math.PI, 0], scale: 0.5 },
      
      // Side wall windows
      { position: [-4.05, 1, -0.5], rotation: [0, Math.PI * 1.5, 0], scale: 0.5 },
      { position: [-4.05, 1, 0.5], rotation: [0, Math.PI * 1.5, 0], scale: 0.5 },
      { position: [4.05, 1, -0.5], rotation: [0, Math.PI * 0.5, 0], scale: 0.5 },
      { position: [4.05, 1, 0.5], rotation: [0, Math.PI * 0.5, 0], scale: 0.5 },
    ],
    
    // Pointy towers (decorative smaller towers)
    pointyTowers: [
      // Front towers
      { position: [-2, 1.5, -2], rotation: [0, 0, 0], scale: 0.5 },
      { position: [2, 1.5, -2], rotation: [0, 0, 0], scale: 0.5 },
      
      // Back towers
      { position: [-2, 1.5, 2], rotation: [0, 0, 0], scale: 0.5 },
      { position: [2, 1.5, 2], rotation: [0, 0, 0], scale: 0.5 },
      
      // Central tower top
      { position: [0, 3, 0], rotation: [0, 0, 0], scale: 0.7 }
    ]
  };
</script>

<T.Group
  bind:ref={castleRef}
  position={[0, -1, -140]}
  rotation={[0, 0, 0]}
  scale={1}
  {...props}
>
  <!-- Basic walls -->
  {#each castleLayout.walls as wall}
    <BrickWall 
      position={[wall.position[0], wall.position[1], wall.position[2]]}
      rotation={[wall.rotation[0], wall.rotation[1], wall.rotation[2]]}
      scale={wall.scale}
      {dracoLoader} 
    />
  {/each}
  
  <!-- Tall Walls for inner bailey -->
  {#each castleLayout.tallWalls as tallWall}
    <TallWallBricks 
      position={[tallWall.position[0], tallWall.position[1], tallWall.position[2]]} 
      rotation={[tallWall.rotation[0], tallWall.rotation[1], tallWall.rotation[2]]} 
      scale={tallWall.scale}
      {dracoLoader} 
    />
  {/each}
  
  <!-- Entrance gate -->
  {#each castleLayout.entrance as entrance}
    <EntranceBrickWall 
      position={[entrance.position[0], entrance.position[1], entrance.position[2]]} 
      rotation={[entrance.rotation[0], entrance.rotation[1], entrance.rotation[2]]} 
      scale={entrance.scale}
      {dracoLoader} 
    />
  {/each}
  
  <!-- Windows -->
  {#each castleLayout.windows as window}
    <SquareWindow 
      position={[window.position[0], window.position[1], window.position[2]]} 
      rotation={[window.rotation[0], window.rotation[1], window.rotation[2]]} 
      scale={window.scale}
      {dracoLoader} 
    />
  {/each}
  
  <!-- Corner towers -->
  {#each castleLayout.cornerTowers as tower}
    <PointyTower 
      position={[tower.position[0], tower.position[1], tower.position[2]]} 
      rotation={[tower.rotation[0], tower.rotation[1], tower.rotation[2]]} 
      scale={tower.scale}
      {dracoLoader} 
    />
  {/each}
  
  <!-- Pointy decorative towers -->
  {#each castleLayout.pointyTowers as pointyTower}
    <PointyTower 
      position={[pointyTower.position[0], pointyTower.position[1], pointyTower.position[2]]} 
      rotation={[pointyTower.rotation[0], pointyTower.rotation[1], pointyTower.rotation[2]]} 
      scale={pointyTower.scale}
      {dracoLoader} 
    />
  {/each}
  
  <!-- Main central tower -->
  {#each castleLayout.centralTower as centerTower}
    <LargeSquareTowerBricks 
      position={[centerTower.position[0], centerTower.position[1], centerTower.position[2]]} 
      rotation={[centerTower.rotation[0], centerTower.rotation[1], centerTower.rotation[2]]} 
      scale={centerTower.scale}
      {dracoLoader} 
    />
  {/each}
</T.Group>
