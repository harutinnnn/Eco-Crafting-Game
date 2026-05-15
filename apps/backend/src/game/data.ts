import type { FieldPlot, GameItem, PlayerProfile, Recipe } from "@eco-crafting/shared";

export const items: GameItem[] = [
  { id: "wheat_seed", name: "Wheat Seed", category: "seed", minLevel: 1, tradable: false, sellable: false },
  { id: "tomato_seed", name: "Tomato Seed", category: "seed", minLevel: 2, tradable: false, sellable: false },
  { id: "apple_seed", name: "Apple Seed", category: "seed", minLevel: 3, tradable: false, sellable: false },
  { id: "wheat", name: "Wheat", category: "crop", minLevel: 1, tradable: true, sellable: true },
  { id: "tomato", name: "Tomato", category: "crop", minLevel: 2, tradable: true, sellable: true },
  { id: "apple", name: "Apple", category: "crop", minLevel: 3, tradable: true, sellable: true, energyRestore: 8 },
  { id: "egg", name: "Egg", category: "animal_product", minLevel: 1, tradable: true, sellable: true },
  { id: "milk", name: "Milk", category: "animal_product", minLevel: 2, tradable: true, sellable: true, energyRestore: 10 },
  { id: "wool", name: "Wool", category: "animal_product", minLevel: 3, tradable: true, sellable: true },
  { id: "bread", name: "Bread", category: "food", minLevel: 1, tradable: true, sellable: true, energyRestore: 15 },
  { id: "pie", name: "Pie", category: "food", minLevel: 2, tradable: true, sellable: true, energyRestore: 28 },
  { id: "shirt", name: "Wool Shirt", category: "clothing", minLevel: 3, tradable: true, sellable: true }
];

export const recipes: Recipe[] = [
  {
    id: "bread",
    name: "Bake Bread",
    buildingType: "bakery",
    minLevel: 1,
    energyCost: 4,
    xpReward: 12,
    ingredients: [{ itemId: "wheat", quantity: 3 }],
    outputs: [{ itemId: "bread", quantity: 1 }]
  },
  {
    id: "pie",
    name: "Cook Pie",
    buildingType: "restaurant",
    minLevel: 2,
    energyCost: 7,
    xpReward: 20,
    ingredients: [
      { itemId: "wheat", quantity: 2 },
      { itemId: "egg", quantity: 1 },
      { itemId: "milk", quantity: 1 }
    ],
    outputs: [{ itemId: "pie", quantity: 1 }]
  },
  {
    id: "shirt",
    name: "Craft Wool Shirt",
    buildingType: "factory",
    minLevel: 3,
    energyCost: 8,
    xpReward: 25,
    ingredients: [{ itemId: "wool", quantity: 4 }],
    outputs: [{ itemId: "shirt", quantity: 1 }]
  }
];

export const fields: FieldPlot[] = [
  { id: "field-1", cropItemId: null, seedItemId: null, plantedAt: null, readyAt: null },
  { id: "field-2", cropItemId: null, seedItemId: null, plantedAt: null, readyAt: null },
  { id: "field-3", cropItemId: null, seedItemId: null, plantedAt: null, readyAt: null },
  { id: "field-4", cropItemId: null, seedItemId: null, plantedAt: null, readyAt: null }
];

export const seedCropMap: Record<string, string> = {
  wheat_seed: "wheat",
  tomato_seed: "tomato",
  apple_seed: "apple"
};

export const seedGrowSeconds: Record<string, number> = {
  wheat_seed: 30,
  tomato_seed: 60,
  apple_seed: 90
};

export const buildingsData = [
  { id: "bakery", name: "Bakery", type: "bakery" as const, minLevel: 1, coinCost: 120, gemCost: 0 },
  { id: "restaurant", name: "Restaurant", type: "restaurant" as const, minLevel: 2, coinCost: 180, gemCost: 0 },
  { id: "factory", name: "Factory", type: "factory" as const, minLevel: 3, coinCost: 250, gemCost: 0 },
  { id: "barn", name: "Barn", type: "barn" as const, minLevel: 1, coinCost: 100, gemCost: 0 },
  { id: "field", name: "Field Expansion", type: "field" as const, minLevel: 1, coinCost: 80, gemCost: 0 }
];

export const animalsData = [
  { id: "chicken", name: "Chicken", productItemId: "egg", minLevel: 1, energyCost: 2, xpReward: 2 },
  { id: "cow", name: "Cow", productItemId: "milk", minLevel: 2, energyCost: 2, xpReward: 2 },
  { id: "sheep", name: "Sheep", productItemId: "wool", minLevel: 3, energyCost: 2, xpReward: 2 }
];

export const starterInventory = [
  { itemId: "wheat_seed", quantity: 8 },
  { itemId: "tomato_seed", quantity: 3 },
  { itemId: "wheat", quantity: 4 },
  { itemId: "egg", quantity: 2 }
];
