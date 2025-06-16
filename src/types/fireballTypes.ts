import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

// Define the GLTF structure for the fire animation model
export type FireballGLTFResult = GLTF & {
  nodes: {
    flame01_phong2_0: THREE.Mesh;
    flame02_phong2_0: THREE.Mesh;
    flame03_phong2_0: THREE.Mesh;
    flame04_phong2_0: THREE.Mesh;
    flame05_phong2_0: THREE.Mesh;
    flame06_phong2_0: THREE.Mesh;
    flame07_phong2_0: THREE.Mesh;
    flame08_phong2_0: THREE.Mesh;
    flame09_phong2_0: THREE.Mesh;
    flame10_phong2_0: THREE.Mesh;
    flame11_phong2_0: THREE.Mesh;
    flame12_phong2_0: THREE.Mesh;
    flame13_phong2_0: THREE.Mesh;
    flame14_phong2_0: THREE.Mesh;
    flame16_phong2_0: THREE.Mesh;
    flame15_phong2_0: THREE.Mesh;
    flame17_phong2_0: THREE.Mesh;
  };
  materials: {
    phong2: THREE.MeshStandardMaterial;
  };
};

// Type for fireball system configuration
export type ActionName = "Take 001";