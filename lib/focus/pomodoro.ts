/**
 * Pomodoro maths. A break is a PAUSE on the server: the clock the server keeps counts only focused seconds, so a
 * break never lands in the study log. The timer shows the current block, pauses itself at the end of a block, and
 * counts the break down from the moment it paused.
 */

export type PomodoroConfig = {
  studyMinutes: number;
  breakMinutes: number;
  cycles: number;
};

export const DEFAULT_POMODORO: PomodoroConfig = { studyMinutes: 25, breakMinutes: 5, cycles: 4 };

const clampInt = (value: number, min: number, max: number, fallback: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;

export function clampPomodoro(config: Partial<PomodoroConfig>): PomodoroConfig {
  return {
    studyMinutes: clampInt(config.studyMinutes ?? DEFAULT_POMODORO.studyMinutes, 1, 180, DEFAULT_POMODORO.studyMinutes),
    breakMinutes: clampInt(config.breakMinutes ?? DEFAULT_POMODORO.breakMinutes, 1, 60, DEFAULT_POMODORO.breakMinutes),
    cycles: clampInt(config.cycles ?? DEFAULT_POMODORO.cycles, 1, 12, DEFAULT_POMODORO.cycles),
  };
}

/** The study time the whole run adds up to (the session's "planned minutes"). Capped at the server's 8-hour limit. */
export function pomodoroPlannedMinutes(config: PomodoroConfig): number {
  return Math.min(480, config.studyMinutes * config.cycles);
}

/** A target length ("45 minutes") as the classic 25/5 rhythm that fits it best. */
export function pomodoroForTarget(targetMinutes: number): PomodoroConfig {
  const study = DEFAULT_POMODORO.studyMinutes;
  return clampPomodoro({ studyMinutes: study, breakMinutes: DEFAULT_POMODORO.breakMinutes, cycles: Math.max(1, Math.round(targetMinutes / study)) });
}

export type PomodoroPosition = {
  /** 1-based block the student is in (the last block while in overtime). */
  cycle: number;
  cycles: number;
  secondsIntoBlock: number;
  blockSeconds: number;
  /** Seconds left in this block; 0 once every block is done. */
  remainingInBlock: number;
  /** Every block has been studied. */
  finished: boolean;
};

export function pomodoroPosition(config: PomodoroConfig, focusedSeconds: number): PomodoroPosition {
  const blockSeconds = config.studyMinutes * 60;
  const done = Math.max(0, Math.floor(focusedSeconds / blockSeconds));
  if (done >= config.cycles) {
    return { cycle: config.cycles, cycles: config.cycles, secondsIntoBlock: blockSeconds, blockSeconds, remainingInBlock: 0, finished: true };
  }
  const into = Math.max(0, focusedSeconds - done * blockSeconds);
  return { cycle: done + 1, cycles: config.cycles, secondsIntoBlock: into, blockSeconds, remainingInBlock: blockSeconds - into, finished: false };
}

/**
 * A break is due when a whole block has been studied, it is not the last one, and the break for it has not been taken.
 * `breaksTaken` counts the breaks already started in this session.
 */
export function breakDue(config: PomodoroConfig, focusedSeconds: number, breaksTaken: number): boolean {
  const blocks = Math.floor(focusedSeconds / (config.studyMinutes * 60));
  return blocks >= 1 && blocks < config.cycles && blocks > breaksTaken;
}

/** Break time left, given how long the session has been paused for. */
export function breakRemainingSeconds(config: PomodoroConfig, pausedForSeconds: number): number {
  return Math.max(0, config.breakMinutes * 60 - Math.max(0, Math.floor(pausedForSeconds)));
}

/** Breaks already behind a student who reloads mid-session: every earlier block boundary they have passed. */
export function breaksTakenBefore(config: PomodoroConfig, focusedSeconds: number, pausedAtBoundary: boolean): number {
  const blocks = Math.min(config.cycles - 1, Math.floor(focusedSeconds / (config.studyMinutes * 60)));
  // paused exactly on a boundary: that break is the one in progress, so it is not "taken" yet
  return pausedAtBoundary ? Math.max(0, blocks - 1) : blocks;
}
