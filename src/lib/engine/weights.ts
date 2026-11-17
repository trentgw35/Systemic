/** Equal local weights that always sum to exactly 100. */
export function equalShares(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [100];
  const shares = Array.from({ length: n }, () => 0);
  const base = Math.floor((100 * 10000) / n) / 10000;
  let sum = 0;
  for (let i = 0; i < n - 1; i++) {
    shares[i] = base;
    sum += base;
  }
  shares[n - 1] = Number((100 - sum).toFixed(4));
  return shares;
}

export type WeightRow = { id: string; local_weight: number };

/**
 * Set `targetId` to `desired` and redistribute the remainder across unlocked
 * siblings proportionally. Pinned siblings keep their weights.
 * Result always sums to 100 (within 0.0001 after rounding fix-up).
 */
export function redistributeWeights(
  siblings: WeightRow[],
  targetId: string,
  desired: number,
  pinnedIds: string[] = [],
): WeightRow[] {
  if (!siblings.some((s) => s.id === targetId)) {
    throw new Error("target not in children-set");
  }
  const pinned = new Set(pinnedIds.filter((id) => id !== targetId));
  const pinnedRows = siblings.filter((s) => pinned.has(s.id));
  const unlocked = siblings.filter(
    (s) => s.id !== targetId && !pinned.has(s.id),
  );
  const pinnedSum = pinnedRows.reduce((s, r) => s + r.local_weight, 0);
  const maxTarget = Number((100 - pinnedSum).toFixed(4));
  let targetWeight = Math.max(0, Math.min(desired, maxTarget));
  if (unlocked.length === 0) {
    targetWeight = maxTarget;
  }
  const remaining = Number((100 - pinnedSum - targetWeight).toFixed(4));

  const next: Record<string, number> = {};
  for (const p of pinnedRows) next[p.id] = p.local_weight;
  next[targetId] = targetWeight;

  if (unlocked.length === 0) {
    // only target + pinned
  } else {
    const unlockedSum = unlocked.reduce((s, r) => s + r.local_weight, 0);
    if (unlockedSum <= 0) {
      const each = Number((remaining / unlocked.length).toFixed(4));
      let assigned = 0;
      unlocked.forEach((u, i) => {
        if (i === unlocked.length - 1) {
          next[u.id] = Number((remaining - assigned).toFixed(4));
        } else {
          next[u.id] = each;
          assigned += each;
        }
      });
    } else {
      let assigned = 0;
      unlocked.forEach((u, i) => {
        if (i === unlocked.length - 1) {
          next[u.id] = Number((remaining - assigned).toFixed(4));
        } else {
          const w = Number(
            ((remaining * u.local_weight) / unlockedSum).toFixed(4),
          );
          next[u.id] = w;
          assigned += w;
        }
      });
    }
  }

  // Final fix-up so sum is exactly 100
  const rows = siblings.map((s) => ({
    id: s.id,
    local_weight: next[s.id] ?? s.local_weight,
  }));
  const sum = rows.reduce((s, r) => s + r.local_weight, 0);
  const drift = Number((100 - sum).toFixed(4));
  if (Math.abs(drift) > 0) {
    const fixId =
      unlocked[unlocked.length - 1]?.id ??
      targetId;
    const row = rows.find((r) => r.id === fixId)!;
    row.local_weight = Number((row.local_weight + drift).toFixed(4));
  }
  return rows;
}

/** Insert a new sibling at 10% (or 50/50 if only one existing sibling). */
export function weightsAfterAdd(
  siblings: WeightRow[],
  newId: string,
): WeightRow[] {
  if (siblings.length === 0) {
    return [{ id: newId, local_weight: 100 }];
  }
  if (siblings.length === 1) {
    return [
      { id: siblings[0].id, local_weight: 50 },
      { id: newId, local_weight: 50 },
    ];
  }
  const scaled = siblings.map((s) => ({
    id: s.id,
    local_weight: Number((s.local_weight * 0.9).toFixed(4)),
  }));
  const sum = scaled.reduce((a, r) => a + r.local_weight, 0);
  const drift = Number((90 - sum).toFixed(4));
  if (Math.abs(drift) > 0) {
    scaled[scaled.length - 1].local_weight = Number(
      (scaled[scaled.length - 1].local_weight + drift).toFixed(4),
    );
  }
  return [...scaled, { id: newId, local_weight: 10 }];
}

/** Remove a sibling and redistribute its weight proportionally. */
export function weightsAfterRemove(
  siblings: WeightRow[],
  removeId: string,
): WeightRow[] {
  const removed = siblings.find((s) => s.id === removeId);
  if (!removed) throw new Error("node not in children-set");
  const remaining = siblings.filter((s) => s.id !== removeId);
  if (remaining.length === 0) return [];
  const remSum = remaining.reduce((a, r) => a + r.local_weight, 0);
  if (remSum <= 0) {
    const each = Number((100 / remaining.length).toFixed(4));
    let assigned = 0;
    return remaining.map((r, i) => {
      if (i === remaining.length - 1) {
        return { id: r.id, local_weight: Number((100 - assigned).toFixed(4)) };
      }
      assigned += each;
      return { id: r.id, local_weight: each };
    });
  }
  let assigned = 0;
  return remaining.map((r, i) => {
    if (i === remaining.length - 1) {
      return { id: r.id, local_weight: Number((100 - assigned).toFixed(4)) };
    }
    const w = Number(
      (((r.local_weight / remSum) * 100)).toFixed(4),
    );
    assigned += w;
    return { id: r.id, local_weight: w };
  });
}
