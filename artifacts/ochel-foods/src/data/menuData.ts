import pizzaImg from "@/assets/pizza.png";
import burgerImg from "@/assets/burger.png";
import shawarmaImg from "@/assets/shawarma.png";
import fingerFoodsImg from "@/assets/finger-foods.png";
import pastriesImg from "@/assets/pastries.png";
import donutsImg from "@/assets/donuts.png";
import bananaBreadImg from "@/assets/banana-bread.png";

// Real food photos (background removed)
import pizzettaImg from "@/assets/pizzetta.png";
import chickenSautePizzaImg from "@/assets/chicken-saute-pizza-real.jpg";
import beefPizzaImg from "@/assets/beef-pizza-real.jpg";
import suyaPizzaImg from "@/assets/suya-pizza-real.jpg";
import cheeseburgerImg from "@/assets/cheeseburger-real2.jpg";
import shawarmaRealImg from "@/assets/shawarma-real2.jpg";
import chickenAndChipsImg from "@/assets/chicken-and-chips-real.jpg";
import tigernuttImg from "@/assets/tigernut-drink.png";
import smallChopsImg from "@/assets/small-chops-real.jpg";

export type ProductSize = {
  label: string;
  description?: string;
  price: number;
};

export type ProductExtra = {
  name: string;
  price: number;
};

export type ProductCrust = {
  label: string;
  priceAdd: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  basePrice: number;
  sizes?: ProductSize[];
  crusts?: ProductCrust[];
  extras?: ProductExtra[];
  ingredients?: string[];
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
  { id: "finger-foods", name: "Finger Foods", slug: "/finger-foods", imageUrl: fingerFoodsImg, color: "#E8192C" },
  { id: "drinks", name: "Drinks", slug: "/drinks", imageUrl: tigernuttImg, color: "#0066CC" },
  { id: "pastries", name: "Pastries", slug: "/pastries", imageUrl: pastriesImg, color: "#FF6B35" },
  { id: "baked-goodies", name: "Baked Goodies", slug: "/baked-goodies", imageUrl: bananaBreadImg, color: "#FFB800" },
];

const pizzaExtras: ProductExtra[] = [
  { name: "Extra Cheese", price: 1000 },
  { name: "Extra Toppings", price: 1000 },
];

const pizzaCrusts: ProductCrust[] = [
  { label: "Thick", priceAdd: 0 },
  { label: "Thin", priceAdd: 0 },
];

export const pizzaProducts: Product[] = [
  {
    id: "pizza-1",
    name: "Chicken Sauté Pizza",
    description: "Sautéed Chicken, sausage, BBQ sauce, and green capsicum on our signature crust.",
    category: "pizza",
    imageUrl: chickenSautePizzaImg,
    basePrice: 7500,
    sizes: [
      { label: "Small", description: "8 inches", price: 7500 },
      { label: "Medium", description: "10 inches", price: 8000 },
      { label: "Large", description: "12 inches", price: 9500 },
    ],
    crusts: pizzaCrusts,
    extras: pizzaExtras,
    ingredients: ["Pizza Dough", "Tomato Sauce", "Mozzarella", "Sautéed Chicken", "Sausage", "BBQ Sauce", "Green Capsicum"],
    tag: "Popular",
  },
  {
    id: "pizza-2",
    name: "Beefy Sensation Pizza",
    description: "Juicy beef, red bonnet pepper, and green capsicum — bold and fiery on every bite.",
    category: "pizza",
    imageUrl: beefPizzaImg,
    basePrice: 7500,
    sizes: [
      { label: "Small", description: "8 inches", price: 7500 },
      { label: "Medium", description: "10 inches", price: 8000 },
      { label: "Large", description: "12 inches", price: 9500 },
    ],
    crusts: pizzaCrusts,
    extras: pizzaExtras,
    ingredients: ["Pizza Dough", "Tomato Sauce", "Mozzarella", "Beef", "Red Bonnet Pepper", "Green Capsicum"],
  },
  {
    id: "pizza-3",
    name: "Suya Pizza",
    description: "Suya (Mutton), authentic Suya Spice, and green capsicum — savory street flavors on a pizza!",
    category: "pizza",
    imageUrl: suyaPizzaImg,
    basePrice: 7500,
    sizes: [
      { label: "Small", description: "8 inches", price: 7500 },
      { label: "Medium", description: "10 inches", price: 8000 },
      { label: "Large", description: "12 inches", price: 9500 },
    ],
    crusts: pizzaCrusts,
    extras: pizzaExtras,
    ingredients: ["Pizza Dough", "Tomato Sauce", "Mozzarella", "Suya (Mutton)", "Suya Spice", "Green Capsicum"],
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
    crusts: pizzaCrusts,
    extras: pizzaExtras,
    ingredients: ["Pizza Dough", "Tomato Sauce", "Mozzarella", "Chicken", "Beef", "BBQ Sauce", "Suya Spice", "Green Capsicum"],
    tag: "Best Value",
  },
  {
    id: "pizza-5",
    name: "Pizzetta",
    description: "A personal-sized pizza — crispy thin base, rich tomato sauce, mozzarella, and your choice of toppings. Perfect for one.",
    category: "pizza",
    imageUrl: pizzettaImg,
    basePrice: 5500,
    sizes: [
      { label: "Personal", description: "6 inches", price: 5500 },
      { label: "Small", description: "8 inches", price: 7000 },
    ],
    crusts: pizzaCrusts,
    extras: pizzaExtras,
    ingredients: ["Pizza Dough", "Tomato Sauce", "Mozzarella", "Green Capsicum", "Sausage"],
    tag: "New",
  },
];

export const burgerProducts: Product[] = [
  {
    id: "burger-1",
    name: "Crispy Chicken Burger",
    description: "Juicy burger bun, creamy sauce, crispy golden chicken & fresh lettuce.",
    category: "burgers",
    imageUrl: cheeseburgerImg,
    basePrice: 2700,
    extras: [
      { name: "Extra Chicken", price: 2000 },
      { name: "Extra Ketchup", price: 300 },
    ],
    ingredients: ["Burger Bun", "Crispy Chicken", "Creamy Sauce", "Lettuce"],
    tag: "Popular",
  },
  {
    id: "burger-2",
    name: "Classic Cheeseburger",
    description: "Burger bun, creamy sauce, Crispy Chicken, Cheddar cheese slice & lettuce.",
    category: "burgers",
    imageUrl: cheeseburgerImg,
    basePrice: 3500,
    extras: [
      { name: "Extra Cheese", price: 500 },
      { name: "Extra Chicken", price: 2000 },
    ],
    ingredients: ["Burger Bun", "Crispy Chicken", "Creamy Sauce", "Cheddar Cheese", "Lettuce"],
  },
  {
    id: "burger-3",
    name: "Creamy Shawarma Wrap",
    description: "2 shawarma bread, Chicken, Beef, 2 Sausages & Veggies — loaded and satisfying.",
    category: "burgers",
    imageUrl: shawarmaRealImg,
    basePrice: 3500,
    extras: [
      { name: "Extra Sausage", price: 500 },
      { name: "Extra Sauce", price: 200 },
    ],
    ingredients: ["Shawarma Bread", "Chicken", "Beef", "Sausage", "Mixed Veggies", "Creamy Sauce"],
    tag: "Filling",
  },
];


export const fingerFoodProducts: Product[] = [
  {
    id: "ff-1",
    name: "Crispy Chicken & Chips",
    description: "1 Crunchy Chicken, Crispy Chips, and 1 ketchup. The perfect combo.",
    category: "finger-foods",
    imageUrl: chickenAndChipsImg,
    basePrice: 4000,
    extras: [
      { name: "Extra Chicken", price: 2000 },
      { name: "Extra Chips", price: 1500 },
      { name: "Extra Ketchup", price: 300 },
    ],
    ingredients: ["Crunchy Chicken", "Crispy Chips", "Ketchup"],
    tag: "Popular",
  },
  {
    id: "ff-2",
    name: "Crunchy Fried Chicken",
    description: "2 crunchy golden chickens and 1 ketchup. Double the crunch, double the love.",
    category: "finger-foods",
    imageUrl: chickenAndChipsImg,
    basePrice: 3500,
    extras: [
      { name: "Extra Chicken", price: 2000 },
      { name: "Extra Ketchup", price: 300 },
    ],
    ingredients: ["Crunchy Fried Chicken (x2)", "Ketchup"],
  },
];

export const drinkProducts: Product[] = [
  {
    id: "drink-1",
    name: "Tigernut Drink",
    description: "Refreshing blend of Tigernuts, Coconut, and Ginger. Creamy and naturally sweet.",
    category: "drinks",
    imageUrl: tigernuttImg,
    basePrice: 2000,
    ingredients: ["Tigernuts", "Coconut", "Ginger"],
  },
  {
    id: "drink-2",
    name: "Fruity Zobo Drink",
    description: "Roselle, Pineapple, Watermelon, Cucumber, Herbs & Spices. A refreshing classic.",
    category: "drinks",
    imageUrl: tigernuttImg,
    basePrice: 500,
    ingredients: ["Roselle (Zobo leaves)", "Pineapple", "Watermelon", "Cucumber", "Herbs & Spices"],
    tag: "Refreshing",
  },
];

export const pastryProducts: Product[] = [
  {
    id: "pastry-smallchops-s",
    name: "Small Chops Pack S",
    description: "3 Springrolls, 3 Samosas, 1 Crispy Chicken, & 4 puffs. Perfect starter pack.",
    category: "pastries",
    imageUrl: smallChopsImg,
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
    ingredients: ["Springrolls (x3)", "Samosas (x3)", "Crispy Chicken (x1)", "Puff Puff (x4)"],
    tag: "Small Pack",
  },
  {
    id: "pastry-smallchops-m",
    name: "Small Chops Pack M",
    description: "5 Springrolls, 5 Samosas, 2 Crispy Chickens, & 10 puffs. Great for sharing.",
    category: "pastries",
    imageUrl: smallChopsImg,
    basePrice: 7000,
    extras: [
      { name: "Springroll", price: 400 },
      { name: "Samosa", price: 400 },
      { name: "Corn Dog", price: 500 },
      { name: "Crispy Chicken", price: 1500 },
      { name: "Puff Puff", price: 100 },
      { name: "Ketchup", price: 300 },
    ],
    ingredients: ["Springrolls (x5)", "Samosas (x5)", "Crispy Chicken (x2)", "Puff Puff (x10)"],
    tag: "Medium Pack",
  },
  {
    id: "pastry-smallchops-l",
    name: "Small Chops Pack L",
    description: "12 Springrolls, 12 Samosas, 2 Crispy Chickens, 5 Corndogs, & 20 puffs. Party ready!",
    category: "pastries",
    imageUrl: smallChopsImg,
    basePrice: 14000,
    extras: [
      { name: "Springroll", price: 400 },
      { name: "Samosa", price: 400 },
      { name: "Corn Dog", price: 500 },
      { name: "Crispy Chicken", price: 1500 },
      { name: "Puff Puff", price: 100 },
      { name: "Ketchup", price: 300 },
    ],
    ingredients: ["Springrolls (x12)", "Samosas (x12)", "Crispy Chicken (x2)", "Corn Dogs (x5)", "Puff Puff (x20)"],
    tag: "Party Pack",
  },
  {
    id: "pastry-donut-plain",
    name: "Plain Donuts",
    description: "Classic golden donuts, perfectly fried. Minimum order of 20 pieces.",
    category: "pastries",
    imageUrl: donutsImg,
    basePrice: 400,
    ingredients: ["Flour", "Sugar", "Yeast", "Butter", "Eggs", "Milk"],
    note: "MOQ: 20 pieces. Orders above 50 pieces get 5% discount.",
  },
  {
    id: "pastry-donut-jam",
    name: "Jam Filled Donuts",
    description: "Soft donuts bursting with jam filling. A sweet surprise every bite. MOQ 20 pieces.",
    category: "pastries",
    imageUrl: donutsImg,
    basePrice: 500,
    ingredients: ["Flour", "Sugar", "Yeast", "Butter", "Eggs", "Milk", "Jam Filling"],
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
    ingredients: ["Flour", "Sugar", "Yeast", "Butter", "Eggs", "Milk", "Chocolate Filling"],
    note: "MOQ: 20 pieces. Orders above 50 pieces get 5% discount.",
  },
  {
    id: "pastry-donut-kwabaegi",
    name: "Kwabaegi",
    description: "Korean twisted donuts — chewy, golden, and utterly addictive. MOQ 20 pieces.",
    category: "pastries",
    imageUrl: donutsImg,
    basePrice: 500,
    ingredients: ["Flour", "Sugar", "Yeast", "Butter", "Eggs", "Milk"],
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
    ingredients: ["Pastry Crust", "Minced Meat", "Onion", "Carrot", "Potato", "Seasoning"],
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
    ingredients: ["Ripe Banana", "Chocolate Chunks", "Chocolate Chips", "Flour", "Butter", "Sugar", "Eggs", "Vanilla"],
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
    ingredients: ["Ripe Banana", "Butter Toasted Coconut Flakes", "Flour", "Butter", "Sugar", "Eggs", "Vanilla"],
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
    ingredients: ["Ripe Banana", "Candied Cashew Nuts", "Cinnamon", "Flour", "Butter", "Sugar", "Eggs", "Vanilla"],
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
    ingredients: ["Ripe Banana", "Dark Chocolate", "Coconut Flakes", "Cashew Nuts", "Flour", "Butter", "Sugar", "Eggs"],
    tag: "Best Value",
  },
];

// ── COMBO DEALS ─────────────────────────────────────────────────────────────

export type ComboProduct = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  comboPrice: number;
  originalPrice: number;
  includes: string[];
  tag?: string;
};

export const comboDealProducts: ComboProduct[] = [
  {
    id: "combo-1",
    name: "Burger + Chicken + Chips",
    description: "Crispy Chicken Burger with Crunchy Fried Chicken and a portion of chips. The ultimate meal.",
    imageUrl: cheeseburgerImg,
    comboPrice: 7300,
    originalPrice: 7700,
    includes: ["1× Crispy Chicken Burger", "1× Crunchy Fried Chicken", "1× Extra Chips"],
    tag: "Value Deal",
  },
  {
    id: "combo-2",
    name: "Burger + Chicken + Chips + Drink",
    description: "Everything in combo 1, plus a creamy Tigernut Drink. Full meal sorted.",
    imageUrl: cheeseburgerImg,
    comboPrice: 9300,
    originalPrice: 9700,
    includes: ["1× Crispy Chicken Burger", "1× Crunchy Fried Chicken", "1× Extra Chips", "1× Tigernut Drink"],
    tag: "Best Value",
  },
  {
    id: "combo-3",
    name: "Shawarma + Tigernut Drink",
    description: "A loaded Creamy Shawarma Wrap paired with our refreshing Tigernut Drink.",
    imageUrl: shawarmaRealImg,
    comboPrice: 5300,
    originalPrice: 5500,
    includes: ["1× Creamy Shawarma Wrap", "1× Tigernut Drink"],
    tag: "Popular",
  },
  {
    id: "combo-4",
    name: "Chicken & Chips + Tigernut",
    description: "Crispy Chicken & Chips paired with our creamy Tigernut Drink. A classic match.",
    imageUrl: chickenAndChipsImg,
    comboPrice: 5800,
    originalPrice: 6000,
    includes: ["1× Crispy Chicken & Chips", "1× Tigernut Drink"],
    tag: "Fan Fave",
  },
  {
    id: "combo-5",
    name: "Burger + Tigernut Drink",
    description: "A Classic Cheeseburger paired with our creamy Tigernut Drink. Simple and satisfying.",
    imageUrl: cheeseburgerImg,
    comboPrice: 5300,
    originalPrice: 5500,
    includes: ["1× Classic Cheeseburger", "1× Tigernut Drink"],
    tag: "Quick Meal",
  },
];

export const allProducts: Product[] = [
  ...pizzaProducts,
  ...burgerProducts,
  ...fingerFoodProducts,
  ...drinkProducts,
  ...pastryProducts,
  ...bakedGoodiesProducts,
];

export const featuredByCategory = [
  { label: "Pizza", id: "featured-pizza", products: pizzaProducts },
  { label: "Burgers & Wraps", id: "featured-burgers", products: burgerProducts },
  { label: "Finger Foods", id: "featured-finger-foods", products: fingerFoodProducts },
  { label: "Drinks", id: "featured-drinks", products: drinkProducts },
  { label: "Pastries", id: "featured-pastries", products: pastryProducts },
  { label: "Baked Goodies", id: "featured-baked", products: bakedGoodiesProducts },
];

export const DELIVERY_ZONES = [
  { label: "Parakin", price: 700 },
  { label: "Mayfair", price: 800 },
  { label: "Aserifa", price: 1000 },
  { label: "Moremi Estate", price: 1000 },
  { label: "Modomo", price: 1200 },
  { label: "Omole Estate", price: 800 },
  { label: "Baba Oba", price: 1000 },
  { label: "Fasina", price: 1400 },
  { label: "Damico", price: 1100 },
  { label: "Lagere", price: 800 },
  { label: "Maintenance", price: 1000 },
  { label: "Campus", price: 1000 },
  { label: "Campus Hall", price: 1100 },
  { label: "Ọpa", price: 2200 },
  { label: "Quarters", price: 1500 },
  { label: "New Market", price: 1000 },
  { label: "Moree", price: 1500 },
  { label: "Irebami", price: 1600 },
  { label: "Ooni Layout", price: 1100 },
  { label: "Ọranfẹ", price: 1800 },
  { label: "Ajegunle", price: 1600 },
  { label: "Phase 1, OAUTHC", price: 1700 },
  { label: "Nikki Choice filling station, Ondo road", price: 1000 },
  { label: "Aladanla", price: 1800 },
  { label: "Eleweran", price: 1500 },
  { label: "De Gold", price: 2000 },
  { label: "OUI", price: 2000 },
  { label: "Eleyele", price: 800 },
  { label: "Sabo", price: 1200 },
  { label: "Powerline", price: 1200 },
  { label: "Oduduwa Estate", price: 1000 },
  { label: "Awosun", price: 1600 },
  { label: "Mokuro", price: 2000 },
  { label: "Ilode", price: 2100 },
  { label: "Igboya", price: 1000 },
  { label: "Oke Ogbo", price: 2500 },
];

export function formatPrice(price: number): string {
  return `₦${price.toLocaleString()}`;
}
