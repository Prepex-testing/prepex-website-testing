import { createEntry, updateEntry, uploadAsset, type Reason, type Source } from "@/lib/api/notebooks";
import { compressImage } from "@/lib/notebooks/compress";
import { newId } from "@/lib/notebooks/model";

export type CaptureItem = { blob: Blob; reason: Reason | null };
export type CaptureTarget = { chapterId: string | null; subjectId: number | null; source: Source | null; sourceRef?: string | null; mockId?: string | null };

/**
 * Saves one photographed question as a mistake page: the page is made first (so it exists even if the upload fails), the photo is
 * attached, and the page's body becomes that photo. Returns the new page id.
 */
export async function saveCapturedMistake(item: CaptureItem, t: CaptureTarget): Promise<string> {
  const entry = await createEntry({
    entryType: "mistake",
    chapterId: t.chapterId,
    subjectId: t.subjectId,
    reason: item.reason,
    source: t.source,
    sourceRef: t.sourceRef ?? null,
    mockId: t.mockId ?? null,
  });
  const body = await compressImage(item.blob);
  const asset = await uploadAsset(entry.id, body, "photo.webp");
  await updateEntry(entry.id, { blocks: [{ id: newId(), type: "image", assetId: asset.id }] });
  return entry.id;
}

/** Saves a list one after another (a phone on a poor connection does better than ten uploads at once); reports each result. */
export async function saveCapturedBatch(items: CaptureItem[], t: CaptureTarget, onProgress?: (done: number, total: number) => void): Promise<{ saved: string[]; failed: number[] }> {
  const saved: string[] = [];
  const failed: number[] = [];
  for (let i = 0; i < items.length; i += 1) {
    try {
      saved.push(await saveCapturedMistake(items[i]!, t));
    } catch {
      failed.push(i);
    }
    onProgress?.(i + 1, items.length);
  }
  return { saved, failed };
}
