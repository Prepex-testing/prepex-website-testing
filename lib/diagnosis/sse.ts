/**
 * A small server-sent-events reader. `push` takes text as it arrives (any split: events can be cut anywhere), and calls
 * `onEvent(name, data)` once per complete event with `data` JSON-parsed (`null` when it is empty or not JSON).
 * Comment lines (": ping") and unknown fields are ignored.
 */
export function createSseParser(onEvent: (event: string, data: unknown) => void): { push: (chunk: string) => void } {
  let buffer = "";
  return {
    push(chunk: string) {
      buffer += chunk;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        let event = "message";
        const data: string[] = [];
        for (const line of block.split(/\r?\n/)) {
          if (line === "" || line.startsWith(":")) continue;
          const colon = line.indexOf(":");
          const field = colon === -1 ? line : line.slice(0, colon);
          const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
          if (field === "event") event = value;
          else if (field === "data") data.push(value);
        }
        if (data.length === 0 && event === "message") continue;
        let parsed: unknown = null;
        try {
          parsed = data.length > 0 ? JSON.parse(data.join("\n")) : null;
        } catch {
          parsed = null;
        }
        onEvent(event, parsed);
      }
    },
  };
}
