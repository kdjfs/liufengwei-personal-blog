import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  customType,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

const binaryVarchar = customType<{ data: string; config: { length: number } }>({
  dataType(config) {
    if (!config) throw new Error('binary varchar length is required');
    return `varchar(${config.length}) character set utf8mb4 collate utf8mb4_bin`;
  },
});

const id = (name: string) => binaryVarchar(name, { length: 64 });
const slug = (name: string) => binaryVarchar(name, { length: 255 });
const instant = (name: string) => datetime(name, { mode: 'date', fsp: 3 });
const createdAt = () => {
  const column = instant('created_at').notNull();
  return column.default(sql`CURRENT_TIMESTAMP(3)`);
};
const updatedAt = () =>
  instant('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date());

export const users = mysqlTable(
  'users',
  {
    id: id('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex('users_email_uq').on(table.email)],
);

export const sessions = mysqlTable(
  'sessions',
  {
    id: id('id').primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: binaryVarchar('token', { length: 255 }).notNull(),
    expiresAt: instant('expires_at').notNull(),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('sessions_token_uq').on(table.token),
    index('sessions_user_idx').on(table.userId),
  ],
);

export const oauthAccounts = mysqlTable(
  'oauth_accounts',
  {
    id: id('id').primaryKey(),
    accountId: binaryVarchar('account_id', { length: 255 }).notNull(),
    providerId: binaryVarchar('provider_id', { length: 64 }).notNull(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: instant('access_token_expires_at'),
    refreshTokenExpiresAt: instant('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('oauth_accounts_provider_account_uq').on(table.providerId, table.accountId),
    index('oauth_accounts_user_idx').on(table.userId),
  ],
);

export const verifications = mysqlTable(
  'verifications',
  {
    id: id('id').primaryKey(),
    identifier: varchar('identifier', { length: 255 }).notNull(),
    value: text('value').notNull(),
    expiresAt: instant('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

export const learningProgressDevices = mysqlTable(
  'learning_progress_devices',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    articleSlug: slug('article_slug').notNull(),
    deviceId: binaryVarchar('device_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 128 }).notNull(),
    readSeconds: int('read_seconds', { unsigned: true }).notNull().default(0),
    listenSeconds: int('listen_seconds', { unsigned: true }).notNull().default(0),
    maxProgress: decimal('max_progress', { precision: 5, scale: 2, mode: 'number' })
      .notNull()
      .default(0),
    resumeHeadingId: varchar('resume_heading_id', { length: 255 }),
    resumeProgress: decimal('resume_progress', { precision: 5, scale: 2, mode: 'number' }),
    resumeScrollY: int('resume_scroll_y', { unsigned: true }),
    firstReadAt: instant('first_read_at').notNull(),
    lastActivityAt: instant('last_activity_at').notNull(),
    completedAt: instant('completed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('learning_progress_user_article_device_uq').on(
      table.userId,
      table.articleSlug,
      table.deviceId,
    ),
    index('learning_progress_user_article_idx').on(table.userId, table.articleSlug),
    check('learning_progress_max_progress_ck', sql`${table.maxProgress} between 0 and 100`),
    check(
      'learning_progress_resume_progress_ck',
      sql`${table.resumeProgress} is null or ${table.resumeProgress} between 0 and 100`,
    ),
  ],
);

export const annotations = mysqlTable(
  'annotations',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    annotationId: id('annotation_id').notNull(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    articleSlug: slug('article_slug').notNull(),
    articleTitle: varchar('article_title', { length: 255 }).notNull(),
    selectedText: text('selected_text').notNull(),
    headingId: varchar('heading_id', { length: 255 }),
    headingText: text('heading_text'),
    quoteExact: text('quote_exact').notNull(),
    quotePrefix: text('quote_prefix').notNull(),
    quoteSuffix: text('quote_suffix').notNull(),
    note: text('note').notNull(),
    color: varchar('color', { length: 32 }).notNull(),
    version: bigint('version', { mode: 'number', unsigned: true }).notNull().default(1),
    sourceCreatedAt: instant('source_created_at').notNull(),
    sourceUpdatedAt: instant('source_updated_at').notNull(),
    deletedAt: instant('deleted_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('annotations_user_annotation_uq').on(table.userId, table.annotationId),
    index('annotations_user_article_updated_idx').on(
      table.userId,
      table.articleSlug,
      table.updatedAt,
    ),
  ],
);

export const favorites = mysqlTable(
  'favorites',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    articleSlug: slug('article_slug').notNull(),
    version: bigint('version', { mode: 'number', unsigned: true }).notNull().default(1),
    sourceUpdatedAt: instant('source_updated_at').notNull(),
    deletedAt: instant('deleted_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex('favorites_user_article_uq').on(table.userId, table.articleSlug)],
);

export const syncOperations = mysqlTable(
  'sync_operations',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    operationId: id('operation_id').notNull(),
    deviceId: binaryVarchar('device_id', { length: 36 }).notNull(),
    entityType: mysqlEnum('entity_type', ['progress', 'annotation', 'favorite']).notNull(),
    entityId: binaryVarchar('entity_id', { length: 255 }).notNull(),
    operation: mysqlEnum('operation', ['upsert', 'delete']).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('sync_operations_user_operation_uq').on(table.userId, table.operationId),
    index('sync_operations_created_idx').on(table.createdAt),
  ],
);

export const userPreferences = mysqlTable(
  'user_preferences',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    preferenceKey: varchar('preference_key', { length: 128 }).notNull(),
    preferenceValue: json('preference_value').$type<unknown>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex('user_preferences_user_key_uq').on(table.userId, table.preferenceKey)],
);

export const aiConversations = mysqlTable(
  'ai_conversations',
  {
    id: id('id').primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    privateLearningContext: boolean('private_learning_context').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('ai_conversations_user_updated_idx').on(table.userId, table.updatedAt)],
);

export const aiMessages = mysqlTable(
  'ai_messages',
  {
    id: id('id').primaryKey(),
    conversationId: id('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: mysqlEnum('role', ['user', 'assistant']).notNull(),
    content: text('content').notNull(),
    mode: mysqlEnum('mode', ['fast', 'deep']).notNull(),
    sourceMetadata: json('source_metadata').$type<unknown>(),
    createdAt: createdAt(),
  },
  (table) => [
    index('ai_messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  ],
);

export const authSchema = {
  user: users,
  session: sessions,
  account: oauthAccounts,
  verification: verifications,
};

export const productSchema = {
  learningProgressDevices,
  annotations,
  favorites,
  syncOperations,
  userPreferences,
  aiConversations,
  aiMessages,
};
