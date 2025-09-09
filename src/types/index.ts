export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  children?: Category[];
}

export interface Product {
  partnumber: string;
  description: string;
  price: number | null;
  inventory: number | null;
  image?: string; // Add optional image property
  groupedimage?: string; // Grouped image field from products_supabase
  category?: number | null; // Product category (INTEGER foreign key)
  webmsrp?: number | null; // List price (corrected spelling)
  longdescription?: string; // Long description that may contain HTML
  brand?: string; // Manufacturer/brand name
  map?: number | null; // Manufacturer's Advertised Price
  upc?: string; // Universal Product Code
  master_carton_price?: number | null; // Master carton price
  master_carton_quantity?: number | null; // Master carton quantity
}

export interface CartItem extends Product {
  quantity: number;
  qtyBackordered?: number;
}

export interface Account {
  id: string;
  accountNumber: string;
  companyName: string;
  email: string;
  isActive: boolean;
}

export interface User {
  accountNumber: string;
  acctName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email?: string; // This will be the property used in the frontend User object
  email_address?: string; // Property from the database (corrected to lowercase)
  phone?: string; // Business phone
  mobile_phone?: string; // Added mobile_phone
  id?: number; // Added id from accounts table (should be number for database compatibility)
  password?: string; // Added password from accounts table
  requires_password_change?: boolean; // Flag to indicate if user needs to change password
  sms_consent?: boolean; // SMS consent flag
  sms_consent_given?: boolean; // Tracks if they opted in for transactional SMS messages
  sms_consent_date?: string; // Date when SMS consent was given
  marketing_sms_consent?: boolean; // Tracks express written consent for marketing SMS messages
  is_special_admin?: boolean; // Flag for special admin account (99)
}

export interface ProductGroup {
  prdmaingrp?: string; // Main group (level 1)
  prdsubgrp?: string; // Sub group (level 2)
  level: number;
  id: string;
  name: string;
  parentId: string | null;
  children?: ProductGroup[];
  productCount?: number; // Count of products in this category
  icon?: string; // Icon name for the category (used for SVG icons)
}

export interface OrderConfirmationDetails {
  webOrderNumber: string;
  items: CartItem[];
  total: number;
}

export interface RtExtended {
  partnumber: string;
  ext_descr?: string;
  image_name?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  name: string;
  type: 'percent_off' | 'dollars_off' | 'free_product' | 'advanced';
  value: number;
  min_order_value: number;
  max_uses: number | null;
  uses_remaining: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  max_uses_per_account?: number | null;
  uses_per_account_tracking?: boolean;
  legacy_code?: string;
  allow_concurrent?: boolean;
  template?: string;
  template_config?: Record<string, any>;
}

export interface PromoCodeUsage {
  id: string;
  promo_code_id: string;
  account_number: string;
  order_id?: number;
  used_at: string;
  order_value: number;
  discount_amount: number;
}

export interface PromoCodeValidity {
  is_valid: boolean;
  message: string;
  promo_id?: string;
  promo_type?: string;
  promo_value?: number;
  discount_amount?: number;
  code?: string; // Added for actual promo code (e.g., "SAVE10")
  product_description?: string; // Added for description from products table
}

export interface PromoCodeSummary {
  code: string;
  name: string;
  description: string;
  type: string;
  value: number;
  min_order_value: number;
}

export interface AvailablePromoCode {
  code: string;
  name: string;
  description: string;
  type: string;
  value: number;
  min_order_value: number;
  discount_amount: number;
  is_best: boolean;
  uses_remaining_for_account?: number | null;
  status?: 'available' | 'expired' | 'expired_global' | 'expired_date' | 'not_active' | 'disabled' | 'min_not_met';
}

export interface SecurityLevel {
  id: string;
  security_level: string;
  section: string;
  scope: 'read-only' | 'create' | 'update' | 'delete' | 'all' | 'none';
  created_at?: string;
  updated_at?: string;
}

export type PermissionScope = 'read-only' | 'create' | 'update' | 'delete' | 'all' | 'none';

export type SecurityLevelName = 'user' | 'manager' | 'admin' | 'super_admin';

export interface PermissionCheck {
  hasAccess: boolean;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  scope: PermissionScope;
}
