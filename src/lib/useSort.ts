import { useMemo, useState } from "react";

export function useSort<T, K extends string>(
  rows: T[],
  getValue: (row: T, key: K) => string | number,
  defaultKey: K | null = null,
  defaultDir: "asc" | "desc" = "asc"
) {
  const [sortKey, setSortKey] = useState<K | null>(defaultKey);
  const [dir, setDir] = useState<"asc" | "desc">(defaultDir);

  function toggle(key: K) {
    if (sortKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setDir("asc"); }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return dir === "asc" ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, dir]);

  return { sorted, sortKey, dir, toggle };
}
