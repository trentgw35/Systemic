#!/usr/bin/env node
import {
  FORWARD_DEMO,
  REVERSE_DEMO,
  leafShares,
} from "../src/lib/demo-seed.ts";

function sumCheck(nodes, path = "root") {
  const total = nodes.reduce((s, n) => s + n.local_weight, 0);
  if (Math.abs(total - 100) > 0.001) {
    throw new Error(`${path} sums to ${total}, not 100`);
  }
  for (const n of nodes) {
    if (n.children?.length) sumCheck(n.children, `${path}/${n.label}`);
  }
}

sumCheck(FORWARD_DEMO.sections, "forward");
sumCheck(REVERSE_DEMO.sections, "reverse");

const leaves = leafShares(FORWARD_DEMO.sections);
const opinion = leaves
  .filter((l) => l.kind === "opinion")
  .reduce((s, l) => s + l.share, 0);
const data = leaves
  .filter((l) => l.kind === "data")
  .reduce((s, l) => s + l.share, 0);
const kids = leaves.find((l) => l.label === "Opinions of his children");

console.log({
  opinion: Number(opinion.toFixed(4)),
  data: Number(data.toFixed(4)),
  kids: kids ? Number(kids.share.toFixed(4)) : null,
  leafSum: Number(leaves.reduce((s, l) => s + l.share, 0).toFixed(4)),
});

if (Math.abs(opinion - 60) > 0.05) throw new Error(`opinion ${opinion} != 60`);
if (Math.abs(data - 11.3) > 0.05) throw new Error(`data ${data} != 11.3`);
if (!kids || Math.abs(kids.share - 1.9) > 0.05) {
  throw new Error(`kids leaf ${kids?.share} != 1.9`);
}

const rLeaves = leafShares(REVERSE_DEMO.sections);
const suspicion = rLeaves
  .filter((l) => l.kind === "opinion" || l.kind === "anecdote")
  .reduce((s, l) => s + l.share, 0);
const verified = rLeaves
  .filter((l) => l.kind === "data")
  .reduce((s, l) => s + l.share, 0);

console.log({
  suspicion: Number(suspicion.toFixed(4)),
  verified: Number(verified.toFixed(4)),
});

if (Math.abs(suspicion - 31) > 0.05) {
  throw new Error(`suspicion ${suspicion} != 31`);
}
if (Math.abs(verified - 69) > 0.05) {
  throw new Error(`verified ${verified} != 69`);
}

console.log("Demo weight fixtures OK");
