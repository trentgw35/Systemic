/**
 * Context 03 worked examples as seed trees.
 *
 * Forward tree reconstructed to hit acceptance fixtures:
 *   ~60% personal opinion, ~11.3% data & analysis,
 *   deepest leaf "Opinions of his children" ≈1.9%,
 *   Level-1 CEO 40 / CMO 40 / CFO 10 / CTO 10,
 *   CEO section Not yet confirmed; others Confirmed.
 *
 * Reverse tree follows Context 03 numbers; Planning un-confirmed;
 * expected areas include Quality (blind spot).
 * suspicion ≈31%, verified ≈69%.
 */

import type { EvidenceKind } from "./types";

export type SeedNode = {
  label: string;
  kind: EvidenceKind;
  local_weight: number;
  /** Owner of this node's children-set; null = leaf */
  ownsChildren?: boolean;
  confirmed?: boolean;
  children?: SeedNode[];
};

export const FORWARD_DEMO: {
  mode: "decision";
  title: string;
  group_tag: string;
  sections: SeedNode[];
} = {
  mode: "decision",
  title: "Which social media platform to advertise on? → Instagram",
  group_tag: "Demo — decisions",
  sections: [
    {
      label: "CEO",
      kind: "process",
      local_weight: 40,
      ownsChildren: true,
      confirmed: false,
      children: [
        { label: "Gut feel on brand fit", kind: "opinion", local_weight: 37.5 },
        {
          label: "Family input",
          kind: "process",
          local_weight: 47.5,
          ownsChildren: true,
          confirmed: false,
          children: [
            {
              label: "Opinions of his children",
              kind: "opinion",
              local_weight: 10,
            },
            {
              label: "Spouse view on Instagram",
              kind: "opinion",
              local_weight: 90,
            },
          ],
        },
        {
          label: "Board hallway chatter",
          kind: "anecdote",
          local_weight: 15,
        },
      ],
    },
    {
      label: "CMO",
      kind: "process",
      local_weight: 40,
      ownsChildren: true,
      confirmed: true,
      children: [
        { label: "Brand instinct", kind: "opinion", local_weight: 50 },
        { label: "Agency advice", kind: "advisory", local_weight: 20 },
        { label: "Campaign analytics", kind: "data", local_weight: 20 },
        {
          label: "Competitor hearsay",
          kind: "anecdote",
          local_weight: 10,
        },
      ],
    },
    {
      label: "CFO",
      kind: "process",
      local_weight: 10,
      ownsChildren: true,
      confirmed: true,
      children: [
        { label: "Finance gut check", kind: "opinion", local_weight: 60 },
        { label: "CAC model", kind: "data", local_weight: 30 },
        { label: "Auditor note", kind: "advisory", local_weight: 10 },
      ],
    },
    {
      label: "CTO",
      kind: "process",
      local_weight: 10,
      ownsChildren: true,
      confirmed: true,
      children: [
        { label: "Platform metrics", kind: "data", local_weight: 3 },
        {
          label: "Trusted eng advisors",
          kind: "advisory",
          local_weight: 97,
        },
      ],
    },
  ],
};

export const REVERSE_DEMO: {
  mode: "rcca";
  title: string;
  group_tag: string;
  expected_areas: string[];
  sections: SeedNode[];
} = {
  mode: "rcca",
  title: "Fleet delivery for the Q3 launch slipped three weeks",
  group_tag: "Demo — RCCA",
  expected_areas: ["Supply", "Planning", "Engineering", "Logistics", "Quality"],
  sections: [
    {
      label: "Supply",
      kind: "process",
      local_weight: 45,
      ownsChildren: true,
      confirmed: true,
      children: [
        {
          label: "Vendor overcommitment",
          kind: "data",
          local_weight: 60,
        },
        {
          label: "Late PO acknowledgments",
          kind: "data",
          local_weight: 40,
        },
      ],
    },
    {
      label: "Planning",
      kind: "process",
      local_weight: 30,
      ownsChildren: true,
      confirmed: false,
      children: [
        {
          label: "Forecast too optimistic",
          kind: "opinion",
          local_weight: 70,
        },
        { label: "No slack", kind: "opinion", local_weight: 30 },
      ],
    },
    {
      label: "Engineering",
      kind: "process",
      local_weight: 15,
      ownsChildren: true,
      confirmed: true,
      children: [
        {
          label: "Late spec change",
          kind: "data",
          local_weight: 93.3333,
        },
        {
          label: "Rumored capacity issue",
          kind: "opinion",
          local_weight: 6.6667,
        },
      ],
    },
    {
      label: "Logistics",
      kind: "process",
      local_weight: 10,
      ownsChildren: true,
      confirmed: true,
      children: [{ label: "Carrier delay", kind: "data", local_weight: 100 }],
    },
  ],
};

/** Verify leaf shares for the forward reconstruction (dev/test helper). */
export function leafShares(
  sections: SeedNode[],
  parentShare = 100,
): Array<{ label: string; kind: EvidenceKind; share: number }> {
  const out: Array<{ label: string; kind: EvidenceKind; share: number }> = [];
  for (const n of sections) {
    const share = (parentShare * n.local_weight) / 100;
    if (!n.children?.length) {
      out.push({ label: n.label, kind: n.kind, share });
    } else {
      out.push(...leafShares(n.children, share));
    }
  }
  return out;
}
