import { useEffect, useMemo, useState } from "react";
import "./styles.css";

/* ---------------- 题库 ---------------- */

type Wine = {
  id: string;
  name: string;
  region: string;
  variety: string;
  vintage: string;
  acidity: string;
  aroma: string;
};

const WINE_DECK: Wine[] = [
  {
    id: "bdx-left",
    name: "波尔多左岸混酿",
    region: "法国 · 波尔多梅多克",
    variety: "赤霞珠为主，配美乐等混酿",
    vintage: "2018",
    acidity: "中高酸，单宁厚实有力",
    aroma: "黑醋栗、雪松、铅笔芯",
  },
  {
    id: "bourgogne-village",
    name: "勃艮第村级黑皮诺",
    region: "法国 · 勃艮第村庄级",
    variety: "黑皮诺",
    vintage: "2020",
    acidity: "高酸，酒体中等偏轻",
    aroma: "红樱桃、蘑菇、湿落叶",
  },
  {
    id: "rioja-reserva",
    name: "里奥哈珍藏丹魄",
    region: "西班牙 · 里奥哈（Rioja Reserva）",
    variety: "丹魄",
    vintage: "2017",
    acidity: "中低酸，单宁柔顺",
    aroma: "香草、椰子、熟李子",
  },
  {
    id: "napa-cab",
    name: "纳帕谷赤霞珠",
    region: "美国 · 加州纳帕谷",
    variety: "赤霞珠",
    vintage: "2019",
    acidity: "中酸，酒体饱满",
    aroma: "黑樱桃、烘焙咖啡、薄荷",
  },
  {
    id: "marlborough-sb",
    name: "马尔堡长相思",
    region: "新西兰 · 马尔堡",
    variety: "长相思（白葡萄酒）",
    vintage: "2022",
    acidity: "高酸，口感脆爽",
    aroma: "百香果、青草、番石榴",
  },
];

const WINE_MAP: Record<string, Wine> = Object.fromEntries(
  WINE_DECK.map((wine) => [wine.id, wine])
);

const TOTAL_WINES = WINE_DECK.length;
const FULL_SCORE = 100;
const CLUE_SCORE = 60;
const STORAGE_KEY = "hxwl-08-training-v1";

/* ---------------- 训练局状态 ---------------- */

type FirstScore = 100 | 60 | 0;

type Feedback = {
  wineId: string;
  chosenId: string | null; // null = 主动「不会，看答案」
  correct: boolean;
  attempts: number;
  firstScored: boolean; // 本次是否是首次作答（决定首次成绩）
  earned: FirstScore | null; // 本次记到的首次成绩；加练轮为 null
};

type Session = {
  version: 1;
  startedAt: number;
  queue: string[]; // 待完成酒款，queue[0] 即当前题；答错后移到队尾
  options: string[]; // 本局选项顺序（开始时打乱一次）
  scores: Partial<Record<string, FirstScore>>; // 每款酒的首次成绩，只记一次
  attempts: Record<string, number>;
  clueViewed: boolean; // 当前题是否已查看线索
  phase: "question" | "feedback";
  feedback: Feedback | null;
  finished: boolean;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createSession(): Session {
  return {
    version: 1,
    startedAt: Date.now(),
    queue: shuffle(WINE_DECK.map((wine) => wine.id)),
    options: shuffle(WINE_DECK.map((wine) => wine.id)),
    scores: {},
    attempts: {},
    clueViewed: false,
    phase: "question",
    feedback: null,
    finished: false,
  };
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed.version !== 1 || !Array.isArray(parsed.queue)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ---------------- 页面 ---------------- */

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [resumed, setResumed] = useState(() => loadSession() !== null);

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const startNew = () => {
    setSession(createSession());
    setResumed(false);
  };

  const abandon = () => {
    if (window.confirm("确定放弃当前这局训练吗？进度和首次成绩都会清空。")) {
      setSession(null);
      setResumed(false);
    }
  };

  const revealClue = () => {
    setSession((prev) =>
      prev && prev.phase === "question" ? { ...prev, clueViewed: true } : prev
    );
  };

  const answer = (chosenId: string | null) => {
    setSession((prev) => {
      if (!prev || prev.phase !== "question") return prev;
      const wineId = prev.queue[0];
      const correct = chosenId === wineId;
      const attempts = {
        ...prev.attempts,
        [wineId]: (prev.attempts[wineId] ?? 0) + 1,
      };
      const firstScored = prev.scores[wineId] === undefined;
      const earned: FirstScore | null = firstScored
        ? correct
          ? prev.clueViewed
            ? CLUE_SCORE
            : FULL_SCORE
          : 0
        : null;
      const scores = firstScored
        ? { ...prev.scores, [wineId]: earned as FirstScore }
        : prev.scores;
      return {
        ...prev,
        attempts,
        scores,
        phase: "feedback",
        feedback: {
          wineId,
          chosenId,
          correct,
          attempts: attempts[wineId],
          firstScored,
          earned,
        },
      };
    });
  };

  const next = () => {
    setSession((prev) => {
      if (!prev || prev.phase !== "feedback" || !prev.feedback) return prev;
      const { wineId, correct } = prev.feedback;
      const [head, ...rest] = prev.queue;
      const queue = correct ? rest : [...rest, wineId]; // 答错排到队尾加练
      if (queue.length === 0) {
        return { ...prev, queue, phase: "question", feedback: null, finished: true };
      }
      return { ...prev, queue, phase: "question", feedback: null, clueViewed: false };
    });
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">hxwl-08 · 五题盲品训练局</p>
          <h1>葡萄酒盲品训练</h1>
          <p className="subtitle">
            根据产区、品种、年份、酸度与香气关键词猜出酒款。先凭记忆作答得 100
            分；查看一次线索后答对记 60 分；答错记 0 分并回到队尾加练，加练通过也不能回升首次成绩。
          </p>
        </div>
        <div className="stack-card">
          <span>本局规则</span>
          <strong>5 款酒 · 满分 500 · 进度自动保存</strong>
          <small>中途离开再回来，从当前题和已有分数继续</small>
        </div>
      </header>

      {!session ? (
        <Intro onStart={startNew} />
      ) : session.finished ? (
        <Result session={session} onRestart={startNew} />
      ) : (
        <Training
          session={session}
          resumed={resumed}
          onRevealClue={() => {
            setResumed(false);
            revealClue();
          }}
          onAnswer={(chosenId) => {
            setResumed(false);
            answer(chosenId);
          }}
          onNext={next}
          onAbandon={abandon}
        />
      )}
    </main>
  );
}

/* ---------------- 开场说明 ---------------- */

function Intro({ onStart }: { onStart: () => void }) {
  const rules = [
    ["直接答对", "凭盲品记忆一次猜中，记 100 分", "rule-full"],
    ["看过线索再答对", "查看一次线索后猜对，首次成绩记 60 分", "rule-clue"],
    ["答错", "首次成绩记 0 分，该酒排到队尾加练", "rule-zero"],
    ["加练通过", "只让训练继续，0 分不能回升", "rule-practice"],
  ] as const;

  return (
    <section className="panel intro-panel">
      <div className="section-heading">
        <div>
          <p>训练说明</p>
          <h2>一局五题，检验是否真的记牢</h2>
        </div>
        <button className="primary-action" onClick={onStart}>
          开始五题训练
        </button>
      </div>
      <div className="rule-grid">
        {rules.map(([title, desc, className]) => (
          <article key={title} className={`rule-card ${className}`}>
            <h3>{title}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </div>
      <p className="intro-note">
        每题先隐藏线索，只保留作答区；线索包括产区、葡萄品种、年份、酸度与香气关键词。
        训练进度保存在本机浏览器中，中途关闭页面后重新打开，会从当时的题和分数接着答。
      </p>
    </section>
  );
}

/* ---------------- 训练进行 ---------------- */

function Training({
  session,
  resumed,
  onRevealClue,
  onAnswer,
  onNext,
  onAbandon,
}: {
  session: Session;
  resumed: boolean;
  onRevealClue: () => void;
  onAnswer: (chosenId: string | null) => void;
  onNext: () => void;
  onAbandon: () => void;
}) {
  const wine = WINE_MAP[session.queue[0]];
  const earnedTotal = useMemo(
    () =>
      Object.values(session.scores).reduce<number>(
        (sum, score) => sum + (score ?? 0),
        0
      ),
    [session.scores]
  );
  const doneCount = TOTAL_WINES - session.queue.length;

  return (
    <section className="workspace training-layout">
      <aside className="panel narrow">
        <h2>本局进度</h2>
        <div className="progress-total">
          <span>当前总分</span>
          <strong>
            {earnedTotal}
            <em> / {TOTAL_WINES * FULL_SCORE}</em>
          </strong>
        </div>
        <p className="progress-line">
          已通过 {doneCount} / {TOTAL_WINES} 款 · 队列剩余 {session.queue.length} 款
        </p>
        <h2>首次成绩</h2>
        <ul className="score-dots">
          {WINE_DECK.map((item) => {
            const score = session.scores[item.id];
            const inQueue = session.queue.includes(item.id);
            return (
              <li key={item.id} className={score === undefined ? "pending" : ""}>
                <span className={`dot score-${score ?? "none"}`}>
                  {score === undefined ? "·" : score}
                </span>
                <span className="dot-name">{item.name}</span>
                {score === 0 && (session.attempts[item.id] ?? 0) > 1 && inQueue && (
                  <em className="tag-practice">加练中</em>
                )}
              </li>
            );
          })}
        </ul>
        <button className="ghost-action" onClick={onAbandon}>
          放弃本局重开
        </button>
      </aside>

      <section className="panel question-panel">
        {resumed && (
          <div className="resume-banner">已恢复上次进度，从这一题和已有分数继续作答。</div>
        )}

        {session.phase === "question" ? (
          <Question
            wine={wine}
            options={session.options}
            clueViewed={session.clueViewed}
            remaining={session.queue.length}
            onRevealClue={onRevealClue}
            onAnswer={onAnswer}
          />
        ) : (
          session.feedback && (
            <FeedbackView
              feedback={session.feedback}
              queueLength={session.queue.length}
              onNext={onNext}
            />
          )
        )}
      </section>
    </section>
  );
}

/* ---------------- 单题 ---------------- */

const CLUE_FIELDS: { key: keyof Omit<Wine, "id" | "name">; label: string }[] = [
  { key: "region", label: "产区" },
  { key: "variety", label: "葡萄品种" },
  { key: "vintage", label: "年份" },
  { key: "acidity", label: "酸度" },
  { key: "aroma", label: "香气关键词" },
];

function Question({
  wine,
  options,
  clueViewed,
  remaining,
  onRevealClue,
  onAnswer,
}: {
  wine: Wine;
  options: string[];
  clueViewed: boolean;
  remaining: number;
  onRevealClue: () => void;
  onAnswer: (chosenId: string | null) => void;
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p>队列第 1 位 · 还剩 {remaining} 款待完成</p>
          <h2>这是哪一款酒？</h2>
        </div>
      </div>

      <div className={`clue-card ${clueViewed ? "revealed" : "hidden"}`}>
        {clueViewed ? (
          <dl className="clue-list">
            {CLUE_FIELDS.map(({ key, label }) => (
              <div key={key} className="clue-item">
                <dt>{label}</dt>
                <dd>{wine[key]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="clue-mask">
            <p>线索已收起：产区 · 品种 · 年份 · 酸度 · 香气关键词</p>
            <span>不看线索直接答对得 100 分</span>
            <button onClick={onRevealClue}>查看一次线索（本题最高 60 分）</button>
          </div>
        )}
      </div>

      {clueViewed && (
        <p className="clue-warn">已查看线索：本次若为首次作答，答对只记 60 分。</p>
      )}

      <div className="option-list">
        {options.map((id) => (
          <button key={id} className="option-btn" onClick={() => onAnswer(id)}>
            {WINE_MAP[id].name}
          </button>
        ))}
      </div>
      <button className="giveup-btn" onClick={() => onAnswer(null)}>
        不会，看答案（按答错处理，排到队尾加练）
      </button>
    </>
  );
}

/* ---------------- 作答反馈 ---------------- */

function FeedbackView({
  feedback,
  queueLength,
  onNext,
}: {
  feedback: Feedback;
  queueLength: number;
  onNext: () => void;
}) {
  const wine = WINE_MAP[feedback.wineId];
  const chosen = feedback.chosenId ? WINE_MAP[feedback.chosenId] : null;
  const isPractice = !feedback.firstScored;

  let headline: string;
  if (feedback.correct && isPractice) {
    headline = `加练通过（第 ${feedback.attempts} 次作答）`;
  } else if (feedback.correct) {
    headline = `回答正确，首次成绩 +${feedback.earned} 分`;
  } else if (isPractice) {
    headline = `加练仍未答对（第 ${feedback.attempts} 次作答）`;
  } else {
    headline = "答错了，首次成绩记 0 分";
  }

  return (
    <>
      <div className={`feedback-banner ${feedback.correct ? "ok" : "bad"}`}>
        <h2>{headline}</h2>
        {!feedback.correct && (
          <p>
            正确答案：<strong>{wine.name}</strong>
            {chosen ? <>（你选了「{chosen.name}」）</> : "（本轮选择跳过）"}
          </p>
        )}
        <p className="feedback-next">
          {feedback.correct
            ? queueLength <= 1
              ? "这是最后一款，即将结束本局。"
              : "该酒已通过，继续队列中的下一款。"
            : "这款酒会排到队尾，稍后重新作答；加练只让练习继续，首次成绩不再变动。"}
        </p>
      </div>

      <div className="answer-card">
        <h3>{wine.name}</h3>
        <dl className="clue-list">
          {CLUE_FIELDS.map(({ key, label }) => (
            <div key={key} className="clue-item">
              <dt>{label}</dt>
              <dd>{wine[key]}</dd>
            </div>
          ))}
        </dl>
      </div>

      {!feedback.correct && (
        <p className="retry-hint">
          它将排到队尾重新作答，前面还有 {Math.max(queueLength - 1, 0)} 款待练。
        </p>
      )}

      <button className="primary-action next-btn" onClick={onNext}>
        {feedback.correct
          ? queueLength <= 1
            ? "查看本局成绩"
            : "下一款"
          : queueLength === 1
            ? "开始加练"
            : "继续，队尾见这款酒"}
      </button>
    </>
  );
}

/* ---------------- 结算 ---------------- */

function Result({ session, onRestart }: { session: Session; onRestart: () => void }) {
  const total = Object.values(session.scores).reduce<number>(
    (sum, score) => sum + (score ?? 0),
    0
  );
  const wrongWines = WINE_DECK.filter((wine) => session.scores[wine.id] === 0);
  const fullCount = WINE_DECK.filter((wine) => session.scores[wine.id] === 100).length;
  const clueCount = WINE_DECK.filter((wine) => session.scores[wine.id] === 60).length;

  return (
    <section className="panel result-panel">
      <div className="result-summary">
        <p className="eyebrow">本局结束</p>
        <h2>
          总分 <strong>{total}</strong> / {TOTAL_WINES * FULL_SCORE}
        </h2>
        <p className="result-breakdown">
          一次答对 {fullCount} 款 · 看线索后答对 {clueCount} 款 · 首次答错 {wrongWines.length}{" "}
          款
        </p>
      </div>

      <h3>各款首次成绩</h3>
      <ul className="result-list">
        {WINE_DECK.map((wine) => {
          const score = session.scores[wine.id] ?? 0;
          return (
            <li key={wine.id} className={`result-row score-row-${score}`}>
              <span className={`dot score-${score}`}>{score}</span>
              <div>
                <strong>{wine.name}</strong>
                <small>
                  作答 {session.attempts[wine.id] ?? 0} 次 · {wine.region} · {wine.vintage}
                </small>
              </div>
            </li>
          );
        })}
      </ul>

      <h3>错题酒款 · 复习清单</h3>
      {wrongWines.length === 0 ? (
        <p className="all-pass">本局没有首次答错的酒款，全部通过！</p>
      ) : (
        <div className="review-list">
          {wrongWines.map((wine) => (
            <article key={wine.id} className="review-card">
              <h4>{wine.name}</h4>
              <dl className="clue-list">
                {CLUE_FIELDS.map(({ key, label }) => (
                  <div key={key} className="clue-item">
                    <dt>{label}</dt>
                    <dd>{wine[key]}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}

      <button className="primary-action next-btn" onClick={onRestart}>
        再练一局
      </button>
    </section>
  );
}
