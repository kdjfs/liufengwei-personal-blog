import { useRef, useState } from 'react';
import {
  createLearningBackup,
  parseLearningBackup,
  restoreLearningBackup,
} from '@/lib/learning/backup';
import { getLearningDatabase } from '@/lib/learning/db';
import type { LearningBackup } from '@/lib/learning/types';

interface Props {
  onDataChange: () => void;
}

type ResetScope = 'annotations' | 'articleProgress' | 'all';

function downloadJson(backup: LearningBackup): void {
  const date = backup.exportedAt.slice(0, 10);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lfw-learning-backup-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LearningDataControls({ onDataChange }: Props) {
  const [message, setMessage] = useState('');
  const [includeAudio, setIncludeAudio] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<LearningBackup>();
  const [resetScope, setResetScope] = useState<ResetScope>('annotations');
  const inputRef = useRef<HTMLInputElement>(null);

  const exportData = async () => {
    downloadJson(await createLearningBackup(getLearningDatabase(), includeAudio));
    setMessage('学习数据已导出。请把 JSON 文件保存到安全位置。');
  };

  const previewImport = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = parseLearningBackup(await file.text());
      setPendingBackup(parsed);
      setMessage(
        `导入预览：${parsed.articleProgress.length} 条阅读记录，${parsed.annotations.length} 条批注，${parsed.settings.length} 项设置。`,
      );
    } catch (error) {
      setPendingBackup(undefined);
      setMessage(error instanceof Error ? error.message : '无法读取备份文件');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pendingBackup) return;
    await restoreLearningBackup(getLearningDatabase(), pendingBackup);
    setPendingBackup(undefined);
    setMessage('备份已合并；冲突记录已保留更新时间较新的版本。');
    onDataChange();
  };

  const requestPersistence = async () => {
    if (!navigator.storage?.persist) {
      setMessage('当前浏览器不支持主动申请持久存储。');
      return;
    }
    const granted = await navigator.storage.persist();
    setMessage(
      granted ? '浏览器已增强本地保存可靠性。' : '浏览器未授予持久存储，仍会使用普通 IndexedDB。',
    );
  };

  const resetData = async () => {
    const labels: Record<ResetScope, string> = {
      annotations: '全部批注',
      articleProgress: '全部阅读记录',
      all: '全部学习数据（含听读稿和设置）',
    };
    if (!window.confirm(`确认永久清除${labels[resetScope]}？此操作无法撤销。`)) return;
    const database = getLearningDatabase();
    if (resetScope === 'all') await database.clearAll();
    else await database.clear(resetScope);
    setMessage(`${labels[resetScope]}已清除。`);
    onDataChange();
  };

  return (
    <section className="learning-data-controls" aria-labelledby="learning-data-title">
      <div>
        <p className="eyebrow">LOCAL FIRST · BACKUP</p>
        <h2 id="learning-data-title">数据与持久化</h2>
        <p>记录仅保存在当前设备和浏览器。清除站点数据或更换设备前，请先导出备份。</p>
      </div>
      <div className="learning-control-grid">
        <div className="learning-control-card">
          <h3>导出 / 导入</h3>
          <label className="learning-check">
            <input
              type="checkbox"
              checked={includeAudio}
              onChange={(event) => setIncludeAudio(event.currentTarget.checked)}
            />
            备份包含 AI 听读稿缓存
          </label>
          <div className="learning-button-row">
            <button type="button" onClick={() => void exportData()}>
              导出学习数据
            </button>
            <button type="button" onClick={() => inputRef.current?.click()}>
              选择备份文件
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="选择学习数据备份 JSON"
              onChange={(event) => void previewImport(event.currentTarget.files?.[0])}
            />
            {pendingBackup && (
              <button type="button" onClick={() => void confirmImport()}>
                确认合并导入
              </button>
            )}
          </div>
        </div>
        <div className="learning-control-card">
          <h3>保存可靠性</h3>
          <p>由浏览器决定是否保护本站数据不被自动回收，不会在页面启动时弹权限。</p>
          <button type="button" onClick={() => void requestPersistence()}>
            增强本地保存可靠性
          </button>
        </div>
        <div className="learning-control-card is-danger">
          <h3>清除数据</h3>
          <label>
            <span>清除范围</span>
            <select
              value={resetScope}
              onChange={(event) => setResetScope(event.currentTarget.value as ResetScope)}
            >
              <option value="annotations">只清批注</option>
              <option value="articleProgress">只清阅读记录</option>
              <option value="all">全部学习数据</option>
            </select>
          </label>
          <button type="button" onClick={() => void resetData()}>
            清除所选数据
          </button>
        </div>
      </div>
      {message && (
        <p className="learning-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
