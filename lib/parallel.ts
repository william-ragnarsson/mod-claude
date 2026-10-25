/** Runs `run` on every item, at most `limit` at a time. */
export async function inParallel<T>(items: T[], limit: number, run: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) await run(items[next++]);
    }),
  );
}
