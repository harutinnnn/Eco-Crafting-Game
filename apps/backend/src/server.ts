import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import "dotenv/config";
import express from "express";
import multer from "multer";
import { z } from "zod";
import {
  deleteRow,
  getAdminSnapshot,
  setInventory,
  updateIconUrl,
  updateUser,
  updateProfile,
  upsertAnimal,
  upsertBuilding,
  upsertItem,
  upsertMarketplaceListing,
  upsertRecipe
} from "./admin/service";
import { fakeLogin, getSessionUser, handleGoogleCallback, logout, redirectToGoogle, requireAdmin, requireAuth } from "./auth";
import { seedCatalog } from "./db/seed";
import {
  buyBuilding,
  buyMarketplaceListing,
  buySeed,
  collectAnimalProduct,
  consumeFood,
  craftRecipe,
  createMarketplaceListing,
  getGameSnapshot,
  harvestField,
  plantSeed
} from "./game/service";

export const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadRoot, { recursive: true });
const upload = multer({
  dest: uploadRoot,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image files are allowed."));
      return;
    }
    callback(null, true);
  }
});

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(uploadRoot));

void seedCatalog().catch((error: unknown) => {
  console.error("Database seed failed:", error);
});

const action = async (userId: string, handler: () => Promise<void>) => {
  try {
    await handler();
    return { ok: true, data: await getGameSnapshot(userId) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};

app.get("/api/auth/google", redirectToGoogle);
app.get("/api/auth/google/callback", handleGoogleCallback);
app.get("/api/auth/fake", fakeLogin);
app.post("/api/auth/logout", logout);

app.get("/api/auth/me", async (request, response) => {
  const user = await getSessionUser(request);
  response.json({
    user: user
      ? {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          isAdmin: user.isAdmin
        }
      : null
  });
});

app.get("/api/game", requireAuth, async (request, response) => {
  response.json(await getGameSnapshot(request.userId!));
});

app.post("/api/fields/plant", requireAuth, async (request, response) => {
  const body = z.object({ fieldId: z.string(), seedItemId: z.string() }).parse(request.body);
  response.json(await action(request.userId!, () => plantSeed(request.userId!, body.fieldId, body.seedItemId)));
});

app.post("/api/fields/harvest", requireAuth, async (request, response) => {
  const body = z.object({ fieldId: z.string() }).parse(request.body);
  response.json(await action(request.userId!, () => harvestField(request.userId!, body.fieldId)));
});

app.post("/api/craft", requireAuth, async (request, response) => {
  const body = z.object({ recipeId: z.string() }).parse(request.body);
  response.json(await action(request.userId!, () => craftRecipe(request.userId!, body.recipeId)));
});

app.post("/api/consume", requireAuth, async (request, response) => {
  const body = z.object({ itemId: z.string() }).parse(request.body);
  response.json(await action(request.userId!, () => consumeFood(request.userId!, body.itemId)));
});

app.post("/api/animals/collect", requireAuth, async (request, response) => {
  const body = z.object({ animalId: z.string() }).parse(request.body);
  response.json(await action(request.userId!, () => collectAnimalProduct(request.userId!, body.animalId)));
});

app.post("/api/shop/seed", requireAuth, async (request, response) => {
  const body = z.object({ itemId: z.string() }).parse(request.body);
  response.json(await action(request.userId!, () => buySeed(request.userId!, body.itemId)));
});

app.post("/api/shop/building", requireAuth, async (request, response) => {
  const body = z.object({ buildingType: z.enum(["bakery", "restaurant", "factory", "barn", "field"]) }).parse(request.body);
  response.json(await action(request.userId!, () => buyBuilding(request.userId!, body.buildingType)));
});

app.post("/api/marketplace/buy", requireAuth, async (request, response) => {
  const body = z.object({ listingId: z.string() }).parse(request.body);
  response.json(await action(request.userId!, () => buyMarketplaceListing(request.userId!, body.listingId)));
});

app.post("/api/marketplace/list", requireAuth, async (request, response) => {
  const body = z.object({ itemId: z.string(), quantity: z.number().int().positive(), coinPrice: z.number().int().positive() }).parse(request.body);
  response.json(await action(request.userId!, () => createMarketplaceListing(request.userId!, body)));
});

app.get("/api/admin", requireAdmin, async (_request, response) => {
  response.json(await getAdminSnapshot());
});

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["seed", "crop", "food", "animal", "animal_product", "material", "tool", "clothing"]),
  minLevel: z.number().int().min(1),
  tradable: z.boolean(),
  sellable: z.boolean(),
  energyRestore: z.number().int().nullable().optional(),
  iconUrl: z.string().nullable().optional()
});

const buildingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["bakery", "restaurant", "factory", "barn", "field"]),
  minLevel: z.number().int().min(1),
  coinCost: z.number().int().min(0),
  gemCost: z.number().int().min(0),
  iconUrl: z.string().nullable().optional()
});

const animalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  productItemId: z.string().min(1),
  minLevel: z.number().int().min(1),
  energyCost: z.number().int().min(0),
  xpReward: z.number().int().min(0),
  iconUrl: z.string().nullable().optional()
});

const recipeIngredientSchema = z.object({ itemId: z.string().min(1), quantity: z.number().int().positive() });
const recipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  buildingType: z.enum(["bakery", "restaurant", "factory", "barn", "field"]),
  minLevel: z.number().int().min(1),
  energyCost: z.number().int().min(0),
  xpReward: z.number().int().min(0),
  ingredients: z.array(recipeIngredientSchema),
  outputs: z.array(recipeIngredientSchema),
  createdByAdmin: z.boolean().optional()
});

app.post("/api/admin/items", requireAdmin, async (request, response) => {
  await upsertItem(itemSchema.parse(request.body));
  response.json({ ok: true, data: await getAdminSnapshot() });
});

app.post("/api/admin/recipes", requireAdmin, async (request, response) => {
  await upsertRecipe(recipeSchema.parse(request.body));
  response.json({ ok: true, data: await getAdminSnapshot() });
});

app.post("/api/admin/buildings", requireAdmin, async (request, response) => {
  await upsertBuilding(buildingSchema.parse(request.body));
  response.json({ ok: true, data: await getAdminSnapshot() });
});

app.post("/api/admin/animals", requireAdmin, async (request, response) => {
  await upsertAnimal(animalSchema.parse(request.body));
  response.json({ ok: true, data: await getAdminSnapshot() });
});

app.post("/api/admin/profiles/:userId", requireAdmin, async (request, response) => {
  const body = z
    .object({
      level: z.number().int().min(1).optional(),
      xp: z.number().int().min(0).optional(),
      energy: z.number().int().min(0).optional(),
      maxEnergy: z.number().int().min(1).optional(),
      coins: z.number().int().min(0).optional(),
      gems: z.number().int().min(0).optional()
    })
    .parse(request.body);
  await updateProfile(String(request.params.userId), body);
  response.json({ ok: true, data: await getAdminSnapshot() });
});

app.post("/api/admin/users/:userId", requireAdmin, async (request, response) => {
  const body = z.object({ username: z.string().min(1), email: z.string().email(), isAdmin: z.boolean() }).parse(request.body);
  await updateUser(String(request.params.userId), body);
  response.json({ ok: true, data: await getAdminSnapshot() });
});

app.post("/api/admin/inventory", requireAdmin, async (request, response) => {
  const body = z.object({ userId: z.string().uuid(), itemId: z.string().min(1), quantity: z.number().int().min(0) }).parse(request.body);
  await setInventory(body);
  response.json({ ok: true, data: await getAdminSnapshot() });
});

app.post("/api/admin/marketplace", requireAdmin, async (request, response) => {
  const body = z
    .object({
      id: z.string().uuid().optional(),
      sellerId: z.string().uuid(),
      itemId: z.string().min(1),
      quantity: z.number().int().positive(),
      coinPrice: z.number().int().positive()
    })
    .parse(request.body);
  await upsertMarketplaceListing(body);
  response.json({ ok: true, data: await getAdminSnapshot() });
});

app.post("/api/admin/upload-icon", requireAdmin, upload.single("icon"), async (request, response) => {
  const entity = z.enum(["items", "buildings", "animals"]).parse(request.body.entity);
  const id = z.string().min(1).parse(request.body.id);
  if (!request.file) {
    response.status(400).json({ error: "Icon file is required." });
    return;
  }

  const iconUrl = `/uploads/${request.file.filename}`;
  await updateIconUrl(entity, id, iconUrl);
  response.json({ ok: true, iconUrl, data: await getAdminSnapshot() });
});

app.delete("/api/admin/:table/:id", requireAdmin, async (request, response) => {
  await deleteRow(String(request.params.table), String(request.params.id));
  response.json({ ok: true, data: await getAdminSnapshot() });
});

const isViteDevServer = process.argv.some((argument) => argument.includes("vite"));

if (process.env.NODE_ENV !== "test" && !isViteDevServer) {
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => {
    console.log(`Eco Crafting API running on http://localhost:${port}`);
  });
}
