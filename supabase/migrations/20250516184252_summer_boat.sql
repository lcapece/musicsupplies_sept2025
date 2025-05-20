/*
  # Create web orders tables

  1. New Tables
    - `web_orders`
      - `order_number` (bigint, primary key)
      - `account_number` (bigint)
      - `order_date` (timestamp)
      - `order_comments` (text)
*/

CREATE TABLE IF NOT EXISTS web_orders (
  order_number bigint PRIMARY KEY,
  account_number bigint NOT NULL,
  order_date timestamp NOT NULL DEFAULT now(),
  order_comments text
);

COMMENT ON TABLE web_orders IS 'Order header records';

-- Enable RLS
ALTER TABLE web_orders ENABLE ROW LEVEL SECURITY;