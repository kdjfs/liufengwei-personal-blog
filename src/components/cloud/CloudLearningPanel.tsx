import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudAccountClient, type CloudSession } from '@/lib/cloud/account-client';
import { requestCloudSync } from '@/lib/cloud/runtime';
import type { SyncStatus } from '@/lib/cloud/sync';
import { getLearningDatabase } from '@/lib/learning/db';

interface Props {
  apiOrigin: string;
}

const statusLabel: Record<SyncStatus, string> = {
  local: '本地',
  syncing: '同步中',
  synced: '已同步',
  offline: '云端离线',
  error: '需要处理',
};

function formatLastSync(value?: string): string {
  if (!value) return '尚未完成云同步';
  return `上次同步 ${new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))}`;
}

export default function CloudLearningPanel({ apiOrigin }: Props) {
  const client = useMemo(() => new CloudAccountClient(apiOrigin), [apiOrigin]);
  const [session, setSession] = useState<CloudSession | null>(null);
  const [accountState, setAccountState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [lastSync, setLastSync] = useState<string>();
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState('');

  const refreshLocalSyncState = useCallback(async () => {
    const database = getLearningDatabase();
    const [meta, queue] = await Promise.all([
      database.get('syncMeta', 'last-sync'),
      database.getAll('syncQueue'),
    ]);
    setLastSync(typeof meta?.value === 'string' ? meta.value : undefined);
    setPending(queue.length);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([client.getSession(), refreshLocalSyncState()]).then(
      ([nextSession]) => {
        if (!active) return;
        setSession(nextSession);
        setAccountState('ready');
      },
      () => {
        if (!active) return;
        setAccountState('error');
      },
    );
    const handleSyncState = (event: Event) => {
      const status = (event as CustomEvent<{ status?: SyncStatus }>).detail?.status;
      if (!status) return;
      setSyncStatus(status);
      if (status === 'synced' || status === 'local') void refreshLocalSyncState();
    };
    window.addEventListener('lfw:cloud:sync-state', handleSyncState);
    return () => {
      active = false;
      window.removeEventListener('lfw:cloud:sync-state', handleSyncState);
    };
  }, [client, refreshLocalSyncState]);

  const signIn = async () => {
    setMessage('正在前往 GitHub…');
    try {
      const target = await client.beginGithubSignIn(window.location.href);
      window.location.assign(target);
    } catch {
      setMessage('暂时无法发起 GitHub 登录，请稍后重试。');
    }
  };

  const signOut = async () => {
    setMessage('正在退出云端账号…');
    try {
      await client.signOut();
      setSession(null);
      setSyncStatus('local');
      setMessage('已退出；当前浏览器中的本地学习数据仍然保留。');
    } catch {
      setMessage('退出失败，请检查云端连接后重试。');
    }
  };

  const syncNow = () => {
    setSyncStatus('syncing');
    requestCloudSync(getLearningDatabase());
  };

  return (
    <section className="learning-cloud-panel" aria-labelledby="learning-cloud-title">
      <div className="learning-cloud-heading">
        <div>
          <p className="eyebrow">OPTIONAL CLOUD · LOCAL FIRST</p>
          <h2 id="learning-cloud-title">跨设备学习云</h2>
        </div>
        <span className={`learning-sync-state is-${syncStatus}`} role="status" aria-live="polite">
          <i aria-hidden="true" />
          {statusLabel[syncStatus]}
        </span>
      </div>

      {accountState === 'loading' ? (
        <p className="learning-cloud-note" aria-busy="true">
          正在确认云端会话…
        </p>
      ) : accountState === 'error' ? (
        <div className="learning-cloud-account" role="alert">
          <div>
            <strong>云端暂时不可用</strong>
            <p>本地学习、批注和备份不受影响。</p>
          </div>
          <button type="button" onClick={() => window.location.reload()}>
            重试
          </button>
        </div>
      ) : session ? (
        <div className="learning-cloud-account">
          <div>
            <strong>{session.user.name}</strong>
            <p>
              {formatLastSync(lastSync)} · {pending} 项待同步
            </p>
          </div>
          <div className="learning-cloud-actions">
            <button type="button" disabled={syncStatus === 'syncing'} onClick={syncNow}>
              {syncStatus === 'syncing' ? '同步中…' : '立即同步'}
            </button>
            <button type="button" onClick={() => void signOut()}>
              退出
            </button>
          </div>
        </div>
      ) : (
        <div className="learning-cloud-account">
          <div>
            <strong>当前仅保存在本机</strong>
            <p>登录后才会同步；不会上传文章正文，退出也不会清除本地记录。</p>
          </div>
          <button type="button" onClick={() => void signIn()}>
            使用 GitHub 登录
          </button>
        </div>
      )}

      {message && (
        <p className="learning-cloud-message" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}
