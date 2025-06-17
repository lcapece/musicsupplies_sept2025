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
  prdmaincat?: string; // Product main category (level 1)
  prdsubcat?: string; // Product sub category (level 2)
  webmsrp?: number | null; // List price (corrected spelling)
  longdescription?: string; // Long description that may contain HTML
}

export interface CartItem extends Product {
  quantity: number;
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
  mobile_phone?: string; // Added mobile_phone
  id?: string; // Added id from accounts table
  password?: string; // Added password from accounts table
  requires_password_change?: boolean; // Flag to indicate if user needs to change password
  sms_consent_given?: boolean; // SMS consent flag
  sms_consent_date?: string; // Date when SMS consent was given
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
