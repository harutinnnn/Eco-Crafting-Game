import {
  Beef,
  Coins,
  Factory,
  Hammer,
  HeartPulse,
  Lock,
  LogOut,
  Package,
  Salad,
  Save,
  Shield,
  Sprout,
  ShoppingBag,
  Store,
  Trash2,
  Trophy
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BuildingType, GameItem, InventoryEntry } from "@eco-crafting/shared";
import {
  deleteAdmin,
  fetchAdmin,
  fetchAuthUser,
  fetchGame,
  logout,
  postAdmin,
  uploadAdminIcon,
  type AdminSnapshot,
  type AuthUser,
  type GameSnapshot,
  postAction
} from "../api";

type Tab = "farm" | "craft" | "animals" | "shop" | "market" | "admin";

const tabs: Array<{ id: Tab; label: string; icon: typeof Sprout }> = [
  { id: "farm", label: "Farm", icon: Sprout },
  { id: "craft", label: "Craft", icon: Hammer },
  { id: "animals", label: "Animals", icon: Beef },
  { id: "shop", label: "Shop", icon: ShoppingBag },
  { id: "market", label: "Market", icon: Store },
  { id: "admin", label: "Admin", icon: Shield }
];

const buildingOptions: Array<{ id: BuildingType; label: string }> = [
  { id: "bakery", label: "Bakery" },
  { id: "restaurant", label: "Restaurant" },
  { id: "factory", label: "Factory" },
  { id: "barn", label: "Barn" },
  { id: "field", label: "Field" }
];

const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-emerald-700 bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm transition hover:border-emerald-800 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-45";

const authBaseUrl = "http://localhost:4000";

const itemName = (items: GameItem[], itemId: string) => items.find((item) => item.id === itemId)?.name ?? itemId;
const itemById = (items: GameItem[], itemId: string) => items.find((item) => item.id === itemId);
const assetUrl = (url?: string | null) => {
  if (!url) return undefined;
  return url.startsWith("/uploads/") ? `${authBaseUrl}${url}` : url;
};

const quantityOf = (inventory: InventoryEntry[], itemId: string) =>
  inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0;

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [tab, setTab] = useState<Tab>("farm");
  const [message, setMessage] = useState("Loading your farm...");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const authStatus = new URLSearchParams(window.location.search).get("auth");
    fetchAuthUser()
      .then(async ({ user: authUser }) => {
        setUser(authUser);
        setAuthChecked(true);
        if (!authUser) {
          setMessage(
            authStatus === "missing_google_config"
              ? "Google login needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in apps/backend/.env."
              : authStatus === "failed"
                ? "Google login failed. Please try again."
                : "Sign in to start saving your farm."
          );
          return;
        }
        const data = await fetchGame();
        setSnapshot(data);
        setMessage("Ready.");
      })
      .catch((error: Error) => {
        setAuthChecked(true);
        setMessage(error.message === "AUTH_REQUIRED" ? "Sign in to start saving your farm." : error.message);
      });
  }, []);

  const seeds = useMemo(() => snapshot?.items.filter((item) => item.category === "seed") ?? [], [snapshot?.items]);

  const runAction = async (url: string, body: unknown, success: string) => {
    setMessage("Working...");
    try {
      const result = await postAction(url, body);
      if (!result.ok || !result.data) {
        setMessage(result.error ?? "Action failed.");
        return;
      }
      setSnapshot(result.data);
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  };

  const runLogout = async () => {
    await logout();
    setUser(null);
    setSnapshot(null);
    setMessage("Signed out.");
  };

  if (!authChecked) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 text-lg font-black text-stone-700">
        {message}
      </main>
    );
  }

  if (!user || !snapshot) {
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#d8ead0_0,#f3f5ed_40%,#eef1e7_100%)] p-6 text-stone-900">
        <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white/90 p-6 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Eco Crafting</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Login to save your economy</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-stone-600">
            Your fields, inventory, animals, buildings, marketplace actions, XP, energy, and currencies will be saved in PostgreSQL.
          </p>
          <a
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-emerald-700 bg-emerald-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
            href={`${authBaseUrl}/api/auth/google`}
          >
            Continue with Google
          </a>
          <a
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-black text-stone-800 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50"
            href={`${authBaseUrl}/api/auth/fake`}
          >
            Demo Login
          </a>
          <p className="mt-4 text-sm font-bold text-emerald-900">{message}</p>
        </section>
      </main>
    );
  }

  const energyPercent = Math.round((snapshot.profile.energy / snapshot.profile.maxEnergy) * 100);
  const xpPercent = Math.round((snapshot.profile.xp / snapshot.xpForNextLevel) * 100);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d8ead0_0,#f3f5ed_34%,#eef1e7_100%)] text-stone-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[304px_minmax(0,1fr)]">
        <aside className="border-b border-stone-200/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(37,53,39,0.08)] backdrop-blur lg:border-b-0 lg:border-r lg:p-6">
          <div className="rounded-lg border border-emerald-900/10 bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100">Eco Crafting</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{snapshot.profile.username}</h1>
            <p className="mt-2 text-sm text-emerald-100">{user.email}</p>
          </div>

          <section className="mt-5 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <Stat icon={Trophy} label="Level" value={snapshot.profile.level.toString()} tone="amber" />
            <Stat icon={HeartPulse} label="Energy" value={`${snapshot.profile.energy}/${snapshot.profile.maxEnergy}`} tone="rose" />
            <Progress value={energyPercent} color="bg-rose-500" />
            <Stat icon={Coins} label="Coins" value={snapshot.profile.coins.toString()} tone="yellow" />
            <Stat icon={Factory} label="Gems" value={snapshot.profile.gems.toString()} tone="sky" />
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-stone-500">XP</span>
              <strong className="text-stone-800">
                {snapshot.profile.xp}/{snapshot.xpForNextLevel}
              </strong>
            </div>
            <Progress value={xpPercent} color="bg-emerald-600" />
          </section>

          <nav className="mt-5 grid gap-2">
            {tabs.map((entry) => {
              const Icon = entry.icon;
              const active = tab === entry.id;
              return (
                <button
                  key={entry.id}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-md border px-4 text-left text-sm font-extrabold transition ${
                    active
                      ? "border-emerald-600 bg-emerald-700 text-white shadow-md"
                      : "border-stone-200 bg-white text-stone-700 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                  onClick={() => setTab(entry.id)}
                >
                  <Icon size={18} />
                  {entry.label}
                </button>
              );
            })}
          </nav>
          <button className={`${buttonClass} mt-5 w-full`} onClick={runLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Inventory
              inventory={snapshot.inventory}
              items={snapshot.items}
              onEat={(itemId) => runAction("/api/consume", { itemId }, "Energy restored.")}
            />
            <div className="rounded-lg border border-emerald-200 bg-white/90 p-4 text-sm font-bold text-emerald-900 shadow-sm">
              {message}
            </div>
          </header>

          {tab === "farm" && (
            <Panel title="Fields" subtitle="Plant seeds, wait for crops, then harvest resources for recipes.">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {snapshot.fields.map((field, index) => {
                  const ready = field.readyAt ? new Date(field.readyAt).getTime() <= Date.now() : false;
                  return (
                    <article
                      className="min-h-60 rounded-lg border border-emerald-100 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      key={field.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid size-12 place-items-center rounded-md bg-emerald-100 text-emerald-800">
                          <EntityIcon
                            iconUrl={field.cropItemId ? itemById(snapshot.items, field.cropItemId)?.iconUrl : null}
                            fallback={<Sprout size={26} />}
                            compact
                          />
                        </div>
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">
                          Plot {index + 1}
                        </span>
                      </div>
                      <h3 className="mt-5 text-lg font-black">
                        {field.cropItemId ? itemName(snapshot.items, field.cropItemId) : "Empty Field"}
                      </h3>
                      <p className="mt-1 min-h-10 text-sm font-medium text-stone-500">
                        {field.readyAt
                          ? ready
                            ? "Ready to harvest"
                            : `Ready ${new Date(field.readyAt).toLocaleTimeString()}`
                          : "Choose a seed"}
                      </p>
                      {field.cropItemId ? (
                        <button
                          className={primaryButtonClass}
                          onClick={() => runAction("/api/fields/harvest", { fieldId: field.id }, "Harvest complete.")}
                        >
                          Harvest
                        </button>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {seeds.map((seed) => (
                            <button
                              className={buttonClass}
                              key={seed.id}
                              disabled={quantityOf(snapshot.inventory, seed.id) < 1 || snapshot.profile.level < seed.minLevel}
                              onClick={() =>
                                runAction("/api/fields/plant", { fieldId: field.id, seedItemId: seed.id }, `${seed.name} planted.`)
                              }
                            >
                              {snapshot.profile.level < seed.minLevel && <Lock size={14} />}
                              {seed.iconUrl && <img className="size-5 rounded object-cover" src={assetUrl(seed.iconUrl)} alt="" />}
                              {seed.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </Panel>
          )}

          {tab === "craft" && (
            <Panel title="Recipes" subtitle="Use crops and animal products inside owned buildings.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {snapshot.recipes.map((recipe) => (
                  <article className="rounded-lg border border-stone-200 bg-white/90 p-5 shadow-sm" key={recipe.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">{recipe.name}</h3>
                        <p className="mt-1 text-sm font-semibold capitalize text-stone-500">
                          {recipe.buildingType} | level {recipe.minLevel} | {recipe.energyCost} energy
                        </p>
                      </div>
                      <div className="grid size-10 place-items-center rounded-md bg-orange-100 text-orange-700">
                        <Hammer size={20} />
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3">
                      <Detail
                        label="Needs"
                        value={recipe.ingredients.map((entry) => `${entry.quantity} ${itemName(snapshot.items, entry.itemId)}`).join(", ")}
                      />
                      <Detail
                        label="Makes"
                        value={recipe.outputs.map((entry) => `${entry.quantity} ${itemName(snapshot.items, entry.itemId)}`).join(", ")}
                      />
                    </div>
                    <button
                      className={`${primaryButtonClass} mt-5 w-full`}
                      onClick={() => runAction("/api/craft", { recipeId: recipe.id }, `${recipe.name} complete.`)}
                    >
                      Craft
                    </button>
                  </article>
                ))}
              </div>
            </Panel>
          )}

          {tab === "animals" && (
            <Panel title="Animals" subtitle="Collect eggs, milk, wool, and other production goods.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {snapshot.animals.map((animal) => (
                  <article className="rounded-lg border border-stone-200 bg-white/90 p-5 shadow-sm" key={animal.animalId}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">{animal.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-stone-500">
                          Owned: {animal.quantity} | level {animal.minLevel}
                        </p>
                      </div>
                      <div className="grid size-10 place-items-center rounded-md bg-sky-100 text-sky-700">
                        <EntityIcon iconUrl={animal.iconUrl} fallback={<Beef size={20} />} compact />
                      </div>
                    </div>
                    <div className="mt-5">
                      <Detail label="Produces" value={itemName(snapshot.items, animal.productItemId)} />
                    </div>
                    <button
                      className={`${primaryButtonClass} mt-5 w-full`}
                      onClick={() => runAction("/api/animals/collect", { animalId: animal.animalId }, "Animal products collected.")}
                    >
                      Collect
                    </button>
                  </article>
                ))}
              </div>
            </Panel>
          )}

          {tab === "shop" && (
            <Panel title="Shop" subtitle="Buy seeds and buildings to unlock more of the economy.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {seeds.map((seed) => (
                  <article className="rounded-lg border border-stone-200 bg-white/90 p-5 shadow-sm" key={seed.id}>
                    <EntityIcon iconUrl={seed.iconUrl} fallback={<Sprout size={22} />} />
                    <h3 className="mt-4 text-lg font-black">{seed.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-stone-500">Seed | level {seed.minLevel}</p>
                    <div className="mt-5">
                      <Detail label="Price" value={`${seed.minLevel * 8} coins`} />
                    </div>
                    <button
                      className={`${buttonClass} mt-5 w-full`}
                      onClick={() => runAction("/api/shop/seed", { itemId: seed.id }, `${seed.name} purchased.`)}
                    >
                      Buy Seed
                    </button>
                  </article>
                ))}
                {snapshot.buildingCatalog.map((building) => (
                  <article className="rounded-lg border border-stone-200 bg-white/90 p-5 shadow-sm" key={building.id}>
                    <EntityIcon iconUrl={building.iconUrl} fallback={<Factory size={22} />} />
                    <h3 className="mt-4 text-lg font-black">{building.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-stone-500">
                      {snapshot.buildings.includes(building.type) ? "Owned" : `Cost ${building.coinCost} coins`}
                    </p>
                    <button
                      className={`${buttonClass} mt-5 w-full`}
                      disabled={snapshot.buildings.includes(building.type)}
                      onClick={() => runAction("/api/shop/building", { buildingType: building.type }, `${building.name} purchased.`)}
                    >
                      Buy Building
                    </button>
                  </article>
                ))}
              </div>
            </Panel>
          )}

          {tab === "market" && (
            <Panel title="Marketplace" subtitle="Buy tradable goods from other players and admin listings.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {snapshot.marketplace.map((listing) => (
                  <article className="rounded-lg border border-stone-200 bg-white/90 p-5 shadow-sm" key={listing.id}>
                    <EntityIcon iconUrl={itemById(snapshot.items, listing.itemId)?.iconUrl} fallback={<Store size={22} />} />
                    <h3 className="mt-4 text-lg font-black">{itemName(snapshot.items, listing.itemId)}</h3>
                    <p className="mt-1 text-sm font-semibold text-stone-500">Seller: {listing.seller}</p>
                    <div className="mt-5 grid gap-3">
                      <Detail label="Quantity" value={listing.quantity.toString()} />
                      <Detail label="Price" value={`${listing.coinPrice} coins`} />
                    </div>
                    <button
                      className={`${primaryButtonClass} mt-5 w-full`}
                      onClick={() => runAction("/api/marketplace/buy", { listingId: listing.id }, "Marketplace purchase complete.")}
                    >
                      Buy
                    </button>
                  </article>
                ))}
              </div>
            </Panel>
          )}

          {tab === "admin" && user.isAdmin && <AdminPanel />}
          {tab === "admin" && !user.isAdmin && (
            <Panel title="Admin" subtitle="This account does not have administrative access.">
              <div className="rounded-lg border border-stone-200 bg-white p-5 text-sm font-bold text-stone-600">
                Login as the demo admin account to edit game data.
              </div>
            </Panel>
          )}
        </section>
      </div>
    </main>
  );
}

type AdminSection = "items" | "recipes" | "buildings" | "animals" | "users" | "profiles" | "inventory" | "marketplace";

const adminSections: Array<{ id: AdminSection; label: string }> = [
  { id: "items", label: "Items" },
  { id: "recipes", label: "Recipes" },
  { id: "buildings", label: "Buildings" },
  { id: "animals", label: "Animals" },
  { id: "users", label: "Users" },
  { id: "profiles", label: "Profiles" },
  { id: "inventory", label: "Inventory" },
  { id: "marketplace", label: "Marketplace" }
];

function AdminPanel() {
  const [data, setData] = useState<AdminSnapshot | null>(null);
  const [section, setSection] = useState<AdminSection>("items");
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Loading admin data...");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchAdmin()
      .then((snapshot) => {
        setData(snapshot);
        setStatus("Admin data loaded.");
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);

  const rows = data?.[section] ?? [];

  const editRow = (row: Record<string, unknown>) => {
    const next: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === "ingredients" || key === "outputs") {
        next[key] = JSON.stringify(value);
      } else if (typeof value === "boolean") {
        next[key] = value;
      } else {
        next[key] = value == null ? "" : String(value);
      }
    }
    setForm(next);
    setIconFile(null);
    setModalOpen(true);
  };

  const newRow = () => {
    const templates: Record<AdminSection, Record<string, string | boolean>> = {
      items: { id: "new_item", name: "New Item", category: "material", minLevel: "1", tradable: true, sellable: true, energyRestore: "", iconUrl: "" },
      recipes: {
        id: "new_recipe",
        name: "New Recipe",
        buildingType: "bakery",
        minLevel: "1",
        energyCost: "1",
        xpReward: "1",
        ingredients: JSON.stringify([{ itemId: "wheat", quantity: 1 }]),
        outputs: JSON.stringify([{ itemId: "bread", quantity: 1 }]),
        createdByAdmin: true
      },
      buildings: { id: "new_building", name: "New Building", type: "factory", minLevel: "1", coinCost: "0", gemCost: "0", iconUrl: "" },
      animals: { id: "new_animal", name: "New Animal", productItemId: data?.items[0]?.id ?? "egg", minLevel: "1", energyCost: "1", xpReward: "1", iconUrl: "" },
      users: { id: data?.users[0]?.id ?? "", username: data?.users[0]?.username ?? "", email: data?.users[0]?.email ?? "", isAdmin: data?.users[0]?.isAdmin ?? false },
      profiles: {
        userId: data?.profiles[0]?.userId ?? "",
        level: "1",
        xp: "0",
        energy: "50",
        maxEnergy: "50",
        coins: "250",
        gems: "10"
      },
      inventory: { userId: data?.users[0]?.id ?? "", itemId: data?.items[0]?.id ?? "", quantity: "1" },
      marketplace: { sellerId: data?.users[0]?.id ?? "", itemId: data?.items[0]?.id ?? "", quantity: "1", coinPrice: "1" }
    };
    setForm(templates[section]);
    setIconFile(null);
    setModalOpen(true);
  };

  const saveDraft = async () => {
    try {
      const parsed = normalizeAdminForm(section, form);
      let result: { data: AdminSnapshot };
      if (section === "profiles") {
        const { userId, ...body } = parsed;
        result = await postAdmin(`/api/admin/profiles/${String(userId)}`, body);
      } else if (section === "users") {
        const { id, username, email, isAdmin } = parsed;
        result = await postAdmin(`/api/admin/users/${String(id)}`, { username, email, isAdmin });
      } else {
        result = await postAdmin(`/api/admin/${section}`, parsed);
      }
      if (iconFile && ["items", "buildings", "animals"].includes(section)) {
        result = await uploadAdminIcon(section as "items" | "buildings" | "animals", String(parsed.id), iconFile);
      }
      setData(result.data);
      setStatus("Saved.");
      setModalOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    }
  };

  const removeRow = async (row: Record<string, unknown>) => {
    if (!("id" in row) || section === "profiles" || section === "inventory" || section === "users") {
      setStatus("Delete is only enabled for catalog rows and marketplace listings.");
      return;
    }
    const result = await deleteAdmin(section, String(row.id));
    setData(result.data);
    setStatus("Deleted.");
  };

  return (
    <Panel title="Admin" subtitle="Edit catalog, players, inventory, and economy data stored in PostgreSQL.">
      <div className="grid gap-5">
        <section className="rounded-lg border border-stone-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {adminSections.map((entry) => (
              <button
                className={entry.id === section ? primaryButtonClass : buttonClass}
                key={entry.id}
                onClick={() => {
                  setSection(entry.id);
                  setForm({});
                  setIconFile(null);
                  setModalOpen(false);
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-stone-50 p-3">
            <p className="text-sm font-bold text-stone-600">{status}</p>
            <button className={primaryButtonClass} onClick={newRow}>
              New {section}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-3 pr-3">Icon</th>
                  <th className="py-3 pr-3">ID</th>
                  <th className="py-3 pr-3">Name / User</th>
                  <th className="py-3 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(rows as Array<Record<string, unknown>>).map((row, index) => (
                  <tr className="border-b border-stone-100" key={String(row.id ?? row.userId ?? index)}>
                    <td className="py-3 pr-3">
                      {typeof row.iconUrl === "string" && row.iconUrl ? (
                        <img className="size-10 rounded-md border border-stone-200 object-cover" src={assetUrl(row.iconUrl)} alt="" />
                      ) : (
                        <span className="grid size-10 place-items-center rounded-md bg-stone-100 text-xs font-black text-stone-400">-</span>
                      )}
                    </td>
                    <td className="max-w-56 truncate py-3 pr-3 font-bold text-stone-800">{String(row.id ?? row.userId ?? "-")}</td>
                    <td className="py-3 pr-3 text-stone-700">{String(row.name ?? row.username ?? row.itemId ?? row.email ?? "-")}</td>
                    <td className="flex gap-2 py-3 pr-3">
                      <button className={buttonClass} onClick={() => editRow(row)}>
                        Edit
                      </button>
                      <button className={buttonClass} onClick={() => removeRow(row)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/55 p-4 backdrop-blur-sm">
            <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-stone-200 bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
                <div>
                  <h3 className="text-xl font-black capitalize">{Object.keys(form).length ? `Edit ${section}` : `New ${section}`}</h3>
                  <p className="mt-1 text-sm font-semibold text-stone-500">
                    Use form fields. Items, buildings, and animals support icon file upload.
                  </p>
                </div>
                <button className={buttonClass} onClick={() => setModalOpen(false)}>
                  Close
                </button>
              </div>
              <AdminForm
                section={section}
                data={data}
                form={form}
                setForm={setForm}
                iconFile={iconFile}
                setIconFile={setIconFile}
              />
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 pt-4">
                <button className={buttonClass} onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button className={primaryButtonClass} disabled={Object.keys(form).length === 0} onClick={saveDraft}>
                  <Save size={16} />
                  Save {section}
                </button>
              </div>
              <p className="mt-3 rounded-md bg-stone-50 p-3 text-sm font-bold text-stone-600">{status}</p>
            </section>
          </div>
        )}
      </div>
    </Panel>
  );
}

function normalizeAdminForm(section: AdminSection, form: Record<string, string | boolean>) {
  const number = (key: string) => Number(form[key] || 0);
  const nullableNumber = (key: string) => (form[key] === "" ? null : Number(form[key]));

  if (section === "items") {
    return {
      id: String(form.id),
      name: String(form.name),
      category: String(form.category),
      minLevel: number("minLevel"),
      tradable: Boolean(form.tradable),
      sellable: Boolean(form.sellable),
      energyRestore: nullableNumber("energyRestore"),
      iconUrl: String(form.iconUrl ?? "") || null
    };
  }
  if (section === "recipes") {
    return {
      id: String(form.id),
      name: String(form.name),
      buildingType: String(form.buildingType),
      minLevel: number("minLevel"),
      energyCost: number("energyCost"),
      xpReward: number("xpReward"),
      ingredients: JSON.parse(String(form.ingredients || "[]")),
      outputs: JSON.parse(String(form.outputs || "[]")),
      createdByAdmin: Boolean(form.createdByAdmin)
    };
  }
  if (section === "buildings") {
    return {
      id: String(form.id),
      name: String(form.name),
      type: String(form.type),
      minLevel: number("minLevel"),
      coinCost: number("coinCost"),
      gemCost: number("gemCost"),
      iconUrl: String(form.iconUrl ?? "") || null
    };
  }
  if (section === "animals") {
    return {
      id: String(form.id),
      name: String(form.name),
      productItemId: String(form.productItemId),
      minLevel: number("minLevel"),
      energyCost: number("energyCost"),
      xpReward: number("xpReward"),
      iconUrl: String(form.iconUrl ?? "") || null
    };
  }
  if (section === "profiles") {
    return {
      userId: String(form.userId),
      level: number("level"),
      xp: number("xp"),
      energy: number("energy"),
      maxEnergy: number("maxEnergy"),
      coins: number("coins"),
      gems: number("gems")
    };
  }
  if (section === "inventory") {
    return { userId: String(form.userId), itemId: String(form.itemId), quantity: number("quantity") };
  }
  if (section === "marketplace") {
    return {
      id: String(form.id || "") || undefined,
      sellerId: String(form.sellerId),
      itemId: String(form.itemId),
      quantity: number("quantity"),
      coinPrice: number("coinPrice")
    };
  }
  return {
    id: String(form.id),
    username: String(form.username),
    email: String(form.email),
    isAdmin: Boolean(form.isAdmin)
  };
}

function AdminForm({
  section,
  data,
  form,
  setForm,
  iconFile,
  setIconFile
}: {
  section: AdminSection;
  data: AdminSnapshot | null;
  form: Record<string, string | boolean>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string | boolean>>>;
  iconFile: File | null;
  setIconFile: (file: File | null) => void;
}) {
  const setValue = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const text = (key: string, label: string, type = "text") => (
    <label className="grid gap-1 text-sm font-bold text-stone-600">
      {label}
      <input
        className="min-h-10 rounded-md border border-stone-200 bg-white px-3 text-stone-900 outline-none focus:border-emerald-500"
        type={type}
        value={String(form[key] ?? "")}
        onChange={(event) => setValue(key, event.target.value)}
      />
    </label>
  );
  const select = (key: string, label: string, options: string[]) => (
    <label className="grid gap-1 text-sm font-bold text-stone-600">
      {label}
      <select
        className="min-h-10 rounded-md border border-stone-200 bg-white px-3 text-stone-900 outline-none focus:border-emerald-500"
        value={String(form[key] ?? "")}
        onChange={(event) => setValue(key, event.target.value)}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
  const checkbox = (key: string, label: string) => (
    <label className="flex min-h-10 items-center gap-3 rounded-md border border-stone-200 bg-white px-3 text-sm font-bold text-stone-700">
      <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setValue(key, event.target.checked)} />
      {label}
    </label>
  );
  const textarea = (key: string, label: string) => (
    <label className="grid gap-1 text-sm font-bold text-stone-600 md:col-span-2">
      {label}
      <textarea
        className="min-h-24 rounded-md border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-900 outline-none focus:border-emerald-500"
        value={String(form[key] ?? "")}
        onChange={(event) => setValue(key, event.target.value)}
      />
    </label>
  );
  const iconUpload = ["items", "buildings", "animals"].includes(section) ? (
    <div className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 md:col-span-2">
      <span className="text-sm font-black text-stone-800">
        {section === "items" ? "Item icon file upload" : section === "buildings" ? "Building icon file upload" : "Animal icon file upload"}
      </span>
      {form.iconUrl && <img className="size-16 rounded-md border border-stone-200 object-cover" src={assetUrl(String(form.iconUrl))} alt="" />}
      <input
        className="block w-full rounded-md border border-stone-200 bg-white p-2 text-sm font-semibold text-stone-700"
        type="file"
        accept="image/*"
        onChange={(event) => setIconFile(event.target.files?.[0] ?? null)}
      />
      <span className="text-xs font-semibold text-stone-500">
        {iconFile ? `Selected: ${iconFile.name}` : "Choose an image file, then click Save."}
      </span>
    </div>
  ) : null;

  const userOptions = data?.users.map((user) => user.id) ?? [];
  const itemOptions = data?.items.map((item) => item.id) ?? [];

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {section === "items" && (
        <>
          {text("id", "ID")}
          {text("name", "Name")}
          {select("category", "Category", ["seed", "crop", "food", "animal", "animal_product", "material", "tool", "clothing"])}
          {text("minLevel", "Minimum Level", "number")}
          {checkbox("tradable", "Tradable")}
          {checkbox("sellable", "Sellable")}
          {text("energyRestore", "Energy Restore", "number")}
          {text("iconUrl", "Icon URL")}
          {iconUpload}
        </>
      )}
      {section === "recipes" && (
        <>
          {text("id", "ID")}
          {text("name", "Name")}
          {select("buildingType", "Building Type", ["bakery", "restaurant", "factory", "barn", "field"])}
          {text("minLevel", "Minimum Level", "number")}
          {text("energyCost", "Energy Cost", "number")}
          {text("xpReward", "XP Reward", "number")}
          {checkbox("createdByAdmin", "Created By Admin")}
          {textarea("ingredients", "Ingredients JSON")}
          {textarea("outputs", "Outputs JSON")}
        </>
      )}
      {section === "buildings" && (
        <>
          {text("id", "ID")}
          {text("name", "Name")}
          {select("type", "Type", ["bakery", "restaurant", "factory", "barn", "field"])}
          {text("minLevel", "Minimum Level", "number")}
          {text("coinCost", "Coin Cost", "number")}
          {text("gemCost", "Gem Cost", "number")}
          {text("iconUrl", "Icon URL")}
          {iconUpload}
        </>
      )}
      {section === "animals" && (
        <>
          {text("id", "ID")}
          {text("name", "Name")}
          {select("productItemId", "Product Item", itemOptions)}
          {text("minLevel", "Minimum Level", "number")}
          {text("energyCost", "Energy Cost", "number")}
          {text("xpReward", "XP Reward", "number")}
          {text("iconUrl", "Icon URL")}
          {iconUpload}
        </>
      )}
      {section === "users" && (
        <>
          {select("id", "User", userOptions)}
          {text("username", "Username")}
          {text("email", "Email")}
          {checkbox("isAdmin", "Admin")}
        </>
      )}
      {section === "profiles" && (
        <>
          {select("userId", "User", userOptions)}
          {text("level", "Level", "number")}
          {text("xp", "XP", "number")}
          {text("energy", "Energy", "number")}
          {text("maxEnergy", "Max Energy", "number")}
          {text("coins", "Coins", "number")}
          {text("gems", "Gems", "number")}
        </>
      )}
      {section === "inventory" && (
        <>
          {select("userId", "User", userOptions)}
          {select("itemId", "Item", itemOptions)}
          {text("quantity", "Quantity", "number")}
        </>
      )}
      {section === "marketplace" && (
        <>
          {text("id", "ID")}
          {select("sellerId", "Seller", userOptions)}
          {select("itemId", "Item", itemOptions)}
          {text("quantity", "Quantity", "number")}
          {text("coinPrice", "Coin Price", "number")}
        </>
      )}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-stone-950">{title}</h2>
        <p className="mt-1 text-sm font-medium text-stone-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  tone: "amber" | "rose" | "yellow" | "sky";
}) {
  const tones = {
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    yellow: "bg-yellow-100 text-yellow-700",
    sky: "bg-sky-100 text-sky-700"
  };

  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`grid size-9 place-items-center rounded-md ${tones[tone]}`}>
          <Icon size={18} />
        </span>
        <span className="text-sm font-semibold text-stone-500">{label}</span>
      </div>
      <strong className="text-sm font-black text-stone-900">{value}</strong>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md bg-stone-50 px-3 py-2 text-sm">
      <span className="font-semibold text-stone-500">{label}</span>
      <strong className="text-right font-black text-stone-800">{value}</strong>
    </div>
  );
}

function Progress({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-stone-100" aria-label="progress">
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

function EntityIcon({
  iconUrl,
  fallback,
  compact = false
}: {
  iconUrl?: string | null;
  fallback: React.ReactNode;
  compact?: boolean;
}) {
  const sizeClass = compact ? "size-8" : "size-12";
  if (iconUrl) {
    return <img className={`${sizeClass} rounded-md border border-stone-200 bg-white object-cover`} src={assetUrl(iconUrl)} alt="" />;
  }
  return <span className={`grid ${sizeClass} place-items-center rounded-md bg-emerald-100 text-emerald-800`}>{fallback}</span>;
}

function Inventory({
  inventory,
  items,
  onEat
}: {
  inventory: InventoryEntry[];
  items: GameItem[];
  onEat: (itemId: string) => void;
}) {
  return (
    <section className="flex min-h-16 flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white/90 p-3 shadow-sm">
      <span className="grid size-9 place-items-center rounded-md bg-emerald-100 text-emerald-800">
        <Package size={18} />
      </span>
      {inventory.map((entry) => (
        <span
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700"
          key={entry.itemId}
        >
          {itemById(items, entry.itemId)?.iconUrl && (
            <img className="size-5 rounded object-cover" src={assetUrl(itemById(items, entry.itemId)?.iconUrl)} alt="" />
          )}
          {itemName(items, entry.itemId)} <strong className="ml-1 text-stone-950">{entry.quantity}</strong>
        </span>
      ))}
      {inventory
        .filter((entry) => items.find((item) => item.id === entry.itemId)?.category === "food")
        .map((entry) => (
          <button className={buttonClass} key={`eat-${entry.itemId}`} onClick={() => onEat(entry.itemId)}>
            <Salad size={16} />
            Eat {itemName(items, entry.itemId)}
          </button>
        ))}
    </section>
  );
}
