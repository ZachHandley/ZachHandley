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
      Rock_4: THREE.Mesh
    }
    materials: {
      Rock: THREE.MeshStandardMaterial
    }
  }

  const gltf = useGltf<GLTFResult>('/models/Rock_4-transformed.glb', {
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
      geometry={gltf.nodes.Rock_4.geometry}
      material={gltf.materials.Rock}
    />
  {:catch err}
    {@render error?.({ error: err })}
  {/await}

  {@render children?.({ ref })}
</T.Group>
