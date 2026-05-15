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
  await db.insert(itemsTable).values(items).onConflictDoNothing();
  await db.insert(buildings).values(buildingsData).onConflictDoNothing();
  await db.insert(animals).values(animalsData).onConflictDoNothing();
  await db
    .insert(recipesTable)
    .values(
      recipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients,
        outputs: recipe.outputs,
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
      avatarUrl: null
    })
    .onConflictDoUpdate({
      target: users.googleId,
      set: { username: "Admin", email: adminEmail }
    })
    .returning();

  await db.insert(profiles).values({ userId: admin.id }).onConflictDoNothing();

  const existingListings = await db.select({ id: marketplaceListings.id }).from(marketplaceListings).limit(1);
  if (existingListings.length === 0) {
    await db.insert(marketplaceListings).values([
      { sellerId: admin.id, itemId: "milk", quantity: 2, coinPrice: 40 },
      { sellerId: admin.id, itemId: "wool", quantity: 4, coinPrice: 70 }
    ]);
  }
};

export const initializePlayerState = async (userId: string) => {
  await db.insert(profiles).values({ userId }).onConflictDoNothing();

  const existingFields = await db.select({ id: fields.id }).from(fields).where(eq(fields.userId, userId)).limit(1);
  if (existingFields.length === 0) {
    await db.insert(fields).values(Array.from({ length: 4 }, () => ({ userId })));
  }

  await db.insert(userBuildings).values({ userId, buildingId: "bakery" }).onConflictDoNothing();
  await db.insert(userAnimals).values({ userId, animalId: "chicken", quantity: 2 }).onConflictDoNothing();

  for (const entry of starterInventory) {
    await db
      .insert(inventory)
      .values({ userId, itemId: entry.itemId, quantity: entry.quantity })
      .onConflictDoNothing();
  }
};
