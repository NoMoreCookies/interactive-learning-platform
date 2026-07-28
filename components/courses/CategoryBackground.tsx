"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  categoryBackgrounds,
  type Subject,
} from "@/lib/config/category-backgrounds";

type CategoryBackgroundProps = {
  subject: Subject;
};

export default function CategoryBackground({
  subject,
}: CategoryBackgroundProps) {
  const [displayedSubject, setDisplayedSubject] =
    useState<Subject>(subject);

  const [isVisible, setIsVisible] =
    useState(false);

  const timeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const activeBackground =
    categoryBackgrounds[displayedSubject];

  useEffect(() => {
    if (subject === displayedSubject) {
      return;
    }

    // Najpierw ukrywamy aktualny obraz.
    setIsVisible(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const exitDuration =
      categoryBackgrounds[
        displayedSubject
      ].transitionDurationMs;

    // Po zakończeniu fade-out zmieniamy obraz.
    timeoutRef.current = setTimeout(() => {
      setDisplayedSubject(subject);
    }, exitDuration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [subject, displayedSubject]);

  function handleImageLoad() {
    // Dwie klatki pozwalają przeglądarce najpierw
    // wyrenderować stan niewidoczny, a potem fade-in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }

  const enterOffset =
    activeBackground.enterDirection === "left"
      ? -activeBackground.enterDistance
      : activeBackground.enterDistance;

  const wrapperTransform = isVisible
    ? `translateY(-50%) translateX(0) scale(${activeBackground.scale})`
    : `translateY(-50%) translateX(${enterOffset}px) scale(${
        activeBackground.scale * 0.96
      })`;

return (
  <div
    aria-hidden="true"
    className="
      pointer-events-none
      absolute
      z-0
      hidden
      xl:block
    "
    style={{
      width: activeBackground.width,
      height: activeBackground.height,

      top: activeBackground.top,
      right: activeBackground.right,
      left: activeBackground.left,

      opacity: isVisible
        ? activeBackground.opacity
        : 0,

      transform: wrapperTransform,

      transitionProperty:
        "opacity, transform",

      transitionDuration: `${activeBackground.transitionDurationMs}ms`,

      transitionTimingFunction:
        "cubic-bezier(0.22, 1, 0.36, 1)",
    }}
  >
    <div className="relative h-full w-full">
      <div
        className="
          animate-category-glow
          absolute
          left-1/2
          top-1/2
          h-[55%]
          w-[55%]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-blue-500/25
          blur-3xl
        "
      />

      <div className="relative h-full w-full animate-category-float">
        <Image
          key={displayedSubject}
          src={activeBackground.imagePath}
          alt=""
          fill
          sizes={activeBackground.width}
          onLoad={handleImageLoad}
          className="select-none object-contain object-right"
        />
      </div>
    </div>
  </div>
);
}