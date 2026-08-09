import assert from 'node:assert/strict';
import test from 'node:test';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import {
  aiConversations,
  aiMessages,
  annotations,
  favorites,
  learningProgressDevices,
  oauthAccounts,
  sessions,
  syncOperations,
  userPreferences,
  users,
  verifications,
} from '../src/db/schema.ts';

const tables = [
  users,
  sessions,
  oauthAccounts,
  verifications,
  learningProgressDevices,
  annotations,
  favorites,
  syncOperations,
  userPreferences,
  aiConversations,
  aiMessages,
];

function indexNames(table: (typeof tables)[number]): string[] {
  const config = getTableConfig(table);
  return [
    ...config.indexes.map((index) => index.config.name),
    ...config.uniqueConstraints.map((constraint) => constraint.name),
  ].filter((name): name is string => Boolean(name));
}

test('schema contains auth and dynamic product tables but no Markdown content table', () => {
  const names = tables.map((table) => getTableConfig(table).name).sort();

  assert.deepEqual(names, [
    'ai_conversations',
    'ai_messages',
    'annotations',
    'favorites',
    'learning_progress_devices',
    'oauth_accounts',
    'sessions',
    'sync_operations',
    'user_preferences',
    'users',
    'verifications',
  ]);
  assert.equal(
    names.some((name) => ['articles', 'markdown', 'posts'].includes(name)),
    false,
  );
});

test('schema encodes required idempotency and per-device uniqueness constraints', () => {
  assert.ok(
    indexNames(learningProgressDevices).includes('learning_progress_user_article_device_uq'),
  );
  assert.ok(indexNames(annotations).includes('annotations_user_annotation_uq'));
  assert.ok(indexNames(favorites).includes('favorites_user_article_uq'));
  assert.ok(indexNames(syncOperations).includes('sync_operations_user_operation_uq'));
  assert.ok(indexNames(sessions).includes('sessions_token_uq'));
  assert.ok(indexNames(oauthAccounts).includes('oauth_accounts_provider_account_uq'));
});

test('every user-owned table declares an explicit cascading user foreign key', () => {
  for (const table of [
    sessions,
    oauthAccounts,
    learningProgressDevices,
    annotations,
    favorites,
    syncOperations,
    userPreferences,
    aiConversations,
  ]) {
    const foreignKeys = getTableConfig(table).foreignKeys;
    assert.equal(foreignKeys.length, 1, `${getTableConfig(table).name} user foreign key`);
    assert.equal(foreignKeys[0]?.onDelete, 'cascade');
  }
  assert.equal(getTableConfig(aiMessages).foreignKeys[0]?.onDelete, 'cascade');
});
