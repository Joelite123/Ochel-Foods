import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables not set. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      products: {
        Row: DBProduct;
        Insert: Partial<DBProduct>;
        Update: Partial<DBProduct>;
      };
      orders: {
        Row: DBOrder;
        Insert: Partial<DBOrder>;
        Update: Partial<DBOrder>;
      };
      order_items: {
        Row: DBOrderItem;
        Insert: Partial<DBOrderItem>;
        Update: Partial<DBOrderItem>;
      };
      delivery_zones: {
        Row: DBDeliveryZone;
        Insert: Partial<DBDeliveryZone>;
        Update: Partial<DBDeliveryZone>;
      };
      referral_codes: {
        Row: DBReferralCode;
        Insert: Partial<DBReferralCode>;
        Update: Partial<DBReferralCode>;
      };
      referrals: {
        Row: DBReferral;
        Insert: Partial<DBReferral>;
        Update: Partial<DBReferral>;
      };
      user_rewards: {
        Row: DBUserReward;
        Insert: Partial<DBUserReward>;
        Update: Partial<DBUserReward>;
      };
      reward_settings: {
        Row: DBRewardSetting;
        Insert: Partial<DBRewardSetting>;
        Update: Partial<DBRewardSetting>;
      };
      operating_hours: {
        Row: DBOperatingHour;
        Insert: Partial<DBOperatingHour>;
        Update: Partial<DBOperatingHour>;
      };
      public_holidays: {
        Row: DBPublicHoliday;
        Insert: Partial<DBPublicHoliday>;
        Update: Partial<DBPublicHoliday>;
      };
      promotions: {
        Row: DBPromotion;
        Insert: Partial<DBPromotion>;
        Update: Partial<DBPromotion>;
      };
      newsletter_subscribers: {
        Row: DBNewsletterSubscriber;
        Insert: Partial<DBNewsletterSubscriber>;
        Update: Partial<DBNewsletterSubscriber>;
      };
    };
  };
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "admin";
  referral_wallet_balance: number;
  created_at: string;
  updated_at: string;
};

export type DBProduct = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  base_price: number;
  image_url: string | null;
  sizes: Array<{ label: string; description?: string; price: number }> | null;
  extras: Array<{ name: string; price: number }> | null;
  ingredients: string[] | null;
  tag: string | null;
  note: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DBCategory = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
};

export type DBOrder = {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string;
  delivery_zone_id: string | null;
  delivery_fee: number;
  subtotal: number;
  total: number;
  discount_amount: number;
  referral_wallet_used: number;
  promo_code: string | null;
  status: "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  delivery_time: string | null;
  special_instructions: string | null;
  referral_code_used: string | null;
  created_at: string;
  updated_at: string;
};

export type DBOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  size: string | null;
  price: number;
  quantity: number;
  extras: Array<{ name: string; quantity: number; price: number }> | null;
  removed_ingredients: string[] | null;
  note: string | null;
};

export type DBDeliveryZone = {
  id: string;
  label: string;
  price: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export type DBReferralCode = {
  id: string;
  user_id: string;
  code: string;
  total_referrals: number;
  total_earned: number;
  created_at: string;
};

export type DBReferral = {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referred_phone: string | null;
  referred_ip: string | null;
  code: string;
  status: "pending" | "rewarded" | "rejected" | "expired";
  reward_amount: number;
  reward_type: string;
  order_id: string | null;
  notes: string | null;
  created_at: string;
  rewarded_at: string | null;
};

export type DBUserReward = {
  id: string;
  user_id: string;
  reward_type: "cash_credit" | "free_delivery" | "percentage_discount" | "fixed_discount";
  amount: number;
  balance: number;
  description: string;
  source: "referral" | "admin" | "promo";
  expires_at: string | null;
  is_used: boolean;
  created_at: string;
  updated_at: string;
};

export type DBRewardSetting = {
  id: string;
  reward_type: "cash_credit" | "free_delivery" | "percentage_discount" | "fixed_discount";
  reward_value: number;
  expiry_days: number;
  is_active: boolean;
  description: string;
  updated_at: string;
};

export type DBOperatingHour = {
  id: string;
  day_of_week: number;
  open_hour: number;
  open_minute: number;
  close_hour: number;
  close_minute: number;
  is_closed: boolean;
};

export type DBPublicHoliday = {
  id: string;
  date: string;
  name: string;
  is_closed: boolean;
};

export type DBPromotion = {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  uses_count: number;
  banner_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type DBNewsletterSubscriber = {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  subscribed_at: string;
};
