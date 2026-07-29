type Orderable = { order?: number | null };

/** Returns a sorted copy and never mutates the source array. */
export function sortByOrder<T extends Orderable>(items: readonly T[]): T[] {
  return [...items].sort(
    (firstItem, secondItem) =>
      (firstItem.order ?? 0) - (secondItem.order ?? 0),
  );
}
