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
  } = {}
): THREE.Group {
  // Default options
  const {
    color,
    fillColor,
    scale = 0.05,
    extrude = 0,
    center = true,
  } = options;

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

  // Center the SVG if requested
  if (center) {
    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(svgGroup);
    const center = box.getCenter(new THREE.Vector3());

    // Center the group
    svgGroup.position.x = -center.x;
    svgGroup.position.y = -center.y;

    // Flip Y coordinate to match Three.js system
    svgGroup.scale.y *= -1;
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
  originalSize: { width: number; height: number } = { width: 1, height: 1 }
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
