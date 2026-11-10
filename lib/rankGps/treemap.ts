/** A squarified treemap: lays items out in a w x h box, each rectangle's area proportional to its value. Pure, so it is tested. */
export type Rect = { x: number; y: number; w: number; h: number };

function worst(row: number[], side: number): number {
  const sum = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}

export function squarify<T extends { value: number }>(items: T[], w: number, h: number): (T & Rect)[] {
  const list = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = list.reduce((a, b) => a + b.value, 0);
  if (list.length === 0 || total <= 0) return [];
  const scale = (w * h) / total;
  const areas = list.map((i) => i.value * scale);
  const out: (T & Rect)[] = [];
  let x = 0;
  let y = 0;
  let bw = w;
  let bh = h;
  let i = 0;
  while (i < list.length) {
    const side = Math.min(bw, bh);
    const row: number[] = [areas[i]!];
    let j = i + 1;
    while (j < list.length && worst([...row, areas[j]!], side) <= worst(row, side)) {
      row.push(areas[j]!);
      j += 1;
    }
    const rowSum = row.reduce((a, b) => a + b, 0);
    if (bw >= bh) {
      const colW = rowSum / bh;
      let cy = y;
      row.forEach((a, k) => {
        const rh = a / colW;
        out.push({ ...list[i + k]!, x, y: cy, w: colW, h: rh });
        cy += rh;
      });
      x += colW;
      bw -= colW;
    } else {
      const rowH = rowSum / bw;
      let cx = x;
      row.forEach((a, k) => {
        const rw = a / rowH;
        out.push({ ...list[i + k]!, x: cx, y, w: rw, h: rowH });
        cx += rw;
      });
      y += rowH;
      bh -= rowH;
    }
    i = j;
  }
  return out;
}
