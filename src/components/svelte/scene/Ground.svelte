<script lang="ts">
  import { T } from "@threlte/core";
  import Rock1 from "../models/ground/Rock_1.svelte";
  import Rock2 from "../models/ground/Rock_4.svelte";
  import PineTree1 from "../models/ground/PineTree_1.svelte";
  import PineTree2 from "../models/ground/PineTree_4.svelte";
  import Grass from "../models/ground/Grass.svelte";
  import Flowers from "../models/ground/Flowers.svelte";
  import WoodLogMoss from "../models/ground/WoodLog_Moss.svelte";
  import TempleSecondAge from "../models/ground/TempleSecondAge.svelte";
  import MountainGroup1 from "../models/ground/Mountain_Group_1.svelte";
  import MountainGroup2 from "../models/ground/Mountain_Group_2.svelte";
  import { useDraco } from "@threlte/extras";

  const dracoLoader = useDraco();

  // Define the areas where we want to place objects
  const groundArea = {
    width: 150,
    length: 300,
    minX: -150,
    maxX: 150,
    minZ: -300,
    maxZ: 300,
  };

  // Updated path boundary to match current positioning
  const pathBoundary = {
    minX: -12,
    maxX: 12,
    minZ: -30,
    maxZ: 10,
  };

  // Generate random positions for grass, avoiding the path
  const grassCount = 1000;
  const grassInstances = Array.from({ length: grassCount }, () => {
    let x, z;
    do {
      x = Math.random() * groundArea.width - groundArea.width / 2;
      z = Math.random() * groundArea.length - groundArea.length / 2;
    } while (
      x >= pathBoundary.minX &&
      x <= pathBoundary.maxX &&
      z >= pathBoundary.minZ &&
      z <= pathBoundary.maxZ
    );

    return {
      position: [x, -1, z],
      rotation: [0, Math.random() * Math.PI * 2, 0],
      scale: 0.5 + Math.random() * 0.5,
    };
  });

  // Instead of random flowers, create specific flower beds
  const flowerPlacements = [
    // Left side flower beds
    { position: [-20, -1, 5], rotation: [0, 0.2, 0], scale: 3 },
    { position: [-18, -1, 7], rotation: [0, 0.7, 0], scale: 5 },
    { position: [-22, -1, 6], rotation: [0, 1.1, 0], scale: 4 },
    { position: [-25, -1, 3], rotation: [0, 0.5, 0], scale: 3 },
    { position: [-15, -1, -5], rotation: [0, 1.9, 0], scale: 4 },

    // Right side flower beds
    { position: [20, -1, 5], rotation: [0, 0.5, 0], scale: 5 },
    { position: [18, -1, 7], rotation: [0, 1.3, 0], scale: 4 },
    { position: [22, -1, 6], rotation: [0, 2.0, 0], scale: 4 },
    { position: [25, -1, 3], rotation: [0, 0.8, 0], scale: 3 },
    { position: [15, -1, -5], rotation: [0, 1.2, 0], scale: 4 },

    // Path entrance decorative flowers
    { position: [-13, -1, 15], rotation: [0, 0.3, 0], scale: 5 },
    { position: [13, -1, 15], rotation: [0, 1.1, 0], scale: 5 },

    // Near temple decorative flowers
    { position: [-13, -1, -29], rotation: [0, 0.7, 0], scale: 4 },
    { position: [13, -1, -29], rotation: [0, 1.9, 0], scale: 4 },

    // Scattered decorative flowers
    { position: [-45, -1, -15], rotation: [0, 0.9, 0], scale: 3 },
    { position: [45, -1, -15], rotation: [0, 1.5, 0], scale: 3 },
    { position: [-35, -1, -30], rotation: [0, 2.1, 0], scale: 4 },
    { position: [35, -1, -30], rotation: [0, 0.4, 0], scale: 4 },
    { position: [-25, -1, -20], rotation: [0, 1.2, 0], scale: 3 },
    { position: [25, -1, -20], rotation: [0, 0.6, 0], scale: 3 },
  ];

  const flowerInstances = flowerPlacements;

  // Define specific tree placements for the avenue effect and some scattered trees
  const treePlacements = [
    // Left side of path
    {
      type: "PineTree1",
      position: [-32, -1, -5],
      rotation: [0, 0.2, 0],
      scale: 6,
    },
    {
      type: "PineTree2",
      position: [-32, -1, -15],
      rotation: [0, 1.2, 0],
      scale: 5.5,
    },
    {
      type: "PineTree1",
      position: [-32, -1, -25],
      rotation: [0, 0.5, 0],
      scale: 6,
    },
    {
      type: "PineTree2",
      position: [-32, -1, -35],
      rotation: [0, 2.1, 0],
      scale: 5.8,
    },
    {
      type: "PineTree1",
      position: [-40, -1, -10],
      rotation: [0, 0.8, 0],
      scale: 6.2,
    },
    {
      type: "PineTree2",
      position: [-45, -1, -25],
      rotation: [0, 1.5, 0],
      scale: 5.5,
    },
    {
      type: "PineTree1",
      position: [-38, -1, -40],
      rotation: [0, 2.3, 0],
      scale: 6,
    },

    // Right side of path
    {
      type: "PineTree1",
      position: [32, -1, -5],
      rotation: [0, 1.2, 0],
      scale: 6,
    },
    {
      type: "PineTree2",
      position: [32, -1, -15],
      rotation: [0, 0.3, 0],
      scale: 5.7,
    },
    {
      type: "PineTree1",
      position: [32, -1, -25],
      rotation: [0, 1.8, 0],
      scale: 5.9,
    },
    {
      type: "PineTree2",
      position: [32, -1, -35],
      rotation: [0, 0.7, 0],
      scale: 6.1,
    },
    {
      type: "PineTree1",
      position: [40, -1, -10],
      rotation: [0, 2.4, 0],
      scale: 5.8,
    },
    {
      type: "PineTree2",
      position: [45, -1, -25],
      rotation: [0, 0.9, 0],
      scale: 5.6,
    },
    {
      type: "PineTree1",
      position: [38, -1, -40],
      rotation: [0, 1.5, 0],
      scale: 6.2,
    },

    // Scattered trees
    {
      type: "PineTree1",
      position: [-75, -1, -20],
      rotation: [0, 0.4, 0],
      scale: 5,
    },
    {
      type: "PineTree2",
      position: [-85, -1, -8],
      rotation: [0, 1.7, 0],
      scale: 5.5,
    },
    {
      type: "PineTree1",
      position: [-65, -1, -18],
      rotation: [0, 0.8, 0],
      scale: 6,
    },
    {
      type: "PineTree2",
      position: [75, -1, -30],
      rotation: [0, 2.2, 0],
      scale: 5.3,
    },
    {
      type: "PineTree1",
      position: [85, -1, -12],
      rotation: [0, 1.1, 0],
      scale: 5.8,
    },
    {
      type: "PineTree2",
      position: [60, -1, -20],
      rotation: [0, 0.6, 0],
      scale: 6.1,
    },
  ];

  // Define rock placements
  const rockPlacements = [
    // Scattered rocks around the perimeter
    {
      type: "Rock1",
      position: [-45, -1, -12],
      rotation: [0, Math.PI * 0.2, 0],
      scale: [15, 10, 12],
    },
    {
      type: "Rock2",
      position: [45, -1, -12],
      rotation: [0, Math.PI * 0.7, 0],
      scale: [12, 8, 18],
    },
    {
      type: "Rock1",
      position: [-40, -1, -15],
      rotation: [0, Math.PI * 0.5, 0],
      scale: [18, 10, 12],
    },
    {
      type: "Rock2",
      position: [40, -1, -15],
      rotation: [0, Math.PI * 1.2, 0],
      scale: [14, 8, 14],
    },

    // LinkedIn Skeleton hideout
    {
      type: "Rock1",
      position: [16, -1, -3],
      rotation: [0, Math.PI * 0.3, 0],
      scale: [10, 6, 7],
    },

    // Portfolio Skeleton hideout (near the barracks)
    {
      type: "Rock2",
      position: [14, -1, -12],
      rotation: [0, Math.PI * 0.1, 0],
      scale: [6, 4, 6],
    },

    // Additional rocks for variety
    {
      type: "Rock1",
      position: [-60, -1, -50],
      rotation: [0, Math.PI * 0.8, 0],
      scale: [8, 5, 8],
    },
    {
      type: "Rock2",
      position: [55, -1, -16],
      rotation: [0, Math.PI * 1.5, 0],
      scale: [9, 6, 9],
    },
    {
      type: "Rock1",
      position: [-20, -1, -15],
      rotation: [0, Math.PI * 0.4, 0],
      scale: [12, 7, 10],
    },
    {
      type: "Rock2",
      position: [35, -1, -17],
      rotation: [0, Math.PI * 0.9, 0],
      scale: [10, 5, 8],
    },
  ];

  // Add some fallen logs for extra detail - more strategic placement
  const logPlacements = [
    { position: [-25, -1, -30], rotation: [0, Math.PI * 0.2, 0], scale: 3 },
    { position: [28, -1, -25], rotation: [0, Math.PI * 1.5, 0], scale: 3.2 },
    { position: [-42, -1, -15], rotation: [0, Math.PI * 0.7, 0], scale: 3.5 },
    { position: [40, -1, -3], rotation: [0, Math.PI * 0.3, 0], scale: 3 },
  ];

  // Group tree instances by type
  const pine1Instances = treePlacements
    .filter((tree) => tree.type === "PineTree1")
    .map(({ position, rotation, scale }) => ({
      position,
      rotation: Array.isArray(rotation) ? rotation : [0, rotation, 0],
      scale: Array.isArray(scale) ? scale : [scale, scale, scale],
    }));

  const pine2Instances = treePlacements
    .filter((tree) => tree.type === "PineTree2")
    .map(({ position, rotation, scale }) => ({
      position,
      rotation: Array.isArray(rotation) ? rotation : [0, rotation, 0],
      scale: Array.isArray(scale) ? scale : [scale, scale, scale],
    }));

  // Group rock instances by type
  const rock1Instances = rockPlacements
    .filter((rock) => rock.type === "Rock1")
    .map(({ position, rotation, scale }) => ({
      position,
      rotation: Array.isArray(rotation) ? rotation : [0, rotation, 0],
      scale: Array.isArray(scale) ? scale : [scale, scale, scale],
    }));

  const rock2Instances = rockPlacements
    .filter((rock) => rock.type === "Rock2")
    .map(({ position, rotation, scale }) => ({
      position,
      rotation: Array.isArray(rotation) ? rotation : [0, rotation, 0],
      scale: Array.isArray(scale) ? scale : [scale, scale, scale],
    }));
</script>

<!-- Ground Group -->
<T.Group position.z={0}>
  <!-- Main ground plane - made larger for orthographic view -->
  <T.Mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <T.PlaneGeometry args={[300, 600]} />
    <T.MeshStandardMaterial color="#4a7c59" />
  </T.Mesh>

  <!-- Path leading to barracks - aligned with center and widened -->
  <T.Mesh
    position={[0, -0.95, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
    receiveShadow
  >
    <T.PlaneGeometry args={[20, 80]} />
    <T.MeshStandardMaterial color="#8b7355" />
  </T.Mesh>

  <!-- Castle/Barracks at the back - positioned better for orthographic -->
  <TempleSecondAge
    {dracoLoader}
    position={[0, -1, -40]}
    rotation={[0, 0, 0]}
    scale={[20, 10, 10]}
  />

  <MountainGroup1
    {dracoLoader}
    position={[-100, -1, -100]}
    rotation={[0, 0, 0]}
    scale={[25, 25, 25]}
  />

  <MountainGroup1
    {dracoLoader}
    position={[100, -1, -100]}
    rotation={[0, 0, 0]}
    scale={[25, 25, 25]}
  />

  <MountainGroup1
    {dracoLoader}
    position={[0, -1, -100]}
    rotation={[0, Math.PI, 0]}
    scale={[20, 20, 20]}
  />

  <!-- Instanced Grass -->
  {#each grassInstances as instance}
    <Grass
      {dracoLoader}
      position={[
        instance.position[0],
        instance.position[1],
        instance.position[2],
      ]}
      rotation={[
        instance.rotation[0],
        instance.rotation[1],
        instance.rotation[2],
      ]}
      scale={instance.scale}
    />
  {/each}

  <!-- Instanced Flowers -->
  {#each flowerInstances as instance}
    <Flowers
      {dracoLoader}
      position={[
        instance.position[0],
        instance.position[1],
        instance.position[2],
      ]}
      rotation={[
        instance.rotation[0],
        instance.rotation[1],
        instance.rotation[2],
      ]}
      scale={instance.scale}
    />
  {/each}

  <!-- Instanced PineTree_1 -->
  {#each pine1Instances as instance}
    <PineTree1
      {dracoLoader}
      position={[
        instance.position[0],
        instance.position[1],
        instance.position[2],
      ]}
      rotation={[
        instance.rotation[0],
        instance.rotation[1],
        instance.rotation[2],
      ]}
      scale={[instance.scale[0], instance.scale[1], instance.scale[2]]}
    />
  {/each}

  <!-- Instanced PineTree_4 -->
  {#each pine2Instances as instance}
    <PineTree2
      {dracoLoader}
      position={[
        instance.position[0],
        instance.position[1],
        instance.position[2],
      ]}
      rotation={[
        instance.rotation[0],
        instance.rotation[1],
        instance.rotation[2],
      ]}
      scale={[instance.scale[0], instance.scale[1], instance.scale[2]]}
    />
  {/each}

  <!-- Instanced Rock_1 -->
  {#each rock1Instances as instance}
    <Rock1
      {dracoLoader}
      position={[
        instance.position[0],
        instance.position[1],
        instance.position[2],
      ]}
      rotation={[
        instance.rotation[0],
        instance.rotation[1],
        instance.rotation[2],
      ]}
      scale={[instance.scale[0], instance.scale[1], instance.scale[2]]}
    />
  {/each}

  <!-- Instanced Rock_2 -->
  {#each rock2Instances as instance}
    <Rock2
      {dracoLoader}
      position={[
        instance.position[0],
        instance.position[1],
        instance.position[2],
      ]}
      rotation={[
        instance.rotation[0],
        instance.rotation[1],
        instance.rotation[2],
      ]}
      scale={[instance.scale[0], instance.scale[1], instance.scale[2]]}
    />
  {/each}

  <!-- Instanced Fallen Logs -->
  {#each logPlacements as instance}
    <WoodLogMoss
      {dracoLoader}
      position={[
        instance.position[0],
        instance.position[1],
        instance.position[2],
      ]}
      rotation={[
        instance.rotation[0],
        instance.rotation[1],
        instance.rotation[2],
      ]}
      scale={instance.scale}
    />
  {/each}
</T.Group>
