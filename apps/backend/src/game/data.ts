import type { FieldPlot, GameItem } from "@eco-crafting/shared";

export const items: GameItem[] = [
  { id: 0, code: "wheat_seed", name: "Wheat Seed", category: "seed", minLevel: 1, tradable: false, sellable: false },
  { id: 0, code: "tomato_seed", name: "Tomato Seed", category: "seed", minLevel: 2, tradable: false, sellable: false },
  { id: 0, code: "apple_seed", name: "Apple Seed", category: "seed", minLevel: 3, tradable: false, sellable: false },
  { id: 0, code: "wheat", name: "Wheat", category: "crop", minLevel: 1, tradable: true, sellable: true },
  { id: 0, code: "tomato", name: "Tomato", category: "crop", minLevel: 2, tradable: true, sellable: true },
  { id: 0, code: "apple", name: "Apple", category: "crop", minLevel: 3, tradable: true, sellable: true, energyRestore: 8 },
  { id: 0, code: "egg", name: "Egg", category: "animal_product", minLevel: 1, tradable: true, sellable: true },
  { id: 0, code: "milk", name: "Milk", category: "animal_product", minLevel: 2, tradable: true, sellable: true, energyRestore: 10 },
  { id: 0, code: "wool", name: "Wool", category: "animal_product", minLevel: 3, tradable: true, sellable: true },
  { id: 0, code: "bread", name: "Bread", category: "food", minLevel: 1, tradable: true, sellable: true, energyRestore: 15 },
  { id: 0, code: "pie", name: "Pie", category: "food", minLevel: 2, tradable: true, sellable: true, energyRestore: 28 },
  { id: 0, code: "shirt", name: "Wool Shirt", category: "clothing", minLevel: 3, tradable: true, sellable: true }
];

export const recipes = [
  {
    id: 0,
    code: "bread",
    name: "Bake Bread",
    buildingType: "bakery",
    minLevel: 1,
    energyCost: 4,
    xpReward: 12,
    ingredients: [{ itemId: "wheat", quantity: 3 }],
    outputs: [{ itemId: "bread", quantity: 1 }]
  },
  {
    id: 0,
    code: "pie",
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
    id: 0,
    code: "shirt",
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
  { id: 0, cropItemId: null, seedItemId: null, plantedAt: null, readyAt: null },
  { id: 0, cropItemId: null, seedItemId: null, plantedAt: null, readyAt: null },
  { id: 0, cropItemId: null, seedItemId: null, plantedAt: null, readyAt: null },
  { id: 0, cropItemId: null, seedItemId: null, plantedAt: null, readyAt: null }
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
  { code: "bakery", name: "Bakery", type: "bakery" as const, minLevel: 1, coinCost: 120, gemCost: 0 },
  { code: "restaurant", name: "Restaurant", type: "restaurant" as const, minLevel: 2, coinCost: 180, gemCost: 0 },
  { code: "factory", name: "Factory", type: "factory" as const, minLevel: 3, coinCost: 250, gemCost: 0 },
  { code: "barn", name: "Barn", type: "barn" as const, minLevel: 1, coinCost: 100, gemCost: 0 },
  { code: "field", name: "Field Expansion", type: "field" as const, minLevel: 1, coinCost: 80, gemCost: 0 }
];

export const animalsData = [
  { code: "chicken", name: "Chicken", productItemCode: "egg", minLevel: 1, energyCost: 2, xpReward: 2 },
  { code: "cow", name: "Cow", productItemCode: "milk", minLevel: 2, energyCost: 2, xpReward: 2 },
  { code: "sheep", name: "Sheep", productItemCode: "wool", minLevel: 3, energyCost: 2, xpReward: 2 }
];

export const starterInventory = [
  { itemId: "wheat_seed", quantity: 8 },
  { itemId: "tomato_seed", quantity: 3 },
  { itemId: "wheat", quantity: 4 },
  { itemId: "egg", quantity: 2 }
];
