"use client";

import { Fragment, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders library text that mixes prose with LaTeX — formula sheets and notes
 * store expressions as `$$…$$` (display) or `$…$` (inline), sometimes several
 * per entry with labels in between. Text outside the delimiters is shown as-is
 * (newlines kept, `**bold**` honoured); plain-Unicode formulas pass through
 * untouched.
 *
 * KaTeX escapes its input and runs with `trust: false`, so the HTML injected
 * for each math span can't carry markup from the source; prose segments are
 * rendered as React text, never as HTML.
 */

type Segment = { kind: "text" | "inline" | "display"; value: string };

const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function splitMath(source: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of source.matchAll(MATH_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ kind: "text", value: source.slice(last, index) });
    segments.push(
      match[1] !== undefined ? { kind: "display", value: match[1] } : { kind: "inline", value: match[2] ?? "" },
    );
    last = index + match[0].length;
  }
  if (last < source.length) segments.push({ kind: "text", value: source.slice(last) });

  // A display equation is already its own block, so the newline separating
  // it from its neighbours would otherwise add a blank line.
  return segments
    .map((segment, index) => {
      if (segment.kind !== "text") return segment;
      let value = segment.value;
      if (segments[index - 1]?.kind === "display") value = value.replace(/^[ \t]*\n/, "");
      if (segments[index + 1]?.kind === "display") value = value.replace(/\n[ \t]*$/, "");
      return { ...segment, value };
    })
    .filter((segment) => segment.kind !== "text" || segment.value !== "");
}

function renderMath(value: string, displayMode: boolean): string {
  return katex.renderToString(value, { displayMode, throwOnError: false, output: "html" });
}

function Prose({ value }: { value: string }) {
  // "**COMPONENTS:**"-style labels appear in a few formula entries.
  const parts = value.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>,
      )}
    </>
  );
}

export function MathText({ source, className = "" }: { source: string; className?: string }) {
  const segments = useMemo(
    () =>
      splitMath(source).map((segment) =>
        segment.kind === "text" ? segment : { ...segment, html: renderMath(segment.value, segment.kind === "display") },
      ),
    [source],
  );

  return (
    // Long display equations scroll sideways instead of overflowing the card.
    <div className={`whitespace-pre-wrap break-words [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1 ${className}`}>
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          <Prose key={index} value={segment.value} />
        ) : (
          <span
            key={index}
            className={segment.kind === "display" ? "block whitespace-normal" : "whitespace-normal"}
            dangerouslySetInnerHTML={{ __html: "html" in segment ? segment.html : "" }}
          />
        ),
      )}
    </div>
  );
}
