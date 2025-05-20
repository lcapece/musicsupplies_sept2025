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
}

export interface ProductGroup {
  prdmetagrp?: string;
  prdmaingrp?: string;
  prdsubgrp?: string;
  level: number;
  id: string;
  name: string;
  parentId: string | null;
  children?: ProductGroup[];
}