import type { Preset3DScene } from '@/lib/types/three-lab';

export const PRESET_3D_SCENES: Preset3DScene[] = [
  {
    id: 'molecular-demo',
    name: '分子结构示例',
    description: '展示分子节点与键连接关系，支持旋转缩放观察空间结构。',
    initialCamera: {
      cameraPosition: { x: 5.5, y: 3.5, z: 7.5 },
      target: { x: 0, y: 0, z: 0 },
      zoom: 1,
    },
    objects: [
      { id: 'core-o', type: 'sphere', size: 0.9, color: '#ef4444', position: { x: 0, y: 0, z: 0 } },
      {
        id: 'h-1',
        type: 'sphere',
        size: 0.45,
        color: '#60a5fa',
        position: { x: 1.8, y: 1.2, z: 0.4 },
      },
      {
        id: 'h-2',
        type: 'sphere',
        size: 0.45,
        color: '#60a5fa',
        position: { x: -1.5, y: 1.0, z: -0.8 },
      },
      {
        id: 'bond-1',
        type: 'cylinder',
        size: 0.14,
        color: '#64748b',
        position: { x: 0.85, y: 0.6, z: 0.2 },
        rotation: { x: -0.5, y: 0, z: -0.9 },
      },
      {
        id: 'bond-2',
        type: 'cylinder',
        size: 0.14,
        color: '#64748b',
        position: { x: -0.75, y: 0.52, z: -0.4 },
        rotation: { x: -0.45, y: 0, z: 0.85 },
      },
    ],
  },
  {
    id: 'geometry-demo',
    name: '几何关系示例',
    description: '观察立方体、圆锥与环面的空间关系，帮助理解立体几何。',
    initialCamera: {
      cameraPosition: { x: 6, y: 4, z: 9 },
      target: { x: 0, y: 0, z: 0 },
      zoom: 1,
    },
    objects: [
      {
        id: 'box-main',
        type: 'box',
        size: 1.2,
        color: '#3b82f6',
        position: { x: -2.6, y: 0.8, z: 0 },
        animation: { type: 'rotate', speed: 1.1, axis: 'y' },
      },
      {
        id: 'cone-main',
        type: 'cone',
        size: 0.95,
        color: '#f59e0b',
        position: { x: 0.2, y: 0.9, z: 0 },
        animation: { type: 'pulse', speed: 1 },
      },
      {
        id: 'torus-main',
        type: 'torus',
        size: 0.95,
        color: '#22c55e',
        position: { x: 2.9, y: 1.0, z: 0.5 },
        animation: { type: 'rotate', speed: 1.2, axis: 'x' },
      },
      {
        id: 'floor',
        type: 'plane',
        size: 7,
        color: '#e2e8f0',
        opacity: 0.65,
        position: { x: 0, y: -0.05, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      },
    ],
  },
  {
    id: 'solar-demo',
    name: '太阳系简化示例',
    description: '模拟太阳系简化公转与自转，直观看到轨道关系。',
    initialCamera: {
      cameraPosition: { x: 9, y: 6, z: 9 },
      target: { x: 0, y: 0, z: 0 },
      zoom: 1,
    },
    objects: [
      {
        id: 'sun',
        type: 'sphere',
        size: 1.3,
        color: '#f97316',
        position: { x: 0, y: 1.3, z: 0 },
      },
      {
        id: 'earth',
        type: 'sphere',
        size: 0.56,
        color: '#3b82f6',
        position: { x: 3.2, y: 1.2, z: 0 },
        animation: { type: 'orbit', speed: 0.7 },
      },
      {
        id: 'mars',
        type: 'sphere',
        size: 0.48,
        color: '#ef4444',
        position: { x: 5.1, y: 1.05, z: 0 },
        animation: { type: 'orbit', speed: 0.55 },
      },
      {
        id: 'jupiter',
        type: 'sphere',
        size: 0.9,
        color: '#fbbf24',
        position: { x: 6.9, y: 1.35, z: 0 },
        animation: { type: 'orbit', speed: 0.38 },
      },
      {
        id: 'space-floor',
        type: 'plane',
        size: 14,
        color: '#0f172a',
        opacity: 0.18,
        position: { x: 0, y: -0.1, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      },
    ],
  },
];

export function getPreset3DScene(id: string): Preset3DScene | undefined {
  return PRESET_3D_SCENES.find((item) => item.id === id);
}
