<script lang="ts">
  import * as THREE from "three";
  import { Group, AnimationAction } from "three";
  import type { Snippet } from "svelte";
  import { T, type Props } from "@threlte/core";
  import {
    useGltf,
    useGltfAnimations,
    useSuspense,
    useDraco,
  } from "@threlte/extras";
  import { Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";

  const dracoLoader = useDraco();

  // Add our custom props to the component
  let {
    viewMode = "intro",
    dragonEyeGlow,
    handleDragonClick,
    initialFacingDirection = Math.PI, // Default to facing away if not provided
    dragonRef = $bindable<Group | null>(null),
    fallback,
    error,
    children,
    ref = $bindable(),
    scale,
    ...props
  } = $props<{
    viewMode?: "intro" | "links";
    dragonEyeGlow: number;
    handleDragonClick: () => void;
    initialFacingDirection?: number;
    dragonRef?: Group | null;
    ref?: Group;
    scale?: number | [number, number, number];
    fallback?: Snippet;
    error?: Snippet;
    children?: Snippet;
  }>();

  const suspend = useSuspense();

  ref = new Group();

  // Create an effect to keep dragonRef up to date with ref
  $effect(() => {
    if (ref && !dragonRef) {
      dragonRef = ref;
    }
  });

  // Tweened position for smooth dragon movement
  const dragonPosition = new Tween(
    { y: 0.5 }, // Initial floating position
    { duration: 2000, easing: cubicInOut }
  );

  // Create hover effect
  $effect(() => {
    // Create gentle floating animation
    console.log("Floating animation log");
    const intervalId = setInterval(() => {
      const currentY = dragonPosition.current.y;
      // If greater than 1.3, float up to 1, else float down to 1.5
      const targetY = currentY > 0.3 ? 0 : 0.5;
      dragonPosition.set({ y: targetY });
    }, 2000);

    return () => clearInterval(intervalId);
  });

  type ActionName = "Dragon_Flying" | "Dragon_Hit";
  type GLTFResult = {
    nodes: {
      Cylinder001: THREE.Mesh;
      Cylinder001_1: THREE.Mesh;
      Cylinder: THREE.SkinnedMesh;
      Cylinder_1: THREE.SkinnedMesh;
      Cylinder_2: THREE.SkinnedMesh;
      Cylinder_3: THREE.SkinnedMesh;
      Root: THREE.Bone;
    };
    materials: {
      Main: THREE.MeshStandardMaterial;
      Eyes: THREE.MeshStandardMaterial;
      Wings: THREE.MeshStandardMaterial;
      Belly: THREE.MeshStandardMaterial;
      Claws: THREE.MeshStandardMaterial;
    };
  };

  const gltfPromise = useGltf<GLTFResult>("/models/Dragon-transformed.glb", {
    dracoLoader,
  });
  const gltf = suspend(gltfPromise);
  let currentColor = $state("white");

  // Get animation actions
  const { actions, mixer } = useGltfAnimations<ActionName>(gltf, ref);

  // Control eye glow effect
  $effect(() => {
    if (dragonEyeGlow > 0 && $gltf?.materials?.Eyes && currentColor !== "red") {
      $gltf.materials.Eyes.emissive.set("red");
      $gltf.materials.Eyes.emissiveIntensity = dragonEyeGlow;
      currentColor = "red";
    } else if (
      dragonEyeGlow === 0 &&
      $gltf?.materials?.Eyes &&
      currentColor !== "white"
    ) {
      $gltf.materials.Eyes.emissive.set("white");
      $gltf.materials.Eyes.emissiveIntensity = 0;
      currentColor = "white";
    }

    return () => {
      if ($gltf?.materials?.Eyes && currentColor !== "white") {
        $gltf.materials.Eyes.emissive.set("white");
        $gltf.materials.Eyes.emissiveIntensity = 0;
      }
    };
  });

  // Control animations
  $effect(() => {
    if ($actions?.Dragon_Flying && !$actions.Dragon_Flying.isRunning()) {
      $actions.Dragon_Flying.play();
    }
  });

  // Calculate rotation based on view mode
  const rotation = $derived(
    viewMode === "intro" ? [0, initialFacingDirection, 0] : [0, 0, 0]
  );
</script>

<T
  is={ref}
  dispose={false}
  order={9999}
  position={[0, dragonPosition.current.y, 0]}
  {rotation}
  {scale}
  {...props}
>
  {#await gltf}
    {#if fallback}
      {@render fallback()}
    {/if}
  {:then gltf}
    <T.Group name="Scene">
      <T.Group name="DragonArmature">
        <T is={gltf.nodes.Root} />
        <T.Group name="Dragon">
          <T.SkinnedMesh
            name="Cylinder"
            castShadow
            receiveShadow
            geometry={gltf.nodes.Cylinder.geometry}
            material={gltf.materials.Main}
            skeleton={gltf.nodes.Cylinder.skeleton}
          />
          <T.SkinnedMesh
            name="Cylinder_1"
            castShadow
            receiveShadow
            geometry={gltf.nodes.Cylinder_1.geometry}
            material={gltf.materials.Wings}
            skeleton={gltf.nodes.Cylinder_1.skeleton}
          />
          <T.SkinnedMesh
            name="Cylinder_2"
            castShadow
            receiveShadow
            geometry={gltf.nodes.Cylinder_2.geometry}
            material={gltf.materials.Belly}
            skeleton={gltf.nodes.Cylinder_2.skeleton}
          />
          <T.SkinnedMesh
            name="Cylinder_3"
            castShadow
            receiveShadow
            geometry={gltf.nodes.Cylinder_3.geometry}
            material={gltf.materials.Claws}
            skeleton={gltf.nodes.Cylinder_3.skeleton}
          />
        </T.Group>
      </T.Group>
    </T.Group>
  {/await}

  {#if children}
    {@render children({ ref })}
  {/if}
</T>
