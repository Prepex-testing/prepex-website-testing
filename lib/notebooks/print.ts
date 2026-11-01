import type { Block } from "@/lib/api/notebooks";

/** Groups a page's blocks so consecutive ones render together and every solution stands alone. */
export function segments(blocks: Block[], hideSolutions: boolean): { kind: "blocks" | "solution"; blocks: Block[] }[] {
  const out: { kind: "blocks" | "solution"; blocks: Block[] }[] = [];
  for (const b of blocks) {
    if (b.type === "solution") {
      if (hideSolutions || !(b.text ?? "").trim()) continue;
      out.push({ kind: "solution", blocks: [b] });
      continue;
    }
    const last = out[out.length - 1];
    if (last?.kind === "blocks") last.blocks.push(b);
    else out.push({ kind: "blocks", blocks: [b] });
  }
  return out;
}
