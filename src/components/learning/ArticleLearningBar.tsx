import { useEffect, useRef, useState } from 'react';
import { type ReadingSession, startReadingSession } from '@/lib/learning/reading-session';
import { formatLearningDuration } from '@/lib/learning/stats';
import type { ArticleProgress } from '@/lib/learning/types';
import './learning.css';

interface Props {
  articleSlug: string;
  title: string;
  category: string;
}

export default function ArticleLearningBar({ articleSlug, title, category }: Props) {
  const [record, setRecord] = useState<ArticleProgress>();
  const [error, setError] = useState('');
  const sessionRef = useRef<ReadingSession | undefined>(undefined);

  useEffect(() => {
    let disposed = false;
    startReadingSession({ articleSlug, title, category }, (next) => {
      if (!disposed) setRecord(next);
    }).then(
      (session) => {
        if (disposed) void session.stop();
        else sessionRef.current = session;
      },
      () => {
        if (!disposed) setError('本地学习记录暂时不可用');
      },
    );
    return () => {
      disposed = true;
      const session = sessionRef.current;
      sessionRef.current = undefined;
      if (session) void session.stop();
    };
  }, [articleSlug, category, title]);

  if (error) return <p className="learning-inline-error">{error}</p>;
  if (!record)
    return <div className="learning-bar is-loading" role="status" aria-label="正在读取学习记录" />;

  const canResume = record.lastProgress > 5 && record.lastProgress < 95;
  return (
    <div className="article-learning-wrap">
      {canResume && (
        <div className="continue-reading" role="status">
          <span>上次阅读到 {Math.round(record.lastProgress)}%</span>
          <button type="button" onClick={() => sessionRef.current?.resume()}>
            继续阅读
          </button>
        </div>
      )}
      <section className="learning-bar" aria-label="文章学习状态">
        <span>已学习 {formatLearningDuration(record.readSeconds)}</span>
        <span>阅读进度 {Math.round(record.lastProgress)}%</span>
        <span>{record.annotationCount} 条批注</span>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('lfw:speech:open', { detail: { mode: 'article', articleSlug } }),
            )
          }
        >
          听文章
        </button>
        <button
          type="button"
          disabled={Boolean(record.completedAt)}
          onClick={() => void sessionRef.current?.markCompleted()}
        >
          {record.completedAt ? '已读完' : '标记已读'}
        </button>
        <a href="/learning">学习记录</a>
      </section>
    </div>
  );
}
