import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  decimal,
  integer,
  timestamp,
  unique,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  type: text("type"),
  isArchived: boolean("is_archived").default(false),
  notes: text("notes"),
  imageUrl: text("image_url"),
  imageStorageOwnerId: text("image_storage_owner_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  propertyId: uuid("property_id").references(() => properties.id),
  unitId: uuid("unit_id").references(() => units.id),
  date: date("date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type").notNull(),
  payee: text("payee"),
  category: text("category"),
  subcategory: text("subcategory"),
  notes: text("notes"),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentSizeKb: integer("attachment_size_kb"),
  ocrConfidence: decimal("ocr_confidence", { precision: 4, scale: 2 }),
  needsReview: boolean("needs_review").default(false),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  scheduledPermanentDeleteAt: timestamp("scheduled_permanent_delete_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * @deprecated Use propertyMemberships and propertyInvitations instead.
 * This table is kept for backwards compatibility during migration.
 * Will be removed after all data migrated.
 */
export const propertyShares = pgTable("property_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  invitedEmail: text("invited_email").notNull(),
  sharedWithUserId: text("shared_with_user_id"),
  permission: text("permission").notNull(),       // 'view' | 'edit'
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'revoked'
  inviteToken: text("invite_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
}, (t) => [unique("property_shares_property_email_unique").on(t.propertyId, t.invitedEmail)]);

export const transactionAttachments = pgTable("transaction_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  name: text("name"),
  sizeKb: integer("size_kb"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  image: text("image"),
  username: text("username").unique(),
  phone: text("phone"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
});

// Enums for property membership RBAC
export const propertyRoleEnum = pgEnum("property_role", [
  "OWNER",
  "EDITOR",
  "VIEWER",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "ACTIVE",
  "PENDING",
  "REVOKED",
]);

export const propertyMemberships = pgTable(
  "property_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: propertyRoleEnum("role").notNull(),
    canShare: boolean("can_share").default(false),
    status: membershipStatusEnum("status").default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [unique("property_memberships_property_user_unique").on(t.propertyId, t.userId)]
);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "CANCELED",
]);

export const propertyInvitations = pgTable("property_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  invitedEmail: text("invited_email").notNull(),
  invitedByUserId: text("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: propertyRoleEnum("role").notNull(),
  canShare: boolean("can_share").default(false),
  status: invitationStatusEnum("status").notNull().default("PENDING"),
  token: text("token").notNull(),
  tokenUsedByUserId: text("token_used_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Enum for audit log actions
export const auditActionEnum = pgEnum("audit_action", [
  "PROPERTY_CREATED",
  "PROPERTY_UPDATED",
  "PROPERTY_DELETED",
  "TRANSACTION_CREATED",
  "TRANSACTION_UPDATED",
  "TRANSACTION_DELETED",
  "TRANSACTION_RESTORED",
  "MEMBERSHIP_ADDED",
  "MEMBERSHIP_ROLE_CHANGED",
  "MEMBERSHIP_REVOKED",
  "INVITATION_CREATED",
  "INVITATION_ACCEPTED",
  "INVITATION_DECLINED",
  "INVITATION_CANCELED",
  "ATTACHMENT_UPLOADED",
  "ATTACHMENT_DELETED",
]);

export const propertyAuditLogs = pgTable("property_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: auditActionEnum("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  changes: jsonb("changes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const storageOwnerships = pgTable("storage_ownerships", {
  id: uuid("id").primaryKey().defaultRandom(),
  attachmentUrl: text("attachment_url").notNull().unique(),
  propertyId: uuid("property_id").references(() => properties.id, {
    onDelete: "set null",
  }),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  uploadedByUserId: text("uploaded_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sizeBytes: integer("size_bytes").notNull(),
  contentType: text("content_type"),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Enum for soft delete queue status
export const deleteStatusEnum = pgEnum("delete_status", [
  "SOFT_DELETED",
  "SCHEDULED_DELETE",
  "PERMANENTLY_DELETED",
  "DELETE_FAILED",
]);

export const softDeleteQueue = pgTable("soft_delete_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  status: deleteStatusEnum("status").notNull().default("SOFT_DELETED"),
  scheduledPermanentDeleteAt: timestamp("scheduled_permanent_delete_at", {
    withTimezone: true,
  }).notNull(),
  attemptedDeleteAt: timestamp("attempted_delete_at", { withTimezone: true }),
  permanentDeleteAt: timestamp("permanent_delete_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
