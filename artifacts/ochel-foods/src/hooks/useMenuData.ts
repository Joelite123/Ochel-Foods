import { useState, useEffect } from "react";
import {
  type Product,
  type Category,
  pizzaProducts,
  burgerProducts,
  fingerFoodProducts,
  drinkProducts,
  pastryProducts,
  bakedGoodiesProducts,
  allProducts as staticAllProducts,
  categories as staticCategories,
} from "@/data/menuData";

const API_BASE = "/api";

type DBProduct = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  base_price: number;
  image_url: string | null;
  sizes: { label: string; description?: string; price: number }[] | null;
  extras: { name: string; price: number }[] | null;
  ingredients: string[] | null;
  tag: string | null;
  note: string | null;
  sort_order: number;
};

type DBCategory = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  color: string;
  sort_order: number;
};

function dbProductToProduct(p: DBProduct, categorySlug: string): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: categorySlug,
    imageUrl: p.image_url || "",
    basePrice: p.base_price,
    sizes: p.sizes ?? undefined,
    extras: p.extras ?? undefined,
    ingredients: p.ingredients ?? undefined,
    tag: p.tag ?? undefined,
    note: p.note ?? undefined,
  };
}

function dbCategoryToCategory(c: DBCategory): Category {
  const slug = c.slug.startsWith("/") ? c.slug : `/${c.slug}`;
  return {
    id: c.id,
    name: c.name,
    slug,
    imageUrl: c.image_url || "",
    color: c.color,
  };
}

export type MenuState = {
  loading: boolean;
  products: Product[];
  categories: Category[];
  byCategory: (categorySlug: string) => Product[];
};

let cachedProducts: Product[] | null = null;
let cachedCategories: Category[] | null = null;
let fetchPromise: Promise<void> | null = null;

async function fetchMenuData() {
  try {
    const res = await fetch(`${API_BASE}/menu`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as { categories: DBCategory[]; products: DBProduct[] };

    const { categories: dbCats, products: dbProds } = json;

    if (dbCats?.length > 0 && dbProds?.length > 0) {
      // catMap: category_id → bare slug without leading slash
      const catMap: Record<string, string> = {};
      dbCats.forEach((c) => { catMap[c.id] = c.slug.replace(/^\//, ""); });

      cachedCategories = dbCats.map(dbCategoryToCategory);
      cachedProducts = dbProds.map((p) =>
        dbProductToProduct(p, catMap[p.category_id] || p.category_id)
      );
      return;
    }
  } catch {
    // fall through to static data
  }

  // Fallback to static data when API unavailable
  cachedCategories = staticCategories.map((c) => ({ ...c }));
  cachedProducts = staticAllProducts;
}

export function useMenuData(): MenuState {
  const [loading, setLoading] = useState(!cachedProducts);
  const [products, setProducts] = useState<Product[]>(cachedProducts ?? staticAllProducts);
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? staticCategories);

  useEffect(() => {
    if (cachedProducts) {
      setProducts(cachedProducts);
      setCategories(cachedCategories!);
      setLoading(false);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = fetchMenuData().finally(() => { fetchPromise = null; });
    }
    fetchPromise.then(() => {
      setProducts(cachedProducts!);
      setCategories(cachedCategories!);
      setLoading(false);
    });
  }, []);

  const byCategory = (slug: string) => products.filter((p) => p.category === slug);

  return { loading, products, categories, byCategory };
}

export function invalidateMenuCache() {
  cachedProducts = null;
  cachedCategories = null;
}

export const staticProductsByCategory: Record<string, Product[]> = {
  pizza: pizzaProducts,
  burgers: burgerProducts,
  "finger-foods": fingerFoodProducts,
  drinks: drinkProducts,
  pastries: pastryProducts,
  "baked-goodies": bakedGoodiesProducts,
};
