/**
 * Utility functions for working with SVGs in Three.js
 */
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/**
 * Creates a Three.js mesh from SVG path data
 * @param svgContent - SVG content (path data, path elements, or complete SVG)
 * @param options - Appearance and sizing options
 * @returns THREE.Group containing the SVG geometry
 */
export function createSvgMesh(
  svgContent: string,
  options: {
    color?: string;
    fillColor?: string;
    scale?: number;
    extrude?: number;
    center?: boolean;
  } = {},
): THREE.Group {
  // Default options
  const { color, fillColor, scale = 0.05, extrude = 0, center = true } = options;

  // Create proper SVG string with viewBox
  let svgString: string;
  if (svgContent.trim().startsWith("<svg")) {
    svgString = svgContent;
  } else if (svgContent.trim().startsWith("<path")) {
    svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 32 32">${svgContent}</svg>`;
  } else {
    svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 32 32"><path d="${svgContent}" fill="${fillColor}" /></svg>`;
  }

  // Parse the SVG using Three.js SVGLoader
  const loader = new SVGLoader();
  const svgData = loader.parse(svgString);
  const paths = svgData.paths;

  // Create a group to hold our SVG shapes
  const svgGroup = new THREE.Group();

  // Process each path from the SVG - following the THREE.js example pattern
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];

    // Get path color or use default
    const pathColor = path.color || color;

    // Create material based on extrusion needs
    let material;
    if (extrude > 0) {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pathColor),
        emissive: new THREE.Color(pathColor),
        emissiveIntensity: 0.7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1,
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: pathColor,
        side: THREE.DoubleSide,
        depthWrite: false,
        transparent: true,
        opacity: 1,
      });
    }

    // Use the SVGLoader's createShapes helper
    const shapes = SVGLoader.createShapes(path);

    for (let j = 0; j < shapes.length; j++) {
      const shape = shapes[j];

      let geometry;
      if (extrude > 0) {
        // Create extruded geometry
        geometry = new THREE.ExtrudeGeometry(shape, {
          depth: extrude,
          bevelEnabled: false,
        });
      } else {
        // Create flat shape
        geometry = new THREE.ShapeGeometry(shape);
      }

      // Create and add mesh
      const mesh = new THREE.Mesh(geometry, material);
      svgGroup.add(mesh);
    }
  }

  // Apply scale
  svgGroup.scale.set(scale, scale, scale);

  // Center the SVG if requested. ORDER MATTERS: flip Y BEFORE measuring +
  // centering. SVG coords are Y-down, Three.js is Y-up; the `scale.y *= -1`
  // reflects the mesh. Measuring before the flip and applying the flip after
  // the position-fix reflects the already-centered mesh around its new
  // origin, leaving the visible bbox center at +center.y rather than 0 — a
  // bias that propagates into every downstream layout consumer.
  if (center) {
    // 1. Flip Y first so the visible mesh is in its final orientation.
    svgGroup.scale.y *= -1;

    // 2. Measure the final visible bbox.
    svgGroup.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(svgGroup);
    const c = box.getCenter(new THREE.Vector3());

    // 3. Translate so the bbox center lands at the group's local (0, 0, 0).
    svgGroup.position.x -= c.x;
    svgGroup.position.y -= c.y;
  }

  return svgGroup;
}

/**
 * Calculates appropriate scale factors to render an object at a specific
 * visual size at a given z-depth from the camera
 *
 * @param camera - THREE.PerspectiveCamera
 * @param targetWidth - Desired width in world units
 * @param targetHeight - Desired height in world units
 * @param zDepth - Z position relative to camera
 * @param originalSize - Original size of object to be scaled
 * @returns Scale factors as [x, y, z]
 */
export function calculateVisualScale(
  camera: THREE.PerspectiveCamera,
  targetWidth: number,
  targetHeight: number,
  zDepth: number,
  originalSize: { width: number; height: number } = { width: 1, height: 1 },
): [number, number, number] {
  // Calculate distance from camera to target z-depth
  const distance = Math.abs(zDepth - camera.position.z);

  // Calculate visible height at that distance using camera FOV
  const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * distance;

  // Calculate visible width using aspect ratio
  const visibleWidth = visibleHeight * camera.aspect;

  // Calculate scale factors to achieve target size
  const scaleX = targetWidth / visibleWidth / originalSize.width;
  const scaleY = targetHeight / visibleHeight / originalSize.height;

  return [scaleX, scaleY, 1];
}
