<!--
Auto-generated by: https://github.com/threlte/threlte/tree/main/packages/gltf
Command: npx @threlte/gltf@3.0.1 ./src/assets/model_src/Skeleton.gltf --types --output --shadows --transform
-->

<script lang="ts">
  import type * as THREE from "three";
  import { Group } from "three";
  import type { Snippet } from "svelte";
  import { T, type Props, useThrelte } from "@threlte/core";
  import { useGltf, useGltfAnimations, useDraco, useMeshopt, interactivity } from "@threlte/extras";

  const dracoLoader = useDraco();
  const meshoptLoader = useMeshopt();

  let {
    fallback,
    error,
    children,
    ref = $bindable(),
    actions = $bindable(),
    mixer = $bindable(),
    onClick,
    ...props
  }: Props<THREE.Group> & {
    ref?: THREE.Group;
    children?: Snippet<[{ ref: THREE.Group }]>;
    fallback?: Snippet;
    error?: Snippet<[{ error: Error }]>;
    onClick?: () => void;
  } = $props();

  ref = new Group();

  type ActionName =
    | "Skeleton_Attack"
    | "Skeleton_Death"
    | "Skeleton_Idle"
    | "Skeleton_Running"
    | "Skeleton_Spawn";
  type GLTFResult = {
    nodes: {
      Cylinder001: THREE.SkinnedMesh;
      Hips: THREE.Bone;
    };
    materials: {
      Skeleton: THREE.MeshStandardMaterial;
    };
  };

  const gltf = useGltf<GLTFResult>(
    `/models/Skeleton-transformed.glb?instance=${Math.random() * 100}`,
    {
      dracoLoader,
      meshoptDecoder: meshoptLoader,
    }
  );

  const animations = useGltfAnimations<ActionName>(gltf, ref);

  actions = animations.actions;
  mixer = animations.mixer;

  interactivity();
</script>

{#if $gltf}
  <T is={ref} dispose={false} {...props} onclick={onClick}>
    <T.Group name="Scene">
      <T.Group name="SkeletonArmature" position={[0.01, 1.35, 0]}>
        <T is={$gltf.nodes.Hips} />
        <T.SkinnedMesh
          name="Cylinder001"
          castShadow
          receiveShadow
          geometry={$gltf.nodes.Cylinder001.geometry}
          material={$gltf.materials.Skeleton}
          skeleton={$gltf.nodes.Cylinder001.skeleton}
        />
      </T.Group>
    </T.Group>

    {@render children?.({ ref })}
  </T>
{/if}
