export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ThreeViewState {
  cameraPosition: Vec3;
  target: Vec3;
  zoom: number;
}

export type Preset3DObjectType =
  | 'sphere'
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'custom';

export type PresetAnimationType = 'orbit' | 'rotate' | 'bounce' | 'pulse';

export interface Preset3DObject {
  id: string;
  type: Preset3DObjectType;
  name?: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  size?: number;
  color?: string;
  wireframe?: boolean;
  opacity?: number;
  animation?: {
    type: PresetAnimationType;
    speed?: number;
    axis?: 'x' | 'y' | 'z';
  };
  children?: Preset3DObject[];
}

export interface Preset3DScene {
  id: string;
  name: string;
  description: string;
  initialCamera: ThreeViewState;
  objects: Preset3DObject[];
}
