import type { BuildingType, FieldPlot, GameItem, InventoryEntry, PlayerProfile, Recipe } from "@eco-crafting/shared";

export interface GameSnapshot {
  profile: PlayerProfile;
  inventory: InventoryEntry[];
  fields: FieldPlot[];
  items: GameItem[];
  recipes: Recipe[];
  buildingCatalog: Array<{ id: number; code: string; name: string; type: BuildingType; minLevel: number; coinCost: number; gemCost: number; iconUrl: string | null }>;
  buildings: BuildingType[];
  animals: Array<{
    animalId: number;
    name: string;
    productItemId: number;
    quantity: number;
    minLevel: number;
    iconUrl: string | null;
  }>;
  marketplace: Array<{
    id: string;
    seller: string;
    itemId: number;
    quantity: number;
    coinPrice: number;
  }>;
  xpForNextLevel: number;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export interface ActionResponse {
  ok: boolean;
  data?: GameSnapshot;
  error?: string;
}

const jsonHeaders = { "Content-Type": "application/json" };

export const fetchGame = async () => {
  const response = await fetch("/api/game", { credentials: "include" });
  if (response.status === 401) throw new Error("AUTH_REQUIRED");
  if (!response.ok) throw new Error("Failed to load game.");
  return response.json() as Promise<GameSnapshot>;
};

export const postAction = async (url: string, body: unknown) => {
  const response = await fetch(url, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(body)
  });
  if (response.status === 401) throw new Error("AUTH_REQUIRED");
  if (!response.ok) throw new Error("Action failed.");
  return response.json() as Promise<ActionResponse>;
};

export const fetchAuthUser = async () => {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (!response.ok) throw new Error("Failed to load auth state.");
  return response.json() as Promise<{ user: AuthUser | null }>;
};

export const logout = async () => {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  });
  if (!response.ok) throw new Error("Logout failed.");
};

export interface AdminSnapshot {
  items: Array<GameItem>;
  recipes: Array<Recipe>;
  buildings: Array<{ id: number; code: string; name: string; type: BuildingType; minLevel: number; coinCost: number; gemCost: number; iconUrl: string | null }>;
  animals: Array<{ id: number; code: string; name: string; productItemId: number; minLevel: number; energyCost: number; xpReward: number; iconUrl: string | null }>;
  users: Array<{ id: number; username: string; email: string; googleId: string; avatarUrl: string | null; isAdmin: boolean; createdAt: string }>;
  profiles: Array<{ userId: number; level: number; xp: number; energy: number; maxEnergy: number; coins: number; gems: number }>;
  inventory: Array<{ id: string; userId: number; itemId: number; quantity: number }>;
  fields: Array<FieldPlot & { userId: number }>;
  userBuildings: Array<{ id: string; userId: number; buildingId: number }>;
  userAnimals: Array<{ id: string; userId: number; animalId: number; quantity: number }>;
  marketplace: Array<{ id: string; sellerId: number; itemId: number; quantity: number; coinPrice: number; createdAt: string }>;
}

export const fetchAdmin = async () => {
  const response = await fetch("/api/admin", { credentials: "include" });
  if (!response.ok) throw new Error("Admin data unavailable.");
  return response.json() as Promise<AdminSnapshot>;
};

export const postAdmin = async <T>(url: string, body: T) => {
  const response = await fetch(url, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("Admin save failed.");
  return response.json() as Promise<{ ok: boolean; data: AdminSnapshot }>;
};

export const deleteAdmin = async (table: string, id: string) => {
  const response = await fetch(`/api/admin/${table}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!response.ok) throw new Error("Admin delete failed.");
  return response.json() as Promise<{ ok: boolean; data: AdminSnapshot }>;
};

export const uploadAdminIcon = async (entity: "items" | "buildings" | "animals", id: string, file: File) => {
  const body = new FormData();
  body.append("entity", entity);
  body.append("id", id);
  body.append("icon", file);
  const response = await fetch("/api/admin/upload-icon", {
    method: "POST",
    credentials: "include",
    body
  });
  if (!response.ok) throw new Error("Icon upload failed.");
  return response.json() as Promise<{ ok: boolean; iconUrl: string; data: AdminSnapshot }>;
};
