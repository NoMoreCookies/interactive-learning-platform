"use client";

import dynamic from "next/dynamic";

const CategoryModelScene = dynamic(
  () => import("./CategoryModelScene"),
  {
    ssr: false,
    loading: () => null,
  },
);

type DynamicCategoryModelProps = {
  modelPath: string;
  scale?: number;
  cameraPosition?: [number, number, number];
  rotationSpeed?: number;
  position?: [number, number, number];
};

export default function DynamicCategoryModel(
  props: DynamicCategoryModelProps,
) {
  return <CategoryModelScene {...props} />;
}