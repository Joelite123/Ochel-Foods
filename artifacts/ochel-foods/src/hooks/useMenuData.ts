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
import { supabase } from "@/lib/supabase";

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
    const [catsResult, prodsResult] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("products").select("*").eq("is_available", true).order("sort_order"),
    ]);

    const dbCats = catsResult.data as DBCategory[] | null;
    const dbProds = prodsResult.data as DBProduct[] | null;

    if (dbCats && dbCats.length > 0 && dbProds && dbProds.length > 0) {
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
