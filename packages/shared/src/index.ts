export type CurrencyCode = "coins" | "gems";

export type ItemCategory =
  | "seed"
  | "crop"
  | "food"
  | "animal"
  | "animal_product"
  | "material"
  | "tool"
  | "clothing";

export type BuildingType = "bakery" | "restaurant" | "factory" | "barn" | "field";

export interface GameItem {
  id: number;
  code: string;
  name: string;
  category: ItemCategory;
  minLevel: number;
  tradable: boolean;
  sellable: boolean;
  energyRestore?: number;
  iconUrl?: string | null;
}

export interface InventoryEntry {
  itemId: number;
  quantity: number;
}

export interface PlayerProfile {
  id: number;
  username: string;
  level: number;
  xp: number;
  energy: number;
  maxEnergy: number;
  coins: number;
  gems: number;
}

export interface RecipeIngredient {
  itemId: number;
  quantity: number;
}

export interface Recipe {
  id: number;
  code: string;
  name: string;
  buildingType: BuildingType;
  minLevel: number;
  energyCost: number;
  xpReward: number;
  ingredients: RecipeIngredient[];
  outputs: RecipeIngredient[];
}

export interface FieldPlot {
  id: number;
  cropItemId: number | null;
  seedItemId: number | null;
  plantedAt: string | null;
  readyAt: string | null;
}
