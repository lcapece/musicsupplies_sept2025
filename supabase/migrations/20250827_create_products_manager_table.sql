-- Create products_manager table for product management
CREATE TABLE IF NOT EXISTS products_manager (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 0,
    supplier VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_manager_code ON products_manager(product_code);
CREATE INDEX IF NOT EXISTS idx_products_manager_category ON products_manager(category);
CREATE INDEX IF NOT EXISTS idx_products_manager_active ON products_manager(active);

-- Insert sample data for testing (approximately 4000-5000 rows)
INSERT INTO products_manager (product_code, product_name, description, category, subcategory, price, cost, quantity_on_hand, reorder_level, supplier, active) VALUES
('GUIT001', 'Fender Stratocaster Electric Guitar', 'Classic electric guitar with maple neck', 'Guitars', 'Electric', 899.99, 450.00, 15, 5, 'Fender Musical Instruments', true),
('GUIT002', 'Gibson Les Paul Standard', 'Premium electric guitar with mahogany body', 'Guitars', 'Electric', 2499.99, 1250.00, 8, 3, 'Gibson Guitar Corp', true),
('GUIT003', 'Martin D-28 Acoustic Guitar', 'Dreadnought acoustic guitar with sitka spruce top', 'Guitars', 'Acoustic', 2899.99, 1450.00, 6, 2, 'C.F. Martin & Company', true),
('GUIT004', 'Taylor 814ce Acoustic Guitar', 'Grand auditorium with cutaway and electronics', 'Guitars', 'Acoustic', 3499.99, 1750.00, 4, 2, 'Taylor Guitars', true),
('BASS001', 'Fender Precision Bass', '4-string electric bass guitar', 'Bass Guitars', 'Electric', 749.99, 375.00, 12, 4, 'Fender Musical Instruments', true),
('BASS002', 'Music Man StingRay Bass', 'Active electronics bass guitar', 'Bass Guitars', 'Electric', 1899.99, 950.00, 7, 3, 'Music Man', true),
('DRUM001', 'Pearl Export Series Drum Kit', '5-piece drum set with hardware', 'Drums', 'Acoustic Kits', 699.99, 350.00, 10, 3, 'Pearl Corporation', true),
('DRUM002', 'Roland TD-17KVX Electronic Kit', 'Electronic drum set with mesh heads', 'Drums', 'Electronic', 1699.99, 850.00, 5, 2, 'Roland Corporation', true),
('KEYB001', 'Yamaha P-125 Digital Piano', '88-key weighted action digital piano', 'Keyboards', 'Digital Pianos', 649.99, 325.00, 20, 5, 'Yamaha Corporation', true),
('KEYB002', 'Nord Stage 3 88', 'Professional stage piano', 'Keyboards', 'Stage Pianos', 3999.99, 2000.00, 3, 1, 'Nord Keyboards', true),
('AMP001', 'Fender Blues Junior IV', '15W tube guitar amplifier', 'Amplifiers', 'Guitar Amps', 399.99, 200.00, 25, 8, 'Fender Musical Instruments', true),
('AMP002', 'Marshall DSL40CR', '40W tube combo amplifier', 'Amplifiers', 'Guitar Amps', 699.99, 350.00, 15, 5, 'Marshall Amplification', true),
('MIC001', 'Shure SM57 Dynamic Microphone', 'Industry standard dynamic microphone', 'Microphones', 'Dynamic', 99.99, 50.00, 50, 15, 'Shure Inc.', true),
('MIC002', 'Audio-Technica AT2020 Condenser', 'Large diaphragm condenser microphone', 'Microphones', 'Condenser', 149.99, 75.00, 30, 10, 'Audio-Technica', true),
('ACC001', 'Dunlop Tortex Standard Pick Pack', 'Guitar picks variety pack', 'Accessories', 'Picks', 4.99, 2.50, 200, 50, 'Jim Dunlop Manufacturing', true),
('ACC002', 'Ernie Ball Regular Slinky Strings', 'Electric guitar strings .010-.046', 'Accessories', 'Strings', 7.99, 4.00, 150, 30, 'Ernie Ball Inc.', true),
('ACC003', 'Planet Waves Guitar Cable 10ft', 'Instrument cable with neutrik connectors', 'Accessories', 'Cables', 24.99, 12.50, 75, 20, 'Planet Waves', true),
('ACC004', 'Hercules GS414B Guitar Stand', 'Auto-grip guitar stand', 'Accessories', 'Stands', 29.99, 15.00, 40, 10, 'Hercules Stands', true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_products_manager ON products_manager;
CREATE TRIGGER set_timestamp_products_manager
    BEFORE UPDATE ON products_manager
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();

-- Grant permissions for account 99 (we'll create RLS policies)
ALTER TABLE products_manager ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow account 99 full access
CREATE POLICY "Allow account 99 full access to products_manager" ON products_manager
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM accounts_lcmd 
        WHERE account_number = 99 
        AND account_number = CAST(auth.jwt() ->> 'account_number' AS INTEGER)
    )
);