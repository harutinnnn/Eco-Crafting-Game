import { eq } from "drizzle-orm";
import { db } from "./client";
import {
  animals,
  buildings,
  fields,
  inventory,
  items as itemsTable,
  marketplaceListings,
  profiles,
  recipes as recipesTable,
  userAnimals,
  userBuildings,
  users
} from "./schema";
import { animalsData, buildingsData, items, recipes, starterInventory } from "../game/data";

const adminGoogleId = "admin-default";
const adminEmail = "admin@eco-crafting.local";

export const seedCatalog = async () => {
  await db
    .insert(itemsTable)
    .values(items.map(({ id: _id, ...item }) => item))
    .onConflictDoNothing();
  await db.insert(buildings).values(buildingsData).onConflictDoNothing();

  const itemRows = await db.select({ id: itemsTable.id, code: itemsTable.code }).from(itemsTable);
  const itemIdByCode = new Map(itemRows.map((item) => [item.code, item.id]));

  await db
    .insert(animals)
    .values(
      animalsData.map(({ productItemCode, ...animal }) => ({
        ...animal,
        productItemId: itemIdByCode.get(productItemCode)!
      }))
    )
    .onConflictDoNothing();

  await db
    .insert(recipesTable)
    .values(
      recipes.map((recipe) => ({
        code: recipe.code,
        name: recipe.name,
        buildingType: recipe.buildingType as "bakery" | "restaurant" | "factory" | "barn" | "field",
        minLevel: recipe.minLevel,
        energyCost: recipe.energyCost,
        xpReward: recipe.xpReward,
        ingredients: recipe.ingredients.map((entry) => ({ itemId: itemIdByCode.get(String(entry.itemId))!, quantity: entry.quantity })),
        outputs: recipe.outputs.map((entry) => ({ itemId: itemIdByCode.get(String(entry.itemId))!, quantity: entry.quantity })),
        createdByAdmin: true
      }))
    )
    .onConflictDoNothing();

  const [admin] = await db
    .insert(users)
    .values({
      username: "Admin",
      email: adminEmail,
      googleId: adminGoogleId,
      avatarUrl: null,
      isAdmin: true
    })
    .onConflictDoUpdate({
      target: users.googleId,
      set: { username: "Admin", email: adminEmail, isAdmin: true }
    })
    .returning();

  await db.insert(profiles).values({ userId: admin.id }).onConflictDoNothing();

  const existingListings = await db.select({ id: marketplaceListings.id }).from(marketplaceListings).limit(1);
  if (existingListings.length === 0) {
    await db.insert(marketplaceListings).values([
      { sellerId: admin.id, itemId: itemIdByCode.get("milk")!, quantity: 2, coinPrice: 40 },
      { sellerId: admin.id, itemId: itemIdByCode.get("wool")!, quantity: 4, coinPrice: 70 }
    ]);
  }
};

export const initializePlayerState = async (userId: number) => {
  await db.insert(profiles).values({ userId }).onConflictDoNothing();

  const existingFields = await db.select({ id: fields.id }).from(fields).where(eq(fields.userId, userId)).limit(1);
  if (existingFields.length === 0) {
    await db.insert(fields).values(Array.from({ length: 4 }, () => ({ userId })));
  }

  const [bakery] = await db.select({ id: buildings.id }).from(buildings).where(eq(buildings.code, "bakery"));
  const [chicken] = await db.select({ id: animals.id }).from(animals).where(eq(animals.code, "chicken"));
  if (bakery) await db.insert(userBuildings).values({ userId, buildingId: bakery.id }).onConflictDoNothing();
  if (chicken) await db.insert(userAnimals).values({ userId, animalId: chicken.id, quantity: 2 }).onConflictDoNothing();

  const itemRows = await db.select({ id: itemsTable.id, code: itemsTable.code }).from(itemsTable);
  const itemIdByCode = new Map(itemRows.map((item) => [item.code, item.id]));

  for (const entry of starterInventory) {
    const itemId = itemIdByCode.get(entry.itemId);
    if (!itemId) continue;
    await db
      .insert(inventory)
      .values({ userId, itemId, quantity: entry.quantity })
      .onConflictDoNothing();
  }
};
