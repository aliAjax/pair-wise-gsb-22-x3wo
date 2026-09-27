import { useEffect, useState } from "react";
import "./styles.css";
import { WINE_BANK, WINE_BY_ID } from "./data/wines";
import type { Wine } from "./data/wines";
import {
  MAX_SCORE,
  SCORE_PEEKED,
  SESSION_SIZE,
  acknowledge,
  answer,
  createSession,
  loadSession,
  peek,
  saveSession,
  totalScore,
  wrongWineIds,
} from "./game/session";
import type { Session } from "./game/session";

function Hero({ session }: { session: Session | null }) {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">hxwl-08 · 盲品训练</p>
        <h1>葡萄酒盲品训练</h1>
        <p className="subtitle">
          根据香气关键词与酸度判断酒款，拿不准可翻看产区、品种、年份线索。
          一局五题：直接答对 100 分，看线索答对 60 分，答错 0 分并排入队尾加练。
        </p>
      </div>
      <div className="stack-card">
        {!session && (
          <>
            <span>训练规则</span>
            <strong>
              一局 {SESSION_SIZE} 题 · 满分 {MAX_SCORE}
            </strong>
            <span>中途离开自动存档，回来接着答</span>
          </>
        )}
        {session?.status === "playing" && (
          <>
            <span>本局进行中</span>
            <strong>{totalScore(session)} 分</strong>
            <span>
              已出分 {session.results.length} / {SESSION_SIZE} · 队列剩余 {session.queue.length} 题
            </span>
          </>
        )}
        {session?.status === "finished" && (
          <>
            <span>上一局总分</span>
            <strong>
              {totalScore(session)} / {MAX_SCORE}
            </strong>
            <span>错题 {wrongWineIds(session).length} 款</span>
          </>
        )}
      </div>
    </section>
  );
}

function WineCard({ wine }: { wine: Wine }) {
  return (
    <article className="wine-card">
      <h3>{wine.name}</h3>
      <dl>
        <div>
          <dt>产区</dt>
          <dd>{wine.region}</dd>
        </div>
        <div>
          <dt>葡萄品种</dt>
          <dd>{wine.grape}</dd>
        </div>
        <div>
          <dt>年份</dt>
          <dd>{wine.vintage}</dd>
        </div>
        <div>
          <dt>酸度</dt>
          <dd>{wine.acidity}</dd>
        </div>
        <div>
          <dt>香气</dt>
          <dd>{wine.aromas}</dd>
        </div>
      </dl>
    </article>
  );
}

function IdleView({ onStart }: { onStart: () => void }) {
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p>训练规则</p>
            <h2>一局五题，准备好就开始</h2>
          </div>
          <button className="primary-action" onClick={onStart}>
            开始一局
          </button>
        </div>
        <ul className="rules-list">
          <li>每题先给出香气关键词和酸度，从四个选项中选出对应酒款。</li>
          <li>拿不准可以「看线索」，翻看产区、品种、年份后再作答。</li>
          <li>直接答对得 100 分；看一次线索后答对得 60 分，记为首次成绩。</li>
          <li>答错得 0 分，题目排到队尾加练；加练答对只让练习继续，首次成绩不再回升。</li>
          <li>中途离开进度自动保存，回来从当时的题和分数接着答。</li>
        </ul>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>卡片库</p>
            <h2>盲品卡片（{WINE_BANK.length} 款）</h2>
          </div>
        </div>
        <div className="library-grid">
          {WINE_BANK.map((wine) => (
            <WineCard key={wine.id} wine={wine} />
          ))}
        </div>
      </section>
    </>
  );
}

function GameView({
  session,
  onChange,
  onQuit,
}: {
  session: Session;
  onChange: (next: Session) => void;
  onQuit: () => void;
}) {
  const feedback = session.lastFeedback;
  const head = session.queue[0];
  // 作答反馈期间题目可能已出队，此时用反馈里保存的快照渲染
  const view = feedback
    ? {
        wineId: feedback.wineId,
        optionIds: feedback.optionIds,
        peeked: feedback.peeked,
        isRetry: feedback.isRetry,
      }
    : head;
  if (!view) return null;

  const wine = WINE_BY_ID[view.wineId];
  const scored = session.results.length;
  const retryCount = session.queue.filter((q) => q.isRetry).length;
  const isLastQuestion = feedback !== null && session.queue.length === 0;

  const handleQuit = () => {
    if (window.confirm("确定放弃本局？当前进度和得分将被清除。")) onQuit();
  };

  return (
    <>
      <section className="scoreboard">
        <div>
          <span>当前总分</span>
          <strong>{totalScore(session)}</strong>
        </div>
        <div>
          <span>已出分</span>
          <strong>
            {scored} / {SESSION_SIZE}
          </strong>
        </div>
        <div>
          <span>待答队列</span>
          <strong>
            {session.queue.length} 题{retryCount > 0 ? `（含加练 ${retryCount}）` : ""}
          </strong>
        </div>
        <div className="spacer" />
        <button className="ghost-danger" onClick={handleQuit}>
          放弃本局
        </button>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(scored / SESSION_SIZE) * 100}%` }} />
        </div>
      </section>

      <section className="panel question-panel">
        <div className="question-head">
          <div>
            <p className="eyebrow">
              盲品题
              {view.isRetry && <span className="badge-retry">加练题 · 答对不计分</span>}
            </p>
            <h2>这是哪一款酒？</h2>
          </div>
          {!feedback &&
            (view.peeked ? (
              <span className="peek-note">
                {view.isRetry ? "已看线索" : `已看线索 · 答对计 ${SCORE_PEEKED} 分`}
              </span>
            ) : (
              <button onClick={() => onChange(peek(session))}>
                看线索{view.isRetry ? "" : `（答对计 ${SCORE_PEEKED} 分）`}
              </button>
            ))}
        </div>

        <div className="clue-grid">
          <div className="clue">
            <span>香气关键词</span>
            <strong>{wine.aromas}</strong>
          </div>
          <div className="clue">
            <span>酸度</span>
            <strong>{wine.acidity}</strong>
          </div>
          {view.peeked ? (
            <>
              <div className="clue">
                <span>产区</span>
                <strong>{wine.region}</strong>
              </div>
              <div className="clue">
                <span>葡萄品种</span>
                <strong>{wine.grape}</strong>
              </div>
              <div className="clue">
                <span>年份</span>
                <strong>{wine.vintage}</strong>
              </div>
            </>
          ) : (
            <div className="clue masked">
              <span>产区 · 葡萄品种 · 年份</span>
              <strong>看线索后显示</strong>
            </div>
          )}
        </div>

        <div className="options-grid">
          {view.optionIds.map((id) => {
            let cls = "option-btn";
            if (feedback) {
              if (id === feedback.wineId) cls += " option-correct";
              else if (id === feedback.chosenId) cls += " option-wrong";
            }
            return (
              <button
                key={id}
                className={cls}
                disabled={feedback !== null}
                onClick={() => onChange(answer(session, id))}
              >
                {WINE_BY_ID[id].name}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className={feedback.correct ? "feedback feedback-ok" : "feedback feedback-bad"}>
            <p>
              {feedback.correct
                ? feedback.isRetry
                  ? "加练答对，练习继续。首次成绩已锁定，本题不再计分。"
                  : `回答正确，+${feedback.scoreDelta} 分（${
                      feedback.peeked ? "看线索作答" : "直接作答"
                    }）。`
                : feedback.isRetry
                  ? `加练仍未答对，正确答案是「${wine.name}」。本题已重新排入队尾。`
                  : `回答错误，正确答案是「${wine.name}」。本题首次成绩记 0 分，已排到队尾，稍后加练。`}
            </p>
            <button className="primary-action" onClick={() => onChange(acknowledge(session))}>
              {isLastQuestion ? "查看成绩" : "继续"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function ratingText(total: number): string {
  if (total >= 450) return "表现出色，离满分只差一步！";
  if (total >= 300) return "掌握得不错，把下面的错题酒款再巩固一下。";
  if (total > 0) return "继续加油，先复习下面的错题酒款再开新局。";
  return "别灰心，回到卡片库把产区与品种特征重新记一遍。";
}

function SummaryView({
  session,
  onRestart,
  onExit,
}: {
  session: Session;
  onRestart: () => void;
  onExit: () => void;
}) {
  const total = totalScore(session);
  const wrongs = wrongWineIds(session).map((id) => WINE_BY_ID[id]);

  return (
    <>
      <section className="panel">
        <p className="eyebrow">本局结束</p>
        <div className="summary-score">
          <strong>{total}</strong>
          <span>/ {MAX_SCORE} 分</span>
        </div>
        <p className="summary-note">{ratingText(total)}</p>

        <div className="result-list">
          {session.results.map((r, i) => {
            const wine = WINE_BY_ID[r.wineId];
            return (
              <div key={r.wineId} className="result-row">
                <span className="result-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="result-name">{wine.name}</span>
                <span className={r.score > 0 ? "result-score-ok" : "result-score-bad"}>
                  {r.score > 0 ? `+${r.score}` : "0 分"}
                </span>
                <span className="result-tag">
                  {r.score === 0 ? "答错 · 已加练" : r.peeked ? "看线索答对" : "直接答对"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="summary-actions">
          <button className="primary-action" onClick={onRestart}>
            再来一局
          </button>
          <button onClick={onExit}>返回卡片库</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>复习清单</p>
            <h2>错题酒款（{wrongs.length}）</h2>
          </div>
        </div>
        {wrongs.length === 0 ? (
          <p className="empty-note">本局没有错题，全部拿下！可以开始新一局挑战满分。</p>
        ) : (
          <div className="library-grid">
            {wrongs.map((wine) => (
              <WineCard key={wine.id} wine={wine} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  // 每次状态变化立即存档，学员中途离开后可以从当时的题和分数接着答
  useEffect(() => {
    saveSession(session);
  }, [session]);

  return (
    <main className="app-shell">
      <Hero session={session} />
      {!session && <IdleView onStart={() => setSession(createSession())} />}
      {session?.status === "playing" && (
        <GameView session={session} onChange={setSession} onQuit={() => setSession(null)} />
      )}
      {session?.status === "finished" && (
        <SummaryView
          session={session}
          onRestart={() => setSession(createSession())}
          onExit={() => setSession(null)}
        />
      )}
    </main>
  );
}

export default App;
