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
      Cylinder011: THREE.Mesh
      Cylinder011_1: THREE.Mesh
      Cylinder011_2: THREE.Mesh
      Cylinder011_3: THREE.Mesh
      Cylinder011_4: THREE.Mesh
    }
    materials: {
      Wood: THREE.MeshStandardMaterial
      Green: THREE.MeshStandardMaterial
      Mushroom_Top: THREE.MeshStandardMaterial
      Mushroom_Bottom: THREE.MeshStandardMaterial
      DarkGreen: THREE.MeshStandardMaterial
    }
  }

  const gltf = useGltf<GLTFResult>('/models/WoodLog_Moss-transformed.glb', {
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
      geometry={gltf.nodes.Cylinder011.geometry}
      material={gltf.materials.Wood}
    />
    <T.Mesh
      castShadow
      receiveShadow
      geometry={gltf.nodes.Cylinder011_1.geometry}
      material={gltf.materials.Green}
    />
    <T.Mesh
      castShadow
      receiveShadow
      geometry={gltf.nodes.Cylinder011_2.geometry}
      material={gltf.materials.Mushroom_Top}
    />
    <T.Mesh
      castShadow
      receiveShadow
      geometry={gltf.nodes.Cylinder011_3.geometry}
      material={gltf.materials.Mushroom_Bottom}
    />
    <T.Mesh
      castShadow
      receiveShadow
      geometry={gltf.nodes.Cylinder011_4.geometry}
      material={gltf.materials.DarkGreen}
    />
  {:catch err}
    {@render error?.({ error: err })}
  {/await}
  {#if ref}
    {@render children?.({ ref })}
  {/if}
</T.Group>
