"use client";

import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Float,
  PresentationControls,
} from "@react-three/drei";

import CategoryModel from "./CategoryModel";

type CategoryModelSceneProps = {
  modelPath: string;
  scale?: number;
  cameraPosition?: [number, number, number];
};

export default function CategoryModelScene({
  modelPath,
  scale = 1,
  cameraPosition = [0, 0, 5],
}: CategoryModelSceneProps) {
  return (
    <Canvas
      camera={{
        position: cameraPosition,
        fov: 38,
      }}
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        alpha: true,
      }}
    >
      <ambientLight intensity={1.2} />

      <directionalLight
        position={[4, 5, 5]}
        intensity={2}
      />

      <directionalLight
        position={[-4, -2, 2]}
        intensity={0.8}
      />

      <Float
        speed={0.7}
        rotationIntensity={0}
        floatIntensity={0.25}
      >
        <PresentationControls
          enabled={false}
          global={false}
        >
          <CategoryModel
            modelPath={modelPath}
            scale={scale}
            rotationSpeed={0.07}
          />
        </PresentationControls>
      </Float>

      <Environment preset="city" />
    </Canvas>
  );
}