// A stand-in for Prepex Brain, for the Phase 5 E2E suite. Never talks to the real Brain.
//
//   node e2e/fake-brain.mjs            → listens on :4999
//   BRAIN_BASE_URL=http://127.0.0.1:4999 BRAIN_API_KEY=e2e-brain-key   ← core-service env
//
// It answers POST /brain/answer the way the real one does (tutor template first, our named sections after), after a delay
// so the UI's "working" state is visible. Control endpoints for the tests:
//   POST /__mode  {"fail": true|false, "delayMs": 2500}   switch to returning 502 / change the delay
//                 {"streamDelayMs": 120, "streamFailAfter": 3}   pace of POST /brain/answer/stream; drop the connection after N pieces
//   GET  /__requests                                       every request seen (auth header, mode, payload) as JSON
import http from "node:http";

const PORT = Number(process.env.FAKE_BRAIN_PORT ?? 4999);
const KEY = process.env.FAKE_BRAIN_KEY ?? "e2e-brain-key";
let state = { fail: false, delayMs: 2500, streamDelayMs: 120, streamFailAfter: null };
const seen = [];

const WEEKLY = `## Short answer
Your week has a pattern worth fixing.

## Explanation
(tutor scaffolding that the product strips)

## JEE traps
1. Do not skip the basics.

## What to try next
Keep going.

## WHAT IS WORKING
You studied on most days and Kinematics got the most time.

## WHAT IS LEAKING
Chemistry got no time at all, and practice accuracy is not being tracked.

## TOP 3 FIXES
1. Kinematics: 90 minutes of problems on Monday.
2. Atomic Structure: 45 minutes on Thursday.
3. A floor of 30 minutes on slow days.
FIXES_JSON: [{"title":"Kinematics: 90 minutes of graph problems","chapter":"Kinematics","minutes":90},{"title":"Atomic Structure: 45 minutes","chapter":"Atomic Structure","minutes":45},{"title":"Keep a 30-minute floor on slow days","chapter":"Kinematics","minutes":30}]`;

const DAILY = `## Short answer
Tutor preamble that the product strips.

## What to try next
Keep going.

## OBSERVATION
You studied 120 minutes today, mostly Kinematics, which is well above your recent average.

## NUDGE
Tomorrow start with 20 minutes on the Kinematics graph mistakes before anything new.`;

// 5C — the goal assistant: the tutor template first, our one machine-readable line last.
const SUGGESTION = `## Short answer
Tutor preamble that the product strips.

## What to try next
Keep going.

SUGGESTION_JSON: {"hours": 4, "sub_topics": ["Graph reading", "Relative motion", "Projectile motion"], "pyq_year": 2019, "why": "Your practice here is under 60% and graph mistakes repeat."}`;

// 5D — the 30-day diagnosis, as the real /brain/answer/stream sends it: the tutor template first, then our five sections.
const REPORT_PIECES = [
  "## Short answer\n",
  "Your month has a shape worth fixing.\n\n## Explanation\n(tutor scaffolding that the product strips)\n\n",
  "## STRENGTHS\n- You studied on 22 of 30 days, ",
  "mostly Kinematics.\n- Laws of Motion is at 85% over 40 questions.\n- Focus sessions finish more often than they break.\n\n",
  "## BLEEDING CHAPTERS\n- Kinematics: 37.5% over 24 questions, ",
  "and the graph mistakes repeat.\n- Atomic Structure: no practice logged at all.\n\n",
  "## REVISION DEBT\nEleven mistakes are past their review date and nine backlog items are open.\n\n",
  "## MOCK TRAJECTORY\nTwo mocks, 52% then 58%. That is too little data for a rank projection; take two more.\n\n",
  "## 30-DAY ACTION PLAN\nOne front at a time.\n\nWeek 1: 6 hours on Kinematics, graphs first.\n",
  "Week 2: Laws of Motion problems, about 4.5 hours.\n",
  "Week 3: Mixed practice and a revision pass.\n",
  "Week 4: Two mocks and a full review.\n\n",
  "## JEE traps\n1. Signs in v-t graphs.\n\n## What to try next\nKeep going.",
];

function streamReport(res) {
  res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" });
  res.write(`event: meta\ndata: ${JSON.stringify({ mode: "fast", model_used: "fake-brain", prompt_version: "e2e-stream-1" })}\n\n`);
  let i = 0;
  const next = () => {
    if (state.streamFailAfter !== null && i >= state.streamFailAfter) return res.destroy();
    if (i >= REPORT_PIECES.length) {
      res.write(`event: done\ndata: ${JSON.stringify({ citations: [], confidence: 0.6, tokens_used: 2000, words: 800 })}\n\n`);
      return res.end();
    }
    res.write(`event: delta\ndata: ${JSON.stringify({ text: REPORT_PIECES[i++] })}\n\n`);
    setTimeout(next, state.streamDelayMs);
  };
  setTimeout(next, state.delayMs);
}

const server = http.createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://x");
    const raw = Buffer.concat(chunks).toString("utf8");
    if (url.pathname === "/__mode" && req.method === "POST") {
      state = { ...state, ...JSON.parse(raw || "{}") };
      return send(200, state);
    }
    if (url.pathname === "/__requests") return send(200, seen);
    if (url.pathname === "/__reset") {
      seen.length = 0;
      state = { fail: false, delayMs: 2500, streamDelayMs: 120, streamFailAfter: null };
      return send(200, state);
    }
    if (req.method !== "POST" || !url.pathname.startsWith("/brain/")) return send(404, { detail: "not found" });
    if (req.headers.authorization !== `Bearer ${KEY}`) return send(401, { detail: "unauthorized" });
    let payload = {};
    try {
      payload = JSON.parse(raw || "{}");
    } catch {
      return send(422, { detail: "bad json" });
    }
    seen.push({ path: url.pathname, mode: url.searchParams.get("mode") ?? "fast", payload, at: Date.now() });
    if (url.pathname === "/brain/answer/stream") {
      if (state.fail) return send(502, { detail: "upstream unavailable" });
      return streamReport(res);
    }
    setTimeout(() => {
      if (state.fail) return send(502, { detail: "upstream unavailable" });
      const question = String(payload.question ?? "");
      const answer = question.includes("Student wants to set this week's goal for") ? SUGGESTION : question.includes("OBSERVATION, NUDGE") ? DAILY : WEEKLY;
      send(200, { answer, citations: [], confidence: 0.8, model_used: "fake-brain", mode: url.searchParams.get("mode") ?? "fast", tokens_used: 1234, prompt_version: "e2e-1" });
    }, state.delayMs);
  });
});

server.listen(PORT, "127.0.0.1", () => console.log(`fake brain on :${PORT}`));
