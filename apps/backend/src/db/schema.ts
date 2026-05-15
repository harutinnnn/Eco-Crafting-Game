import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  uniqueIndex,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const itemCategory = pgEnum("item_category", [
  "seed",
  "crop",
  "food",
  "animal",
  "animal_product",
  "material",
  "tool",
  "clothing"
]);

export const buildingType = pgEnum("building_type", [
  "bakery",
  "restaurant",
  "factory",
  "barn",
  "field"
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  googleId: text("google_id").notNull().unique(),
  avatarUrl: text("avatar_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").references(() => users.id).primaryKey(),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  energy: integer("energy").default(50).notNull(),
  maxEnergy: integer("max_energy").default(50).notNull(),
  coins: integer("coins").default(250).notNull(),
  gems: integer("gems").default(10).notNull()
});

export const items = pgTable("items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: itemCategory("category").notNull(),
  minLevel: integer("min_level").default(1).notNull(),
  tradable: boolean("tradable").default(true).notNull(),
  sellable: boolean("sellable").default(true).notNull(),
  energyRestore: integer("energy_restore"),
  iconUrl: text("icon_url")
});

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    itemId: text("item_id").references(() => items.id).notNull(),
    quantity: integer("quantity").notNull()
  },
  (table) => [uniqueIndex("inventory_user_item_unique").on(table.userId, table.itemId)]
);

export const fields = pgTable("fields", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  cropItemId: text("crop_item_id").references(() => items.id),
  seedItemId: text("seed_item_id").references(() => items.id),
  plantedAt: timestamp("planted_at"),
  readyAt: timestamp("ready_at")
});

export const buildings = pgTable("buildings", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: buildingType("type").notNull(),
  minLevel: integer("min_level").default(1).notNull(),
  coinCost: integer("coin_cost").default(0).notNull(),
  gemCost: integer("gem_cost").default(0).notNull(),
  iconUrl: text("icon_url")
});

export const userBuildings = pgTable(
  "user_buildings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    buildingId: text("building_id").references(() => buildings.id).notNull()
  },
  (table) => [uniqueIndex("user_buildings_user_building_unique").on(table.userId, table.buildingId)]
);

export const recipes = pgTable("recipes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  buildingType: buildingType("building_type").notNull(),
  minLevel: integer("min_level").default(1).notNull(),
  energyCost: integer("energy_cost").default(1).notNull(),
  xpReward: integer("xp_reward").default(1).notNull(),
  ingredients: jsonb("ingredients").notNull(),
  outputs: jsonb("outputs").notNull(),
  createdByAdmin: boolean("created_by_admin").default(true).notNull()
});

export const animals = pgTable("animals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  productItemId: text("product_item_id").references(() => items.id).notNull(),
  minLevel: integer("min_level").default(1).notNull(),
  energyCost: integer("energy_cost").default(2).notNull(),
  xpReward: integer("xp_reward").default(2).notNull(),
  iconUrl: text("icon_url")
});

export const userAnimals = pgTable(
  "user_animals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    animalId: text("animal_id").references(() => animals.id).notNull(),
    quantity: integer("quantity").default(1).notNull()
  },
  (table) => [uniqueIndex("user_animals_user_animal_unique").on(table.userId, table.animalId)]
);

export const shopItems = pgTable("shop_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: text("item_id").references(() => items.id),
  buildingId: text("building_id").references(() => buildings.id),
  animalId: text("animal_id").references(() => animals.id),
  coinPrice: integer("coin_price").default(0).notNull(),
  gemPrice: integer("gem_price").default(0).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  minLevel: integer("min_level").default(1).notNull()
});

export const marketplaceListings = pgTable("marketplace_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(),
  itemId: text("item_id").references(() => items.id).notNull(),
  quantity: integer("quantity").notNull(),
  coinPrice: integer("coin_price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
