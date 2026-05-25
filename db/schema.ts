import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  decimal,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  type: text("type"),
  isArchived: boolean("is_archived").default(false),
  notes: text("notes"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const transactionAttachments = pgTable("transaction_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  name: text("name"),
  sizeKb: integer("size_kb"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
