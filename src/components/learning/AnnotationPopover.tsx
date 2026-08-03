import { useEffect, useRef, useState } from 'react';
import type { AnnotationDraftRequest } from '@/lib/learning/annotation-dom';

interface Props {
  request: AnnotationDraftRequest;
  onSave: (note: string) => void;
  onCancel: () => void;
}

export function AnnotationPopover({ request, onSave, onCancel }: Props) {
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  const left = Math.max(8, Math.min(request.rect.left, window.innerWidth - 328));
  const top = Math.max(8, Math.min(request.rect.bottom + 10, window.innerHeight - 250));

  return (
    <aside className="annotation-popover" style={{ left, top }} aria-label="新建批注">
      <p>
        “{request.text.slice(0, 120)}
        {request.text.length > 120 ? '…' : ''}”
      </p>
      <label htmlFor="lfw-annotation-note">我的理解</label>
      <textarea
        ref={inputRef}
        id="lfw-annotation-note"
        rows={3}
        maxLength={10_000}
        value={note}
        placeholder="我对这一段的理解……"
        onChange={(event) => setNote(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      />
      <div>
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button type="button" disabled={!note.trim()} onClick={() => onSave(note.trim())}>
          保存批注
        </button>
      </div>
    </aside>
  );
}
