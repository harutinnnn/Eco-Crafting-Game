import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  animals,
  buildings,
  fields,
  inventory,
  items,
  marketplaceListings,
  profiles,
  recipes,
  userAnimals,
  userBuildings,
  users
} from "../db/schema";

export const getAdminSnapshot = async () => {
  const [
    itemRows,
    recipeRows,
    buildingRows,
    animalRows,
    userRows,
    profileRows,
    inventoryRows,
    fieldRows,
    userBuildingRows,
    userAnimalRows,
    listingRows
  ] = await Promise.all([
    db.select().from(items),
    db.select().from(recipes),
    db.select().from(buildings),
    db.select().from(animals),
    db.select().from(users),
    db.select().from(profiles),
    db.select().from(inventory),
    db.select().from(fields),
    db.select().from(userBuildings),
    db.select().from(userAnimals),
    db.select().from(marketplaceListings)
  ]);

  return {
    items: itemRows,
    recipes: recipeRows,
    buildings: buildingRows,
    animals: animalRows,
    users: userRows.map(({ id, username, email, googleId, avatarUrl, isAdmin, createdAt }) => ({
      id,
      username,
      email,
      googleId,
      avatarUrl,
      isAdmin,
      createdAt
    })),
    profiles: profileRows,
    inventory: inventoryRows,
    fields: fieldRows,
    userBuildings: userBuildingRows,
    userAnimals: userAnimalRows,
    marketplace: listingRows
  };
};

export const upsertItem = async (payload: typeof items.$inferInsert) => {
  await db
    .insert(items)
    .values(payload)
    .onConflictDoUpdate({
      target: items.id,
      set: {
        name: payload.name,
        code: payload.code,
        category: payload.category,
        minLevel: payload.minLevel,
        tradable: payload.tradable,
        sellable: payload.sellable,
        energyRestore: payload.energyRestore ?? null,
        iconUrl: payload.iconUrl ?? null
      }
    });
};

export const upsertRecipe = async (payload: typeof recipes.$inferInsert) => {
  await db
    .insert(recipes)
    .values(payload)
    .onConflictDoUpdate({
      target: recipes.id,
      set: {
        name: payload.name,
        code: payload.code,
        buildingType: payload.buildingType,
        minLevel: payload.minLevel,
        energyCost: payload.energyCost,
        xpReward: payload.xpReward,
        ingredients: payload.ingredients,
        outputs: payload.outputs,
        createdByAdmin: payload.createdByAdmin ?? true
      }
    });
};

export const upsertBuilding = async (payload: typeof buildings.$inferInsert) => {
  await db
    .insert(buildings)
    .values(payload)
    .onConflictDoUpdate({
      target: buildings.id,
      set: {
        name: payload.name,
        code: payload.code,
        type: payload.type,
        minLevel: payload.minLevel,
        coinCost: payload.coinCost,
        gemCost: payload.gemCost,
        iconUrl: payload.iconUrl ?? null
      }
    });
};

export const upsertAnimal = async (payload: typeof animals.$inferInsert) => {
  await db
    .insert(animals)
    .values(payload)
    .onConflictDoUpdate({
      target: animals.id,
      set: {
        name: payload.name,
        code: payload.code,
        productItemId: payload.productItemId,
        minLevel: payload.minLevel,
        energyCost: payload.energyCost,
        xpReward: payload.xpReward,
        iconUrl: payload.iconUrl ?? null
      }
    });
};

export const updateIconUrl = async (entity: string, id: number, iconUrl: string) => {
  switch (entity) {
    case "items":
      await db.update(items).set({ iconUrl }).where(eq(items.id, id));
      break;
    case "buildings":
      await db.update(buildings).set({ iconUrl }).where(eq(buildings.id, id));
      break;
    case "animals":
      await db.update(animals).set({ iconUrl }).where(eq(animals.id, id));
      break;
    default:
      throw new Error("Icons are supported only for items, buildings, and animals.");
  }
};

export const updateProfile = async (userId: number, payload: Partial<typeof profiles.$inferInsert>) => {
  await db.update(profiles).set(payload).where(eq(profiles.userId, userId));
};

export const updateUser = async (userId: number, payload: Pick<typeof users.$inferInsert, "username" | "email" | "isAdmin">) => {
  await db.update(users).set(payload).where(eq(users.id, userId));
};

export const setInventory = async (payload: typeof inventory.$inferInsert) => {
  if (payload.quantity <= 0) {
    await db.delete(inventory).where(and(eq(inventory.userId, payload.userId), eq(inventory.itemId, payload.itemId)));
    return;
  }

  await db
    .insert(inventory)
    .values(payload)
    .onConflictDoUpdate({
      target: [inventory.userId, inventory.itemId],
      set: { quantity: payload.quantity }
    });
};

export const upsertMarketplaceListing = async (payload: typeof marketplaceListings.$inferInsert) => {
  if (payload.id) {
    await db
      .update(marketplaceListings)
      .set({
        sellerId: payload.sellerId,
        itemId: payload.itemId,
        quantity: payload.quantity,
        coinPrice: payload.coinPrice
      })
      .where(eq(marketplaceListings.id, payload.id));
    return;
  }

  await db.insert(marketplaceListings).values(payload);
};

export const deleteRow = async (tableName: string, id: string) => {
  const numericId = Number(id);
  switch (tableName) {
    case "items":
      await db.delete(items).where(eq(items.id, numericId));
      break;
    case "recipes":
      await db.delete(recipes).where(eq(recipes.id, numericId));
      break;
    case "buildings":
      await db.delete(buildings).where(eq(buildings.id, numericId));
      break;
    case "animals":
      await db.delete(animals).where(eq(animals.id, numericId));
      break;
    case "marketplace":
      await db.delete(marketplaceListings).where(eq(marketplaceListings.id, id));
      break;
    default:
      throw new Error("Unsupported table.");
  }
};
