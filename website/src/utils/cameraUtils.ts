import * as THREE from 'three';

/**
 * Camera and viewport calculation utilities
 * Centralized functions for 3D scene calculations to avoid duplication
 */

export interface ViewportDimensions {
  width: number;
  height: number;
  aspect: number;
}

/**
 * Calculate the visible height at a specific Z depth from the camera
 */
export function visibleHeightAtZDepth(
  camera: THREE.PerspectiveCamera, 
  depth: number
): number {
  if (!camera) return 10; // Default fallback

  // Convert from z-depth to distance from camera
  const distance = Math.abs(depth - camera.position.z);

  // Calculate using perspective camera FOV formula
  return (
    2 *
    Math.tan((camera.fov * Math.PI) / 180 / 2) *
    distance
  );
}

/**
 * Calculate the visible width at a specific Z depth from the camera
 */
export function visibleWidthAtZDepth(
  camera: THREE.PerspectiveCamera, 
  depth: number
): number {
  if (!camera) return 10; // Default fallback

  const height = visibleHeightAtZDepth(camera, depth);
  const aspect = camera.aspect || 1;
  
  return height * aspect;
}

/**
 * Get complete viewport dimensions at a specific Z depth
 */
export function calculateViewportDimensions(
  camera: THREE.PerspectiveCamera, 
  zDepth: number
): ViewportDimensions {
  const height = visibleHeightAtZDepth(camera, zDepth);
  const width = visibleWidthAtZDepth(camera, zDepth);
  const aspect = camera.aspect || 1;

  return { width, height, aspect };
}

/**
 * Scale a bounding box to fit within target dimensions while maintaining aspect ratio
 */
export function scaleBoxToSize(
  boundingBox: THREE.Box3,
  targetWidth: number,
  targetHeight: number,
  targetDepth?: number
): [number, number, number] {
  const size = boundingBox.getSize(new THREE.Vector3());
  
  // Calculate scale factors for each dimension
  const scaleX = targetWidth / size.x;
  const scaleY = targetHeight / size.y;
  const scaleZ = targetDepth ? targetDepth / size.z : scaleX; // Use X scale if no depth specified
  
  return [scaleX, scaleY, scaleZ];
}

/**
 * Calculate optimal positioning within viewport constraints
 */
export function calculateGridPositions(
  itemCount: number,
  viewport: ViewportDimensions,
  itemSize: number,
  columns: number = 2,
  constraints: {
    topBoundary?: number;
    bottomBoundary?: number;
    leftBoundary?: number;
    rightBoundary?: number;
    centerOffset?: number; // Offset from center (e.g., to avoid dragon)
  } = {}
): { leftPositions: [number, number, number][]; rightPositions: [number, number, number][]; linkSize: number } {
  const {
    topBoundary = viewport.height * 0.45,
    bottomBoundary = -1,
    centerOffset = 3, // Default offset from center
  } = constraints;

  // Calculate available space
  const availableVerticalSpace = topBoundary - bottomBoundary;
  
  // Split items between columns
  const leftItems = Math.ceil(itemCount / columns);
  const rightItems = itemCount - leftItems;
  const maxPerColumn = Math.max(leftItems, rightItems);
  
  // Calculate optimal item size
  const maxItemSize = (availableVerticalSpace * 0.8) / Math.max(maxPerColumn, 1);
  const finalItemSize = Math.min(maxItemSize, itemSize);
  
  // Calculate column positions
  const leftX = -centerOffset;
  const rightX = centerOffset;
  
  // Calculate positions for each column
  const leftPositions: [number, number, number][] = [];
  const rightPositions: [number, number, number][] = [];
  
  // Left column
  if (leftItems > 0) {
    const leftSpacing = (availableVerticalSpace - leftItems * finalItemSize) / (leftItems + 1);
    for (let i = 0; i < leftItems; i++) {
      const y = topBoundary - leftSpacing - i * (finalItemSize + leftSpacing) - finalItemSize / 2;
      leftPositions.push([leftX, Math.max(y, bottomBoundary + finalItemSize / 2), 0]);
    }
  }
  
  // Right column
  if (rightItems > 0) {
    const rightSpacing = (availableVerticalSpace - rightItems * finalItemSize) / (rightItems + 1);
    for (let i = 0; i < rightItems; i++) {
      const y = topBoundary - rightSpacing - i * (finalItemSize + rightSpacing) - finalItemSize / 2;
      rightPositions.push([rightX, Math.max(y, bottomBoundary + finalItemSize / 2), 0]);
    }
  }
  
  return { leftPositions, rightPositions, linkSize: finalItemSize };
}

/**
 * Check if a position with given radius would be visible within viewport
 */
export function isPositionVisible(
  position: [number, number, number],
  radius: number,
  viewport: ViewportDimensions
): boolean {
  const [x, y] = position;
  const halfWidth = viewport.width / 2;
  const halfHeight = viewport.height / 2;
  
  return (
    Math.abs(x) + radius < halfWidth &&
    Math.abs(y) + radius < halfHeight
  );
}