import pizzaImg from "@/assets/pizza.png";
import burgerImg from "@/assets/burger.png";
import shawarmaImg from "@/assets/shawarma.png";
import fingerFoodsImg from "@/assets/finger-foods.png";
import pastriesImg from "@/assets/pastries.png";
import donutsImg from "@/assets/donuts.png";
import bananaBreadImg from "@/assets/banana-bread.png";

export type ProductSize = {
  label: string;
  description?: string;
  price: number;
};

export type ProductExtra = {
  name: string;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  basePrice: number;
  sizes?: ProductSize[];
  extras?: ProductExtra[];
  note?: string;
  tag?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  color: string;
};

export const categories: Category[] = [
  { id: "pizza", name: "Pizza", slug: "/pizza", imageUrl: pizzaImg, color: "#E8192C" },
  { id: "burgers", name: "Burgers & Wraps", slug: "/burgers", imageUrl: burgerImg, color: "#FF6B35" },
  { id: "shawarma", name: "Shawarma", slug: "/shawarma", imageUrl: shawarmaImg, color: "#FFB800" },
  { id: "finger-foods", name: "Finger Foods", slug: "/finger-foods", imageUrl: fingerFoodsImg, color: "#E8192C" },
  { id: "pastries", name: "Pastries", slug: "/pastries", imageUrl: pastriesImg, color: "#FF6B35" },
  { id: "baked-goodies", name: "Baked Goodies", slug: "/baked-goodies", imageUrl: bananaBreadImg, color: "#FFB800" },
];

export const pizzaExtras: ProductExtra[] = [
  { name: "Extra Cheese", price: 1000 },
  { name: "Extra Toppings", price: 1000 },
];

export const pizzaProducts: Product[] = [
  {
    id: "pizza-1",
    name: "Chicken Sauté Pizza",
    description: "Sautéed Chicken, sausage, BBQ sauce, and green capsicum on our signature crust.",
    category: "pizza",
    imageUrl: pizzaImg,
    basePrice: 7500,
    sizes: [
      { label: "Small", description: "8 inches", price: 7500 },
      { label: "Medium", description: "10 inches", price: 8000 },
      { label: "Large", description: "12 inches", price: 9500 },
    ],
    extras: pizzaExtras,
    tag: "Popular",
  },
  {
    id: "pizza-2",
    name: "Beefy Sensation Pizza",
    description: "Juicy beef, red bonnet pepper, and green capsicum — bold and fiery on every bite.",
    category: "pizza",
    imageUrl: pizzaImg,
    basePrice: 7500,
    sizes: [
      { label: "Small", description: "8 inches", price: 7500 },
      { label: "Medium", description: "10 inches", price: 8000 },
      { label: "Large", description: "12 inches", price: 9500 },
    ],
    extras: pizzaExtras,
  },
  {
    id: "pizza-3",
    name: "Suya Pizza",
    description: "Suya (Mutton), authentic Suya Spice, and green capsicum — Nigerian flavors on a pizza!",
    category: "pizza",
    imageUrl: pizzaImg,
    basePrice: 7500,
    sizes: [
      { label: "Small", description: "8 inches", price: 7500 },
      { label: "Medium", description: "10 inches", price: 8000 },
      { label: "Large", description: "12 inches", price: 9500 },
    ],
    extras: pizzaExtras,
    tag: "Signature",
  },
  {
    id: "pizza-4",
    name: "Half & Half Pizza",
    description: "Can't decide? Get two flavors in one — Chicken Sauté meets Beefy Sensation or Suya halves.",
    category: "pizza",
    imageUrl: pizzaImg,
    basePrice: 8000,
    sizes: [
      { label: "Small", description: "8 inches", price: 8000 },
      { label: "Medium", description: "10 inches", price: 8500 },
      { label: "Large", description: "12 inches", price: 10000 },
    ],
    extras: pizzaExtras,
    tag: "Best Value",
  },
];

export const burgerProducts: Product[] = [
  {
    id: "burger-1",
    name: "Crispy Chicken Burger",
    description: "Juicy burger bun, creamy sauce, crispy golden chicken & fresh lettuce.",
    category: "burgers",
    imageUrl: burgerImg,
    basePrice: 2700,
    extras: [
      { name: "Extra Chicken", price: 2000 },
      { name: "Extra Ketchup", price: 300 },
    ],
    tag: "Popular",
  },
  {
    id: "burger-2",
    name: "Classic Cheeseburger",
    description: "Burger bun, creamy sauce, Crispy Chicken, Cheddar cheese slice & lettuce.",
    category: "burgers",
    imageUrl: burgerImg,
    basePrice: 3500,
    extras: [
      { name: "Extra Cheese", price: 500 },
      { name: "Extra Chicken", price: 2000 },
    ],
  },
  {
    id: "burger-3",
    name: "Creamy Shawarma Wrap",
    description: "2 shawarma bread, Chicken, Beef, 2 Sausages & Veggies — loaded and satisfying.",
    category: "burgers",
    imageUrl: shawarmaImg,
    basePrice: 3500,
    extras: [
      { name: "Extra Sausage", price: 500 },
      { name: "Extra Sauce", price: 200 },
    ],
    tag: "Filling",
  },
];

export const shawarmaProducts: Product[] = [
  {
    id: "shawarma-1",
    name: "Chicken Shawarma",
    description: "Tender grilled chicken, fresh veggies, and our signature garlic sauce wrapped in warm bread.",
    category: "shawarma",
    imageUrl: shawarmaImg,
    basePrice: 2500,
    extras: [
      { name: "Extra Sauce", price: 200 },
      { name: "Extra Veggies", price: 300 },
    ],
    tag: "Popular",
  },
  {
    id: "shawarma-2",
    name: "Beef Shawarma",
    description: "Seasoned beef strips, fresh crunchy veggies, garlic sauce in warm pita bread.",
    category: "shawarma",
    imageUrl: shawarmaImg,
    basePrice: 2800,
    extras: [
      { name: "Extra Sauce", price: 200 },
      { name: "Extra Beef", price: 500 },
    ],
  },
  {
    id: "shawarma-3",
    name: "Mixed Shawarma",
    description: "The best of both worlds — chicken and beef combination with fresh veggies and sauce.",
    category: "shawarma",
    imageUrl: shawarmaImg,
    basePrice: 3200,
    extras: [
      { name: "Extra Sauce", price: 200 },
      { name: "Extra Protein", price: 700 },
    ],
    tag: "Best Seller",
  },
  {
    id: "shawarma-4",
    name: "XL Shawarma Wrap",
    description: "Double portion — chicken, beef, 2 sausages, extra veggies and sauce. For the hungry ones.",
    category: "shawarma",
    imageUrl: shawarmaImg,
    basePrice: 4500,
    extras: [
      { name: "Extra Sausage", price: 500 },
      { name: "Extra Sauce", price: 200 },
    ],
    tag: "XL",
  },
];

export const fingerFoodProducts: Product[] = [
  {
    id: "ff-1",
    name: "Crispy Chicken & Chips",
    description: "1 Crunchy Chicken, Crispy Chips, and 1 ketchup. The perfect combo.",
    category: "finger-foods",
    imageUrl: fingerFoodsImg,
    basePrice: 4000,
    extras: [
      { name: "Extra Chicken", price: 2000 },
      { name: "Extra Chips", price: 1500 },
      { name: "Extra Ketchup", price: 300 },
    ],
    tag: "Popular",
  },
  {
    id: "ff-2",
    name: "Crunchy Fried Chicken",
    description: "2 crunchy golden chickens and 1 ketchup. Double the crunch, double the love.",
    category: "finger-foods",
    imageUrl: fingerFoodsImg,
    basePrice: 3500,
    extras: [
      { name: "Extra Chicken", price: 2000 },
      { name: "Extra Ketchup", price: 300 },
    ],
  },
  {
    id: "ff-3",
    name: "Tigernut Drink",
    description: "Refreshing blend of Tigernuts, Coconut, and Ginger. Creamy and naturally sweet.",
    category: "finger-foods",
    imageUrl: fingerFoodsImg,
    basePrice: 2000,
  },
  {
    id: "ff-4",
    name: "Fruity Zobo Drink",
    description: "Roselle, Pineapple, Watermelon, Cucumber, Herbs & Spices. A refreshing Nigerian classic.",
    category: "finger-foods",
    imageUrl: fingerFoodsImg,
    basePrice: 500,
    tag: "Refreshing",
  },
  {
    id: "ff-combo-1",
    name: "Combo 1 — Burger + Chicken + Chips",
    description: "Burger + Crispy Chicken + Chips. The ultimate value meal.",
    category: "finger-foods",
    imageUrl: fingerFoodsImg,
    basePrice: 7300,
    tag: "Combo",
  },
  {
    id: "ff-combo-2",
    name: "Combo 2 — Burger + Chicken + Chips + Drink",
    description: "Burger + Crispy Chicken + Chips + Tigernut Drink. Full meal deal.",
    category: "finger-foods",
    imageUrl: fingerFoodsImg,
    basePrice: 9300,
    tag: "Combo",
  },
  {
    id: "ff-combo-3",
    name: "Combo 3 — Shawarma + Drink",
    description: "Shawarma + Tigernut Drink. A classic pairing done right.",
    category: "finger-foods",
    imageUrl: fingerFoodsImg,
    basePrice: 5300,
    tag: "Combo",
  },
  {
    id: "ff-combo-4",
    name: "Combo 4 — Chicken & Chips + Drink",
    description: "Chicken and Chips + Tigernut Drink. Crispy satisfaction.",
    category: "finger-foods",
    imageUrl: fingerFoodsImg,
    basePrice: 5800,
    tag: "Combo",
  },
  {
    id: "ff-combo-5",
    name: "Combo 5 — Burger + Drink",
    description: "Burger + Tigernut Drink. Simple, satisfying and delicious.",
    category: "finger-foods",
    imageUrl: fingerFoodsImg,
    basePrice: 5300,
    tag: "Combo",
  },
];

export const pastryProducts: Product[] = [
  {
    id: "pastry-smallchops-s",
    name: "Small Chops Pack S",
    description: "3 Springrolls, 3 Samosas, 1 Crispy Chicken, & 4 puffs. Perfect starter pack.",
    category: "pastries",
    imageUrl: pastriesImg,
    basePrice: 4000,
    extras: [
      { name: "Springroll", price: 400 },
      { name: "Samosa", price: 400 },
      { name: "Corn Dog", price: 500 },
      { name: "Crispy Chicken", price: 1500 },
      { name: "Beef Roll", price: 500 },
      { name: "Puff Puff", price: 100 },
      { name: "Ketchup", price: 300 },
    ],
    tag: "Small Pack",
  },
  {
    id: "pastry-smallchops-m",
    name: "Small Chops Pack M",
    description: "5 Springrolls, 5 Samosas, 2 Crispy Chickens, & 10 puffs. Great for sharing.",
    category: "pastries",
    imageUrl: pastriesImg,
    basePrice: 7000,
    extras: [
      { name: "Springroll", price: 400 },
      { name: "Samosa", price: 400 },
      { name: "Corn Dog", price: 500 },
      { name: "Crispy Chicken", price: 1500 },
      { name: "Puff Puff", price: 100 },
      { name: "Ketchup", price: 300 },
    ],
    tag: "Medium Pack",
  },
  {
    id: "pastry-smallchops-l",
    name: "Small Chops Pack L",
    description: "12 Springrolls, 12 Samosas, 2 Crispy Chickens, 5 Corndogs, & 20 puffs. Party ready!",
    category: "pastries",
    imageUrl: pastriesImg,
    basePrice: 14000,
    extras: [
      { name: "Springroll", price: 400 },
      { name: "Samosa", price: 400 },
      { name: "Corn Dog", price: 500 },
      { name: "Crispy Chicken", price: 1500 },
      { name: "Puff Puff", price: 100 },
      { name: "Ketchup", price: 300 },
    ],
    tag: "Party Pack",
  },
  {
    id: "pastry-donut-plain",
    name: "Plain Donuts",
    description: "Classic golden donuts, perfectly fried. Minimum order of 20 pieces.",
    category: "pastries",
    imageUrl: donutsImg,
    basePrice: 400,
    note: "MOQ: 20 pieces. Orders above 50 pieces get 5% discount.",
  },
  {
    id: "pastry-donut-jam",
    name: "Jam Filled Donuts",
    description: "Soft donuts bursting with jam filling. A sweet surprise every bite. MOQ 20 pieces.",
    category: "pastries",
    imageUrl: donutsImg,
    basePrice: 500,
    note: "MOQ: 20 pieces. Orders above 50 pieces get 5% discount.",
    tag: "Fan Favorite",
  },
  {
    id: "pastry-donut-choc",
    name: "Chocolate Filled Donuts",
    description: "Rich chocolate filling inside our fluffy golden donuts. Pure indulgence. MOQ 20 pieces.",
    category: "pastries",
    imageUrl: donutsImg,
    basePrice: 600,
    note: "MOQ: 20 pieces. Orders above 50 pieces get 5% discount.",
  },
  {
    id: "pastry-donut-kwabaegi",
    name: "Kwabaegi",
    description: "Korean twisted donuts — chewy, golden, and utterly addictive. MOQ 20 pieces.",
    category: "pastries",
    imageUrl: donutsImg,
    basePrice: 500,
    note: "MOQ: 20 pieces. Orders above 50 pieces get 5% discount.",
    tag: "Trending",
  },
  {
    id: "pastry-meatpie",
    name: "Meatpie (Bulk)",
    description: "Flaky pastry shells filled with seasoned minced meat. Bulk orders only. MOQ 20 pieces.",
    category: "pastries",
    imageUrl: pastriesImg,
    basePrice: 1500,
    note: "Bulk orders: MOQ of 20 pieces. Entitled to 5% discount above 50 pieces.",
  },
];

export const bakedGoodiesProducts: Product[] = [
  {
    id: "baked-1",
    name: "Double Choc Banana Bread",
    description: "Chocolate chunks, Chocolate Chips, & Creamy Banana Bread batter. Decadent and moist.",
    category: "baked-goodies",
    imageUrl: bananaBreadImg,
    basePrice: 1500,
    sizes: [
      { label: "Single Mini Loaf", price: 1500 },
      { label: "Set of 2 Mini Loaves", price: 2500 },
      { label: "Set of 4 Mini Loaves", price: 5000 },
    ],
    tag: "Popular",
  },
  {
    id: "baked-2",
    name: "Coconut Flaked Banana Bread",
    description: "Butter Toasted Coconut Flakes & Creamy Banana Bread Batter. Tropical and fragrant.",
    category: "baked-goodies",
    imageUrl: bananaBreadImg,
    basePrice: 1500,
    sizes: [
      { label: "Single Mini Loaf", price: 1500 },
      { label: "Set of 2 Mini Loaves", price: 2500 },
      { label: "Set of 4 Mini Loaves", price: 5000 },
    ],
  },
  {
    id: "baked-3",
    name: "Nutty Banana Bread",
    description: "Candied Cashew Nuts, Cinnamon & Creamy Banana Bread Batter. Crunchy, warm and cozy.",
    category: "baked-goodies",
    imageUrl: bananaBreadImg,
    basePrice: 1500,
    sizes: [
      { label: "Single Mini Loaf", price: 1500 },
      { label: "Set of 2 Mini Loaves", price: 2500 },
      { label: "Set of 4 Mini Loaves", price: 5000 },
    ],
    tag: "Signature",
  },
  {
    id: "baked-4",
    name: "Mixed Set Banana Bread",
    description: "Dark Chocolate & Creamy Banana Bread Batter in a mixed variety set. Best way to try them all.",
    category: "baked-goodies",
    imageUrl: bananaBreadImg,
    basePrice: 3000,
    sizes: [
      { label: "Set of 2 Mini Loaves", price: 3000 },
      { label: "Set of 4 Mini Loaves", price: 6000 },
    ],
    tag: "Best Value",
  },
];

export const allProducts: Product[] = [
  ...pizzaProducts,
  ...burgerProducts,
  ...shawarmaProducts,
  ...fingerFoodProducts,
  ...pastryProducts,
  ...bakedGoodiesProducts,
];

export const featuredProducts: Product[] = [
  pizzaProducts[0],
  pizzaProducts[2],
  burgerProducts[0],
  burgerProducts[1],
  shawarmaProducts[2],
  fingerFoodProducts[0],
  pastryProducts[1],
  bakedGoodiesProducts[0],
];

export function formatPrice(price: number): string {
  return `₦${price.toLocaleString()}`;
}
