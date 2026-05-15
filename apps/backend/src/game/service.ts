import type { BuildingType, InventoryEntry, RecipeIngredient } from "@eco-crafting/shared";
import { and, eq, sql } from "drizzle-orm";
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
import { seedCropMap, seedGrowSeconds } from "./data";

const xpForNextLevel = (level: number) => level * 100;

const getProfile = async (userId: number) => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (!profile) throw new Error("Player profile was not initialized.");
  return profile;
};

const getItem = async (itemId: number) => {
  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  return item;
};

const addXp = async (userId: number, amount: number) => {
  const profile = await getProfile(userId);
  let xp = profile.xp + amount;
  let level = profile.level;
  let energy = profile.energy;
  let maxEnergy = profile.maxEnergy;

  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level += 1;
    maxEnergy += 5;
    energy = maxEnergy;
  }

  await db.update(profiles).set({ xp, level, energy, maxEnergy }).where(eq(profiles.userId, userId));
};

const spendEnergy = async (userId: number, amount: number) => {
  const profile = await getProfile(userId);
  if (profile.energy < amount) {
    throw new Error("Not enough energy.");
  }
  await db.update(profiles).set({ energy: profile.energy - amount }).where(eq(profiles.userId, userId));
};

const inventoryQuantity = async (userId: number, itemId: number) => {
  const [entry] = await db
    .select({ quantity: inventory.quantity })
    .from(inventory)
    .where(and(eq(inventory.userId, userId), eq(inventory.itemId, itemId)));
  return entry?.quantity ?? 0;
};

const addInventory = async (userId: number, itemId: number, quantity: number) => {
  await db
    .insert(inventory)
    .values({ userId, itemId, quantity })
    .onConflictDoUpdate({
      target: [inventory.userId, inventory.itemId],
      set: { quantity: sql`${inventory.quantity} + ${quantity}` }
    });
};

const removeInventory = async (userId: number, itemId: number, quantity: number) => {
  const current = await inventoryQuantity(userId, itemId);
  if (current < quantity) {
    throw new Error(`Not enough ${itemId}.`);
  }

  if (current === quantity) {
    await db.delete(inventory).where(and(eq(inventory.userId, userId), eq(inventory.itemId, itemId)));
    return;
  }

  await db
    .update(inventory)
    .set({ quantity: current - quantity })
    .where(and(eq(inventory.userId, userId), eq(inventory.itemId, itemId)));
};

const requireLevel = async (userId: number, minLevel: number) => {
  const profile = await getProfile(userId);
  if (profile.level < minLevel) {
    throw new Error(`Requires level ${minLevel}.`);
  }
};

const hasIngredients = async (userId: number, ingredients: RecipeIngredient[]) => {
  for (const ingredient of ingredients) {
    if ((await inventoryQuantity(userId, ingredient.itemId)) < ingredient.quantity) {
      return false;
    }
  }
  return true;
};

export const getGameSnapshot = async (userId: number) => {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const profile = await getProfile(userId);
  const inventoryRows = await db.select().from(inventory).where(eq(inventory.userId, userId));
  const fieldRows = await db.select().from(fields).where(eq(fields.userId, userId));
  const itemRows = await db.select().from(items);
  const recipeRows = await db.select().from(recipes);
  const userBuildingRows = await db
    .select({ type: buildings.type })
    .from(userBuildings)
    .innerJoin(buildings, eq(buildings.id, userBuildings.buildingId))
    .where(eq(userBuildings.userId, userId));
  const animalRows = await db
    .select({
      animalId: animals.id,
      name: animals.name,
      productItemId: animals.productItemId,
      quantity: userAnimals.quantity,
      minLevel: animals.minLevel,
      iconUrl: animals.iconUrl
    })
    .from(userAnimals)
    .innerJoin(animals, eq(animals.id, userAnimals.animalId))
    .where(eq(userAnimals.userId, userId));
  const listingRows = await db
    .select({
      id: marketplaceListings.id,
      sellerId: marketplaceListings.sellerId,
      itemId: marketplaceListings.itemId,
      quantity: marketplaceListings.quantity,
      coinPrice: marketplaceListings.coinPrice,
      seller: users.username
    })
    .from(marketplaceListings)
    .innerJoin(users, eq(users.id, marketplaceListings.sellerId));

  return {
    profile: {
      id: userId,
      username: user?.username ?? "Player",
      level: profile.level,
      xp: profile.xp,
      energy: profile.energy,
      maxEnergy: profile.maxEnergy,
      coins: profile.coins,
      gems: profile.gems
    },
    inventory: inventoryRows.map(({ itemId, quantity }) => ({ itemId, quantity })),
    fields: fieldRows.map((field) => ({
      id: field.id,
      cropItemId: field.cropItemId,
      seedItemId: field.seedItemId,
      plantedAt: field.plantedAt?.toISOString() ?? null,
      readyAt: field.readyAt?.toISOString() ?? null
    })),
    items: itemRows,
    recipes: recipeRows.map((recipe) => ({
      id: recipe.id,
      code: recipe.code,
      name: recipe.name,
      buildingType: recipe.buildingType,
      minLevel: recipe.minLevel,
      energyCost: recipe.energyCost,
      xpReward: recipe.xpReward,
      ingredients: recipe.ingredients as RecipeIngredient[],
      outputs: recipe.outputs as RecipeIngredient[]
    })),
    buildingCatalog: await db.select().from(buildings),
    buildings: userBuildingRows.map((building) => building.type),
    animals: animalRows,
    marketplace: listingRows.map((listing) => ({
      id: listing.id,
      seller: listing.seller,
      itemId: listing.itemId,
      quantity: listing.quantity,
      coinPrice: listing.coinPrice
    })),
    xpForNextLevel: xpForNextLevel(profile.level)
  };
};

export const plantSeed = async (userId: number, fieldId: number, seedItemId: number) => {
  const seed = await getItem(seedItemId);
  if (!seed || seed.category !== "seed") throw new Error("Unknown seed.");
  await requireLevel(userId, seed.minLevel);

  const [field] = await db
    .select()
    .from(fields)
    .where(and(eq(fields.id, fieldId), eq(fields.userId, userId)));
  if (!field) throw new Error("Unknown field.");
  if (field.seedItemId) throw new Error("Field is already planted.");

  const cropCode = seedCropMap[seed.code];
  if (!cropCode) throw new Error("Seed has no crop mapping.");
  const [crop] = await db.select({ id: items.id }).from(items).where(eq(items.code, cropCode));
  if (!crop) throw new Error("Seed crop is not configured.");

  await spendEnergy(userId, 2);
  await removeInventory(userId, seedItemId, 1);

  const now = new Date();
  await db
    .update(fields)
    .set({
      seedItemId,
      cropItemId: crop.id,
      plantedAt: now,
      readyAt: new Date(now.getTime() + seedGrowSeconds[seed.code] * 1000)
    })
    .where(and(eq(fields.id, fieldId), eq(fields.userId, userId)));
  await addXp(userId, 5);
};

export const harvestField = async (userId: number, fieldId: number) => {
  const [field] = await db
    .select()
    .from(fields)
    .where(and(eq(fields.id, fieldId), eq(fields.userId, userId)));
  if (!field?.cropItemId || !field.readyAt) throw new Error("Nothing to harvest.");
  if (field.readyAt.getTime() > Date.now()) throw new Error("Crop is not ready yet.");

  await spendEnergy(userId, 3);
  await addInventory(userId, field.cropItemId, 2);
  await db
    .update(fields)
    .set({ seedItemId: null, cropItemId: null, plantedAt: null, readyAt: null })
    .where(and(eq(fields.id, fieldId), eq(fields.userId, userId)));
  await addXp(userId, 10);
};

export const craftRecipe = async (userId: number, recipeId: number) => {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
  if (!recipe) throw new Error("Unknown recipe.");
  await requireLevel(userId, recipe.minLevel);

  const ownedBuildings = await db
    .select({ type: buildings.type })
    .from(userBuildings)
    .innerJoin(buildings, eq(buildings.id, userBuildings.buildingId))
    .where(eq(userBuildings.userId, userId));
  if (!ownedBuildings.some((building) => building.type === recipe.buildingType)) {
    throw new Error(`Requires ${recipe.buildingType}.`);
  }

  const ingredients = recipe.ingredients as RecipeIngredient[];
  if (!(await hasIngredients(userId, ingredients))) throw new Error("Missing ingredients.");

  await spendEnergy(userId, recipe.energyCost);
  for (const ingredient of ingredients) {
    await removeInventory(userId, ingredient.itemId, ingredient.quantity);
  }
  for (const output of recipe.outputs as RecipeIngredient[]) {
    await addInventory(userId, output.itemId, output.quantity);
  }
  await addXp(userId, recipe.xpReward);
};

export const consumeFood = async (userId: number, itemId: number) => {
  const item = await getItem(itemId);
  if (!item || item.category !== "food" || !item.energyRestore) {
    throw new Error("This item cannot restore energy.");
  }
  await removeInventory(userId, itemId, 1);
  const profile = await getProfile(userId);
  await db
    .update(profiles)
    .set({ energy: Math.min(profile.maxEnergy, profile.energy + item.energyRestore) })
    .where(eq(profiles.userId, userId));
};

export const collectAnimalProduct = async (userId: number, animalId: number) => {
  const [animal] = await db
    .select({
      productItemId: animals.productItemId,
      quantity: userAnimals.quantity,
      minLevel: animals.minLevel
    })
    .from(userAnimals)
    .innerJoin(animals, eq(animals.id, userAnimals.animalId))
    .where(and(eq(userAnimals.userId, userId), eq(userAnimals.animalId, animalId)));
  if (!animal || animal.quantity < 1) throw new Error("You do not own this animal.");
  await requireLevel(userId, animal.minLevel);
  await spendEnergy(userId, 2);
  await addInventory(userId, animal.productItemId, animal.quantity);
  await addXp(userId, 8 * animal.quantity);
};

export const buySeed = async (userId: number, itemId: number) => {
  const item = await getItem(itemId);
  if (!item || item.category !== "seed") throw new Error("Shop item is unavailable.");
  await requireLevel(userId, item.minLevel);
  const price = item.minLevel * 8;
  const profile = await getProfile(userId);
  if (profile.coins < price) throw new Error("Not enough coins.");
  await db.update(profiles).set({ coins: profile.coins - price }).where(eq(profiles.userId, userId));
  await addInventory(userId, itemId, 1);
};

export const buyBuilding = async (userId: number, buildingType: BuildingType) => {
  const [building] = await db.select().from(buildings).where(eq(buildings.type, buildingType));
  if (!building) throw new Error("Building is unavailable.");
  await requireLevel(userId, building.minLevel);
  const [owned] = await db
    .select()
    .from(userBuildings)
    .where(and(eq(userBuildings.userId, userId), eq(userBuildings.buildingId, building.id)));
  if (owned) throw new Error("Building already owned.");

  const profile = await getProfile(userId);
  if (profile.coins < building.coinCost || profile.gems < building.gemCost) throw new Error("Not enough currency.");
  await db
    .update(profiles)
    .set({ coins: profile.coins - building.coinCost, gems: profile.gems - building.gemCost })
    .where(eq(profiles.userId, userId));
  await db.insert(userBuildings).values({ userId, buildingId: building.id }).onConflictDoNothing();
};

export const buyMarketplaceListing = async (userId: number, listingId: string) => {
  const [listing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, listingId));
  if (!listing) throw new Error("Listing not found.");
  const item = await getItem(listing.itemId);
  if (!item?.tradable) throw new Error("Item is not tradable.");
  const profile = await getProfile(userId);
  if (profile.coins < listing.coinPrice) throw new Error("Not enough coins.");

  await db.update(profiles).set({ coins: profile.coins - listing.coinPrice }).where(eq(profiles.userId, userId));
  await addInventory(userId, listing.itemId, listing.quantity);
  await db.delete(marketplaceListings).where(eq(marketplaceListings.id, listingId));
};

export const createMarketplaceListing = async (
  userId: number,
  payload: Pick<InventoryEntry, "itemId" | "quantity"> & { coinPrice: number }
) => {
  const item = await getItem(payload.itemId);
  if (!item?.tradable || !item.sellable) throw new Error("This item cannot be traded.");
  await removeInventory(userId, payload.itemId, payload.quantity);
  await db.insert(marketplaceListings).values({
    sellerId: userId,
    itemId: payload.itemId,
    quantity: payload.quantity,
    coinPrice: payload.coinPrice
  });
};
