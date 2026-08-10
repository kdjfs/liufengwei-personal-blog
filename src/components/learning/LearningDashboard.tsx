import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { getLearningDatabase } from '@/lib/learning/db';
import {
  createEmptyLearningSummary,
  formatLearningDuration,
  type LearningSummary,
  summarizeLearning,
} from '@/lib/learning/stats';
import { LearningDataControls } from './LearningDataControls';
import './learning.css';

function shortDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(
    new Date(value),
  );
}

interface Props {
  initialSummary?: LearningSummary;
  cloudApiOrigin?: string;
}

export default function LearningDashboard({
  initialSummary = createEmptyLearningSummary(),
  cloudApiOrigin,
}: Props) {
  const [summary, setSummary] = useState<LearningSummary>(initialSummary);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const database = getLearningDatabase();
      const [records, annotations] = await Promise.all([
        database.getAll('articleProgress'),
        database.getAll('annotations'),
      ]);
      setSummary(summarizeLearning(records, annotations.length));
      setError('');
    } catch {
      setError('无法读取当前浏览器中的学习数据。');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const CloudPanel = useMemo(
    () => (cloudApiOrigin ? lazy(() => import('../cloud/CloudLearningPanel')) : undefined),
    [cloudApiOrigin],
  );

  if (error)
    return (
      <p className="learning-empty" role="alert">
        {error}
      </p>
    );
  const maxDay = Math.max(
    1,
    ...summary.last7Days.map((day) => day.readSeconds + day.listenSeconds),
  );
  return (
    <div className="learning-dashboard">
      {CloudPanel && cloudApiOrigin && (
        <Suspense
          fallback={
            <section className="learning-cloud-panel" aria-busy="true">
              <p className="learning-cloud-note">正在加载云端控制…</p>
            </section>
          }
        >
          <CloudPanel apiOrigin={cloudApiOrigin} />
        </Suspense>
      )}
      <section className="learning-metrics" aria-label="学习数据概览">
        {[
          ['今日学习', formatLearningDuration(summary.todaySeconds)],
          ['累计阅读', formatLearningDuration(summary.totalReadSeconds)],
          ['累计听读', formatLearningDuration(summary.totalListenSeconds)],
          ['阅读文章', `${summary.articleCount} 篇`],
          ['完成文章', `${summary.completedCount} 篇`],
          ['本地批注', `${summary.annotationCount} 条`],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="learning-panel" aria-labelledby="week-title">
        <div className="learning-panel-head">
          <div>
            <p className="eyebrow">LAST 7 DAYS</p>
            <h2 id="week-title">最近七天</h2>
          </div>
          <span>阅读 + 听读</span>
        </div>
        <div className="learning-week-chart">
          {summary.last7Days.map((day) => {
            const seconds = day.readSeconds + day.listenSeconds;
            return (
              <div key={day.date}>
                <span className="learning-bar-value">{formatLearningDuration(seconds)}</span>
                <i
                  style={
                    {
                      '--learning-height': `${Math.max(4, (seconds / maxDay) * 100)}%`,
                    } as React.CSSProperties
                  }
                />
                <time dateTime={day.date}>{day.date.slice(5)}</time>
              </div>
            );
          })}
        </div>
      </section>

      <div className="learning-columns">
        <section className="learning-panel" aria-labelledby="recent-title">
          <div className="learning-panel-head">
            <div>
              <p className="eyebrow">MEMORY</p>
              <h2 id="recent-title">最近学习</h2>
            </div>
          </div>
          {summary.recent.length === 0 ? (
            <p className="learning-empty">打开任意文章开始建立学习记忆。</p>
          ) : (
            <ol className="learning-recent-list">
              {summary.recent.map((record) => (
                <li key={record.articleSlug}>
                  <a href={`/blog/${record.articleSlug}`}>
                    <span>{record.category}</span>
                    <strong>{record.title}</strong>
                    <small>
                      {Math.round(record.lastProgress)}% ·{' '}
                      {formatLearningDuration(record.readSeconds)} · {shortDate(record.lastReadAt)}
                    </small>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="learning-panel" aria-labelledby="category-learning-title">
          <div className="learning-panel-head">
            <div>
              <p className="eyebrow">BY CATEGORY</p>
              <h2 id="category-learning-title">分类学习时间</h2>
            </div>
          </div>
          {summary.byCategory.length === 0 ? (
            <p className="learning-empty">暂无分类学习数据。</p>
          ) : (
            <ol className="learning-category-list">
              {summary.byCategory.map((item) => (
                <li key={item.category}>
                  <span>{item.category}</span>
                  <strong>{formatLearningDuration(item.seconds)}</strong>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <LearningDataControls onDataChange={() => void load()} />
    </div>
  );
}
