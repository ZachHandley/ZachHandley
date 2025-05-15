<script lang="ts">
  import type * as THREE from 'three'

  import type { Snippet } from 'svelte'
  import { T, type Props } from '@threlte/core'
  import { useGltf } from '@threlte/extras'
  import type { DRACOLoader } from 'three/examples/jsm/Addons.js';

  let {
    fallback,
    error,
    children,
    ref = $bindable(),
    dracoLoader,
    ...props
  }: Props<THREE.Group> & {
    ref?: THREE.Group
    children?: Snippet<[{ ref: THREE.Group }]>
    fallback?: Snippet
    error?: Snippet<[{ error: Error }]>
    dracoLoader: DRACOLoader
  } = $props()

  type GLTFResult = {
    nodes: {
      Plane029: THREE.Mesh
      Plane029_1: THREE.Mesh
      Plane029_2: THREE.Mesh
    }
    materials: {
      Green: THREE.MeshStandardMaterial
      Cyan: THREE.MeshStandardMaterial
      Yellow: THREE.MeshStandardMaterial
    }
  }

  const gltf = useGltf<GLTFResult>(`/models/Flowers-transformed.glb?${Date.now()}`, {
    dracoLoader,
  })
</script>

<T.Group
  bind:ref
  dispose={false}
  {...props}
>
  {#await gltf}
    {@render fallback?.()}
  {:then gltf}
    <T.Mesh
      castShadow
      receiveShadow
      geometry={gltf.nodes.Plane029.geometry}
      material={gltf.materials.Green}
    />
    <T.Mesh
      castShadow
      receiveShadow
      geometry={gltf.nodes.Plane029_1.geometry}
      material={gltf.materials.Cyan}
    />
    <T.Mesh
      castShadow
      receiveShadow
      geometry={gltf.nodes.Plane029_2.geometry}
      material={gltf.materials.Yellow}
    />
  {:catch err}
    {@render error?.({ error: err })}
  {/await}

  {#if children && ref}
    {@render children?.({ ref })}
  {/if}
</T.Group>
