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
  const [focusMode, setFocusMode] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState('');
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

  useEffect(() => {
    document.documentElement.classList.toggle('focus-reading', focusMode);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.documentElement.classList.remove('focus-reading');
      window.removeEventListener('keydown', handleKey);
    };
  }, [focusMode]);

  if (error) return <p className="learning-inline-error">{error}</p>;
  if (!record)
    return <div className="learning-bar is-loading" role="status" aria-label="正在读取学习记录" />;

  const canResume = record.lastProgress > 5 && record.lastProgress < 95;
  const handleMarkCompleted = async () => {
    const session = sessionRef.current;
    if (!session || isCompleting || record.completedAt) return;
    setIsCompleting(true);
    setCompletionError('');
    try {
      await session.markCompleted();
    } catch {
      setCompletionError('完成状态保存失败，请重试。');
    } finally {
      setIsCompleting(false);
    }
  };

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
          aria-pressed={focusMode}
          onClick={() => setFocusMode((value) => !value)}
        >
          {focusMode ? '退出专注' : '专注阅读'}
        </button>
        <button
          type="button"
          aria-label={isCompleting ? '正在保存完成状态' : undefined}
          disabled={isCompleting || Boolean(record.completedAt)}
          onClick={() => void handleMarkCompleted()}
        >
          {record.completedAt ? '已读完' : isCompleting ? '保存中…' : '标记已读'}
        </button>
        <a href="/learning">学习记录</a>
      </section>
      {completionError && (
        <p className="learning-inline-error" role="alert">
          {completionError}
        </p>
      )}
    </div>
  );
}
