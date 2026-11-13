"use client";

/**
 * Onboarding v2 (C3): Pexo out loud and an optional "Say it" mic. Everything here is optional: a tap does every
 * job, nothing auto-advances, and the mic is hidden where the browser cannot listen (including an installed iOS app,
 * where recognition is unreliable). Speech only ever starts after the student has tapped (the prefs choice), which is
 * also what browsers require.
 */

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isInstalledIos(): boolean {
  if (typeof window === "undefined") return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
  return ios && standalone;
}

export function canListen(): boolean {
  return recognitionCtor() !== null && !isInstalledIos();
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

/** Say a line in an Indian English or Hindi voice when the device has one. Cancels whatever was being said. */
export function speak(text: string, language: "en" | "hi"): void {
  if (!canSpeak()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const want = language === "hi" ? ["hi-IN", "en-IN"] : ["en-IN", "en-GB", "en-US"];
    const voices = synth.getVoices();
    const voice = want.map((l) => voices.find((v) => v.lang === l)).find(Boolean);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? want[0]!;
    u.rate = 1.05;
    synth.speak(u);
  } catch {
    /* speech is a nicety */
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function buzz(): void {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* not supported */
  }
}

/** Listen once; resolves to what was heard ("" for silence). Rejects when the mic is refused or fails. */
export function listenOnce(language: "en" | "hi", timeoutMs = 7000): { result: Promise<string>; stop: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { result: Promise.reject(new Error("unsupported")), stop: () => undefined };
  const rec = new Ctor();
  rec.lang = language === "hi" ? "hi-IN" : "en-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const result = new Promise<string>((resolve, reject) => {
    let heard = "";
    rec.onresult = (e) => {
      heard = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
    };
    rec.onerror = (e) => (e.error === "no-speech" ? resolve("") : reject(new Error(e.error)));
    rec.onend = () => {
      clearTimeout(timer);
      resolve(heard);
    };
    try {
      rec.start();
      timer = setTimeout(() => rec.stop(), timeoutMs);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("start failed"));
    }
  });
  return { result, stop: () => rec.stop() };
}
