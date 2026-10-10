import { afterEach } from "vitest";

// Component tests (jsdom): jest-dom matchers and a clean DOM between tests. Node tests skip both.
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  await import("@testing-library/jest-dom/vitest");
  afterEach(() => cleanup());
}
