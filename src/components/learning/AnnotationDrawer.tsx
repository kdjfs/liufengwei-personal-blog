import { useState } from 'react';
import type { Annotation } from '@/lib/learning/types';

interface Props {
  open: boolean;
  annotations: Annotation[];
  onClose: () => void;
  onJump: (annotation: Annotation) => void;
  onUpdate: (annotation: Annotation, note: string) => void;
  onDelete: (annotation: Annotation) => void;
  onAskAI: (annotation: Annotation) => void;
}

export function AnnotationDrawer({
  open,
  annotations,
  onClose,
  onJump,
  onUpdate,
  onDelete,
  onAskAI,
}: Props) {
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState('');
  if (!open) return null;

  return (
    <aside className="annotation-drawer" aria-label="文章批注">
      <header>
        <div>
          <span>ANNOTATIONS</span>
          <h2>{annotations.length} 条批注</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭批注面板">
          ×
        </button>
      </header>
      {annotations.length === 0 ? (
        <p className="annotation-empty">选中正文文字，然后点击“批注”。数据只保存在当前浏览器。</p>
      ) : (
        <ol>
          {annotations.map((annotation) => (
            <li key={annotation.id}>
              <button type="button" className="annotation-quote" onClick={() => onJump(annotation)}>
                “{annotation.selectedText.slice(0, 120)}
                {annotation.selectedText.length > 120 ? '…' : ''}”
              </button>
              {editingId === annotation.id ? (
                <textarea
                  value={draft}
                  rows={3}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                />
              ) : (
                <p>{annotation.note}</p>
              )}
              <div>
                {editingId === annotation.id ? (
                  <>
                    <button type="button" onClick={() => setEditingId(undefined)}>
                      取消
                    </button>
                    <button
                      type="button"
                      disabled={!draft.trim()}
                      onClick={() => {
                        onUpdate(annotation, draft.trim());
                        setEditingId(undefined);
                      }}
                    >
                      保存
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => onAskAI(annotation)}>
                      问 AI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(annotation.id);
                        setDraft(annotation.note);
                      }}
                    >
                      编辑
                    </button>
                    <button type="button" onClick={() => onDelete(annotation)}>
                      删除
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
