import { useEffect, useState } from 'react';
import { getLearningDatabase } from '@/lib/learning/db';
import { formatLearningDuration } from '@/lib/learning/stats';
import type { ArticleProgress } from '@/lib/learning/types';
import learningStyles from './learning.css?inline';

export default function ContinueLearning() {
  const [records, setRecords] = useState<ArticleProgress[]>([]);
  useEffect(() => {
    getLearningDatabase()
      .getAll('articleProgress')
      .then((items) => {
        const nextRecords = items
          .filter((item) => item.lastProgress > 0 && item.lastProgress < 100)
          .sort((left, right) => right.lastReadAt.localeCompare(left.lastReadAt))
          .slice(0, 3);
        if (nextRecords.length === 0) return;
        const styleId = 'lfw-learning-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = learningStyles;
          document.head.append(style);
        }
        setRecords(nextRecords);
      })
      .catch(() => undefined);
  }, []);

  if (records.length === 0) return null;
  return (
    <section
      className="continue-learning-home section container-wide"
      aria-labelledby="continue-learning-title"
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">CONTINUE LEARNING</p>
          <h2 id="continue-learning-title">继续学习</h2>
        </div>
        <a className="section-link" href="/learning">
          查看学习面板 →
        </a>
      </div>
      <div className="continue-learning-grid">
        {records.map((record) => (
          <a href={`/blog/${record.articleSlug}`} key={record.articleSlug}>
            <span>{record.category}</span>
            <strong>{record.title}</strong>
            <small>
              {Math.round(record.lastProgress)}% · {formatLearningDuration(record.readSeconds)}
            </small>
            <i aria-hidden="true">
              <b style={{ width: `${record.lastProgress}%` }} />
            </i>
          </a>
        ))}
      </div>
    </section>
  );
}
