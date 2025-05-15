import type { Props } from "@threlte/core";
import type { Group } from "three";
import type { AnimationAction, AnimationMixer } from "three";

export type SkeletonActionName =
  | "Skeleton_Attack"
  | "Skeleton_Death"
  | "Skeleton_Idle"
  | "Skeleton_Running"
  | "Skeleton_Spawn";

export type SkeletonProps = Props<Group>;
