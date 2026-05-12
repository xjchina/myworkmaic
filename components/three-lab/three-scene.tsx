'use client';

import { useEffect, useRef } from 'react';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Preset3DObject, Preset3DScene } from '@/lib/types/three-lab';

interface ThreeSceneProps {
  preset: Preset3DScene;
  resetSignal?: number;
}

type RuntimeMesh = {
  mesh: {
    rotation: { x: number; y: number; z: number };
    position: { x: number; y: number; z: number };
    scale: { set: (x: number, y: number, z: number) => void };
  };
  definition: Preset3DObject;
  initialPosition: { x: number; y: number; z: number };
  initialScale: { x: number; y: number; z: number };
};

export function ThreeScene({ preset, resetSignal = 0 }: ThreeSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<{
    position: { set: (x: number, y: number, z: number) => void };
    zoom: number;
    lookAt: (x: number, y: number, z: number) => void;
    updateProjectionMatrix: () => void;
    aspect: number;
  } | null>(null);
  const runtimeMeshesRef = useRef<RuntimeMesh[]>([]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const run = async () => {
      const THREE = await import('three');
      const controlsModule = await import('three/addons/controls/OrbitControls.js');
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.shadowMap.enabled = true;
      host.innerHTML = '';
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#f8fafc');

      const camera = new THREE.PerspectiveCamera(52, host.clientWidth / host.clientHeight, 0.1, 2000);
      camera.position.set(
        preset.initialCamera.cameraPosition.x,
        preset.initialCamera.cameraPosition.y,
        preset.initialCamera.cameraPosition.z,
      );
      camera.zoom = preset.initialCamera.zoom || 1;
      camera.lookAt(
        preset.initialCamera.target.x,
        preset.initialCamera.target.y,
        preset.initialCamera.target.z,
      );
      camera.updateProjectionMatrix();
      cameraRef.current = camera;

      const controls = new controlsModule.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.target.set(
        preset.initialCamera.target.x,
        preset.initialCamera.target.y,
        preset.initialCamera.target.z,
      );
      controls.update();
      controlsRef.current = controls;

      scene.add(new THREE.AmbientLight('#ffffff', 0.8));
      const keyLight = new THREE.DirectionalLight('#ffffff', 1.2);
      keyLight.position.set(5, 10, 8);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight('#dbeafe', 0.6);
      fillLight.position.set(-6, 4, -5);
      scene.add(fillLight);

      scene.add(new THREE.GridHelper(18, 18, '#cbd5e1', '#e2e8f0'));
      const axis = new THREE.AxesHelper(3.5);
      axis.position.set(0, 0.05, 0);
      scene.add(axis);

      const runtimeMeshes: RuntimeMesh[] = [];

      const createMaterial = (obj: Preset3DObject) =>
        new THREE.MeshStandardMaterial({
          color: obj.color || '#60a5fa',
          wireframe: obj.wireframe || false,
          transparent: typeof obj.opacity === 'number',
          opacity: obj.opacity ?? 1,
          roughness: 0.38,
          metalness: 0.08,
        });

      const createGeometry = (obj: Preset3DObject) => {
        const size = obj.size ?? 1;
        switch (obj.type) {
          case 'sphere':
            return new THREE.SphereGeometry(size, 40, 30);
          case 'box':
            return new THREE.BoxGeometry(size * 1.3, size * 1.3, size * 1.3);
          case 'cylinder':
            return new THREE.CylinderGeometry(size, size, size * 7, 28);
          case 'cone':
            return new THREE.ConeGeometry(size, size * 2.2, 28);
          case 'torus':
            return new THREE.TorusGeometry(size, Math.max(size * 0.2, 0.08), 26, 120);
          case 'plane':
            return new THREE.PlaneGeometry(size, size);
          case 'custom':
          default:
            return new THREE.IcosahedronGeometry(size, 1);
        }
      };

      const addObject = (obj: Preset3DObject, parent: import('three').Object3D) => {
        const geometry = createGeometry(obj);
        const material = createMaterial(obj);
        const mesh = new THREE.Mesh(geometry, material);

        const pos = obj.position ?? { x: 0, y: 0, z: 0 };
        mesh.position.set(pos.x, pos.y, pos.z);
        if (obj.rotation) mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
        if (typeof obj.scale === 'number') {
          mesh.scale.set(obj.scale, obj.scale, obj.scale);
        } else if (obj.scale) {
          mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);

        runtimeMeshes.push({
          mesh,
          definition: obj,
          initialPosition: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
          initialScale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
        });

        if (obj.children?.length) {
          obj.children.forEach((child) => addObject(child, mesh));
        }
      };

      preset.objects.forEach((item) => addObject(item, scene));
      runtimeMeshesRef.current = runtimeMeshes;

      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (width <= 0 || height <= 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      const hasResizeObserver = typeof ResizeObserver !== 'undefined';
      if (hasResizeObserver) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      } else {
        globalThis.addEventListener('resize', resize);
      }

      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        const elapsed = clock.getElapsedTime();
        runtimeMeshes.forEach((item) => {
          const anim = item.definition.animation;
          if (!anim) return;
          const speed = anim.speed ?? 1;
          const axisName = anim.axis ?? 'y';
          if (anim.type === 'rotate') {
            item.mesh.rotation[axisName] += 0.012 * speed;
            return;
          }
          if (anim.type === 'orbit') {
            const radius = Math.max(Math.hypot(item.initialPosition.x, item.initialPosition.z), 0.1);
            item.mesh.position.x = Math.cos(elapsed * speed) * radius;
            item.mesh.position.z = Math.sin(elapsed * speed) * radius;
            return;
          }
          if (anim.type === 'bounce') {
            item.mesh.position.y = item.initialPosition.y + Math.sin(elapsed * speed * 2) * 0.3;
            return;
          }
          if (anim.type === 'pulse') {
            const rate = 1 + Math.sin(elapsed * speed * 2.1) * 0.11;
            item.mesh.scale.set(
              item.initialScale.x * rate,
              item.initialScale.y * rate,
              item.initialScale.z * rate,
            );
          }
        });

        controls.update();
        renderer.render(scene, camera);
        raf = window.requestAnimationFrame(animate);
      };
      animate();

      return () => {
        if (hasResizeObserver) {
          resizeObserver?.disconnect();
        } else {
          globalThis.removeEventListener('resize', resize);
        }
        window.cancelAnimationFrame(raf);
        controls.dispose();
        scene.traverse((obj) => {
          const mesh = obj as import('three').Mesh;
          if (!('geometry' in mesh)) return;
          mesh.geometry?.dispose?.();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat.dispose?.());
          } else {
            mesh.material?.dispose?.();
          }
        });
        renderer.dispose();
        if (host.contains(renderer.domElement)) {
          host.removeChild(renderer.domElement);
        }
      };
    };

    let disposeRuntime: (() => void) | undefined;
    run().then((dispose) => {
      disposeRuntime = dispose;
    });

    return () => {
      disposed = true;
      if (disposeRuntime) disposeRuntime();
    };
  }, [preset]);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(
      preset.initialCamera.cameraPosition.x,
      preset.initialCamera.cameraPosition.y,
      preset.initialCamera.cameraPosition.z,
    );
    camera.zoom = preset.initialCamera.zoom || 1;
    camera.updateProjectionMatrix();
    controls.target.set(
      preset.initialCamera.target.x,
      preset.initialCamera.target.y,
      preset.initialCamera.target.z,
    );
    controls.update();

    runtimeMeshesRef.current.forEach((item) => {
      item.mesh.position.x = item.initialPosition.x;
      item.mesh.position.y = item.initialPosition.y;
      item.mesh.position.z = item.initialPosition.z;
      item.mesh.scale.set(item.initialScale.x, item.initialScale.y, item.initialScale.z);
    });
  }, [preset, resetSignal]);

  return <div ref={hostRef} className="three-host" />;
}
