"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import type { Group } from "three";

type CategoryModelProps = {
  modelPath: string;
  scale?: number;
  rotationSpeed?: number;
  position?: [number, number, number];
};

export default function CategoryModel({
  modelPath,
  scale = 1,
  rotationSpeed = 0.08,
  position = [0, 0, 0],
}: CategoryModelProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(modelPath);

  useEffect(() => {
    return () => {
      scene.traverse((object) => {
        if (!("geometry" in object)) {
          return;
        }
      });
    };
  }, [scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.rotation.y += delta * rotationSpeed;

    groupRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.25) * 0.06;

    groupRef.current.position.y =
      Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
  });

  return (
        <group
        ref={groupRef}
        scale={scale}
        position={position}
        >
            <primitive object={scene} />
        </group>
  );
}