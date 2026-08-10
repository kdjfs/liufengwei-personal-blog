import { useCallback, useEffect, useState } from 'react';
import { queueAnnotationMutation } from '@/lib/cloud/operations';
import {
  type AnnotationDraftRequest,
  renderAnnotationHighlights,
  scrollToAnnotation,
} from '@/lib/learning/annotation-dom';
import { getLearningDatabase } from '@/lib/learning/db';
import type { Annotation } from '@/lib/learning/types';
import { AnnotationDrawer } from './AnnotationDrawer';
import { AnnotationPopover } from './AnnotationPopover';

interface Props {
  articleSlug: string;
  articleTitle: string;
}

function makeId(): string {
  return globalThis.crypto.randomUUID();
}

export default function AnnotationManager({ articleSlug, articleTitle }: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState<AnnotationDraftRequest>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const reload = useCallback(async () => {
    const all = await getLearningDatabase().getAll('annotations');
    const current = all
      .filter((annotation) => annotation.articleSlug === articleSlug && !annotation.deletedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setAnnotations(current);
    window.dispatchEvent(
      new CustomEvent('lfw:annotations:changed', {
        detail: { articleSlug, count: current.length },
      }),
    );
  }, [articleSlug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleCreate = (event: Event) => {
      const request = (event as CustomEvent<AnnotationDraftRequest>).detail;
      if (!request?.exact || request.articleSlug !== articleSlug) return;
      setDraft(request);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setDraft(undefined);
      setDrawerOpen(false);
    };
    const handleOpen = () => setDrawerOpen(true);
    window.addEventListener('lfw:annotation:create', handleCreate);
    window.addEventListener('lfw:annotations:open', handleOpen);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('lfw:annotation:create', handleCreate);
      window.removeEventListener('lfw:annotations:open', handleOpen);
      window.removeEventListener('keydown', handleKey);
    };
  }, [articleSlug]);

  useEffect(() => {
    const prose = document.querySelector<HTMLElement>('[data-ai-article] .prose');
    if (!prose) return;
    renderAnnotationHighlights(prose, annotations);
  }, [annotations]);

  const save = async (note: string) => {
    if (!draft) return;
    const now = new Date().toISOString();
    const database = getLearningDatabase();
    const annotation: Annotation = {
      id: makeId(),
      articleSlug,
      articleTitle,
      selectedText: draft.text,
      note,
      headingId: draft.headingId,
      headingText: draft.headingText,
      prefix: draft.prefix,
      exact: draft.exact,
      suffix: draft.suffix,
      createdAt: now,
      updatedAt: now,
    };
    await queueAnnotationMutation(
      database,
      annotation,
      await database.getOrCreateDeviceId(),
      'upsert',
    );
    setDraft(undefined);
    setDrawerOpen(true);
    await reload();
  };

  const update = async (annotation: Annotation, note: string) => {
    const database = getLearningDatabase();
    const updated = {
      ...annotation,
      note,
      updatedAt: new Date().toISOString(),
    };
    await queueAnnotationMutation(
      database,
      updated,
      await database.getOrCreateDeviceId(),
      'upsert',
    );
    await reload();
  };

  const remove = async (annotation: Annotation) => {
    if (!window.confirm('删除这条批注？此操作无法撤销。')) return;
    const database = getLearningDatabase();
    const deletedAt = new Date().toISOString();
    await queueAnnotationMutation(
      database,
      { ...annotation, updatedAt: deletedAt, deletedAt },
      await database.getOrCreateDeviceId(),
      'delete',
    );
    await reload();
  };

  const jump = (annotation: Annotation) => {
    const prose = document.querySelector<HTMLElement>('[data-ai-article] .prose');
    if (prose) scrollToAnnotation(prose, annotation);
  };

  const askAI = (annotation: Annotation) => {
    window.dispatchEvent(
      new CustomEvent('lfw:ai:ask-selection', {
        detail: {
          text: annotation.selectedText,
          headingId: annotation.headingId,
          headingText: annotation.headingText,
          articleSlug: annotation.articleSlug,
          annotationNote: annotation.note,
        },
      }),
    );
  };

  return (
    <>
      <button
        type="button"
        className="annotation-drawer-trigger"
        onClick={() => setDrawerOpen(true)}
        aria-label={`打开批注面板，共 ${annotations.length} 条`}
      >
        <span aria-hidden="true">✎</span>
        批注 {annotations.length}
      </button>
      {draft && (
        <AnnotationPopover request={draft} onSave={save} onCancel={() => setDraft(undefined)} />
      )}
      <AnnotationDrawer
        open={drawerOpen}
        annotations={annotations}
        onClose={() => setDrawerOpen(false)}
        onJump={jump}
        onUpdate={update}
        onDelete={remove}
        onAskAI={askAI}
      />
    </>
  );
}
