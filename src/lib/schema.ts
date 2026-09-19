import { pgTable, text, integer, timestamp, uuid, boolean, index } from "drizzle-orm/pg-core";

export const slots = pgTable("slots", {
  id: text("id").primaryKey(),               // e.g. "a1-hood"
  autoId: text("auto_id").notNull(),         // "a1" | "a2" | "site"
  kind: text("kind").notNull(),              // hood | back | tee | page
  name: text("name").notNull(),
  basePriceCents: integer("base_price_cents").notNull(),
  currentPriceCents: integer("current_price_cents").notNull(),
  activePurchaseId: uuid("active_purchase_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  slotId: text("slot_id").notNull(),
  sponsorName: text("sponsor_name").notNull(),
  url: text("url").notNull(),
  logoData: text("logo_data").notNull(),     // data URL, <= 400KB
  email: text("email"),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | superseded | refunded | failed
  paymentId: text("payment_id"),
  refundId: text("refund_id"),
  isMock: boolean("is_mock").default(false).notNull(),
  hidden: boolean("hidden").default(false).notNull(),   // admin kill switch for bad logos
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});

export const visitors = pgTable("visitors", {
  id: text("id").primaryKey(),                 // anonymous client id
  firstSeen: timestamp("first_seen", { withTimezone: true }).defaultNow().notNull(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
  views: integer("views").default(1).notNull(),
});
