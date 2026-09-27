import { WINE_BANK } from "../data/wines";

export const SESSION_SIZE = 5; // 一局五题
export const OPTION_COUNT = 4; // 每题四个选项
export const SCORE_DIRECT = 100; // 直接答对
export const SCORE_PEEKED = 60; // 看一次线索后答对
export const MAX_SCORE = SESSION_SIZE * SCORE_DIRECT;

const STORAGE_KEY = "hxwl08.blindTasting.session.v1";

export interface QueueItem {
  wineId: string;
  optionIds: string[];
  peeked: boolean; // 本题是否看过线索
  isRetry: boolean; // 是否为答错后排入队尾的加练题
}

export interface ResultEntry {
  wineId: string;
  score: number; // 首次成绩：100 / 60 / 0，锁定后不再变化
  peeked: boolean;
}

export interface Feedback {
  wineId: string;
  chosenId: string;
  optionIds: string[];
  peeked: boolean;
  correct: boolean;
  scoreDelta: number; // 本次作答带来的分数变化（加练为 0）
  isRetry: boolean;
}

export interface Session {
  status: "playing" | "finished";
  queue: QueueItem[]; // 待答队列，队首为当前题，答错的排到队尾
  results: ResultEntry[]; // 每题的首次成绩，每题只记录一次
  lastFeedback: Feedback | null; // 待学员确认的作答反馈
  startedAt: number;
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createSession(): Session {
  const picked = shuffle(WINE_BANK).slice(0, SESSION_SIZE);
  const queue = picked.map((wine) => {
    const distractors = shuffle(WINE_BANK.filter((w) => w.id !== wine.id))
      .slice(0, OPTION_COUNT - 1)
      .map((w) => w.id);
    return {
      wineId: wine.id,
      optionIds: shuffle([wine.id, ...distractors]),
      peeked: false,
      isRetry: false,
    };
  });
  return { status: "playing", queue, results: [], lastFeedback: null, startedAt: Date.now() };
}

export function peek(session: Session): Session {
  if (session.status !== "playing" || session.lastFeedback) return session;
  const [head, ...rest] = session.queue;
  if (!head || head.peeked) return session;
  return { ...session, queue: [{ ...head, peeked: true }, ...rest] };
}

export function answer(session: Session, chosenId: string): Session {
  if (session.status !== "playing" || session.lastFeedback) return session;
  const [head, ...rest] = session.queue;
  if (!head || !head.optionIds.includes(chosenId)) return session;

  const correct = chosenId === head.wineId;
  let queue: QueueItem[];
  let results = session.results;
  let scoreDelta = 0;

  if (!head.isRetry) {
    // 首次作答：当场锁定首次成绩，之后加练不再改动
    const score = correct ? (head.peeked ? SCORE_PEEKED : SCORE_DIRECT) : 0;
    scoreDelta = score;
    results = [...results, { wineId: head.wineId, score, peeked: head.peeked }];
    queue = correct ? rest : [...rest, { ...head, isRetry: true }];
  } else {
    // 加练作答：答对只让练习继续，答错重新排队，均不影响首次成绩
    queue = correct ? rest : [...rest, head];
  }

  const lastFeedback: Feedback = {
    wineId: head.wineId,
    chosenId,
    optionIds: head.optionIds,
    peeked: head.peeked,
    correct,
    scoreDelta,
    isRetry: head.isRetry,
  };
  return { ...session, queue, results, lastFeedback };
}

export function acknowledge(session: Session): Session {
  if (session.status !== "playing" || !session.lastFeedback) return session;
  const finished = session.queue.length === 0;
  return { ...session, lastFeedback: null, status: finished ? "finished" : "playing" };
}

export function totalScore(session: Session): number {
  return session.results.reduce((sum, r) => sum + r.score, 0);
}

export function wrongWineIds(session: Session): string[] {
  return session.results.filter((r) => r.score === 0).map((r) => r.wineId);
}

// ---- 本地存档：学员中途离开后，从当时的题和分数接着答 ----

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // 隐私模式等场景写入失败时静默降级，仅失去断点续答
  }
}

function isWineId(id: unknown): id is string {
  return typeof id === "string" && WINE_BANK.some((w) => w.id === id);
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const s = value as Session;
  if (s.status !== "playing" && s.status !== "finished") return false;
  if (!Array.isArray(s.queue) || !Array.isArray(s.results)) return false;
  const validItem = (q: QueueItem) =>
    q &&
    isWineId(q.wineId) &&
    Array.isArray(q.optionIds) &&
    q.optionIds.every(isWineId) &&
    typeof q.peeked === "boolean" &&
    typeof q.isRetry === "boolean";
  if (!s.queue.every(validItem)) return false;
  if (
    !s.results.every(
      (r) => r && isWineId(r.wineId) && typeof r.score === "number" && typeof r.peeked === "boolean"
    )
  ) {
    return false;
  }
  if (s.lastFeedback) {
    const f = s.lastFeedback;
    if (!isWineId(f.wineId) || !isWineId(f.chosenId) || !Array.isArray(f.optionIds)) return false;
  }
  return true;
}
