// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_DATA_URL_CHARS, canCaptureScreen, captureScreen, fitWithin, toJpegDataUrl } from "@/lib/feedback/screenshot";

describe("fitWithin", () => {
  it("leaves a small image alone and shrinks a big one keeping its shape", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1280, 720)).toEqual({ width: 1280, height: 720 });
    expect(fitWithin(2560, 1440)).toEqual({ width: 1280, height: 720 });
    expect(fitWithin(1170, 2532)).toEqual({ width: 591, height: 1280 }); // a phone screenshot
    expect(fitWithin(5000, 10, 1280)).toEqual({ width: 1280, height: 3 });
    expect(fitWithin(0, 0)).toEqual({ width: 1, height: 1 });
  });
});

function fakeDoc(urlFor: (w: number) => string) {
  const calls: { w: number; h: number; type: string; quality: number }[] = [];
  const doc = {
    createElement: () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() }),
        toDataURL: (type: string, quality: number) => {
          calls.push({ w: canvas.width, h: canvas.height, type, quality });
          return urlFor(canvas.width);
        },
      };
      return canvas;
    },
  } as unknown as Document;
  return { doc, calls };
}

describe("toJpegDataUrl", () => {
  it("draws at the fitted size and returns a JPEG data URL", () => {
    const { doc, calls } = fakeDoc(() => "data:image/jpeg;base64,AAAA");
    expect(toJpegDataUrl({} as CanvasImageSource, 2560, 1440, doc)).toBe("data:image/jpeg;base64,AAAA");
    expect(calls).toEqual([{ w: 1280, h: 720, type: "image/jpeg", quality: 0.72 }]);
  });

  it("shrinks further until it fits the server's limit, and gives up with a clear message", () => {
    const { doc, calls } = fakeDoc((w) => "x".repeat(w > 700 ? MAX_DATA_URL_CHARS + 1 : 1000));
    expect(toJpegDataUrl({} as CanvasImageSource, 2560, 1440, doc)).toHaveLength(1000);
    expect(calls.map((c) => c.w)).toEqual([1280, 896, 627]);
    const never = fakeDoc(() => "x".repeat(MAX_DATA_URL_CHARS + 1));
    expect(() => toJpegDataUrl({} as CanvasImageSource, 2560, 1440, never.doc)).toThrow("too large");
  });

  it("a browser without canvas support says so", () => {
    const doc = { createElement: () => ({ getContext: () => null }) } as unknown as Document;
    expect(() => toJpegDataUrl({} as CanvasImageSource, 10, 10, doc)).toThrow("cannot prepare");
  });
});

describe("capturing the screen", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("only where getDisplayMedia exists", () => {
    expect(canCaptureScreen({ mediaDevices: { getDisplayMedia: () => undefined } } as unknown as Navigator)).toBe(true);
    expect(canCaptureScreen({ mediaDevices: undefined } as unknown as Navigator)).toBe(false);
    expect(canCaptureScreen({} as Navigator)).toBe(false);
  });

  it("a student who cancels the picker gets null, not an error; any other failure is passed on", async () => {
    const denied = { mediaDevices: { getDisplayMedia: () => Promise.reject(new DOMException("no", "NotAllowedError")) } } as unknown as Navigator;
    expect(await captureScreen(denied)).toBeNull();
    const broken = { mediaDevices: { getDisplayMedia: () => Promise.reject(new Error("boom")) } } as unknown as Navigator;
    await expect(captureScreen(broken)).rejects.toThrow("boom");
  });
});
