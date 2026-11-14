// @vitest-environment jsdom
/**
 * Launch step 1 (C3): notebook text is rendered through MathText (KaTeX) on the student's pages AND on the public
 * read-only share page, so it must never turn student input into live HTML or script.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathText } from "./MathText";

const ATTACKS = [
  '<img src=x onerror="alert(1)">',
  "$<img src=x onerror=alert(1)>$",
  String.raw`$$\href{javascript:alert(1)}{click}$$`,
  String.raw`$\url{javascript:alert(1)}$`,
  String.raw`$\htmlId{x}{y}$ $\includegraphics{https://evil.example/a.png}$`,
  "<script>window.__pwned = 1</script>",
  String.raw`$\text{</span><script>window.__pwned=1</script>}$`,
];

describe("MathText never renders student input as live HTML", () => {
  it.each(ATTACKS)("%s", (source) => {
    const { container } = render(<MathText source={source} />);
    expect(container.querySelector("script, img, iframe, object, embed")).toBeNull();
    for (const el of Array.from(container.querySelectorAll("*"))) {
      for (const attr of Array.from(el.attributes)) {
        expect(attr.name.startsWith("on"), `${el.tagName} has ${attr.name}`).toBe(false);
        expect(attr.value.toLowerCase()).not.toContain("javascript:");
      }
    }
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });
});
