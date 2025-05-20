/*
  # Add test order history data for account 101
  
  This migration adds sample order history records for Joe's Music Store (account 101)
  to show the data in the OrderHistory.tsx component.
*/

-- Create test order history entries for account 101
INSERT INTO lcmd_ordhist
  (accountnumber, invoicenumber, dstamp, invoicedate, salesman, terms, model, "Description", "Qty", unitnet, payments)
VALUES
  -- Order 1: Guitar package
  (101, 50010, '05/12/2025', '05/12/2025', 'Smith, John', 'Net 30', 'FG800', 'Yamaha FG800 Acoustic Guitar', '1', '299.99', 'Pending'),
  (101, 50010, '05/12/2025', '05/12/2025', 'Smith, John', 'Net 30', 'ACC-PICK', 'Guitar Pick Set - Medium', '3', '4.99', 'Pending'),
  (101, 50010, '05/12/2025', '05/12/2025', 'Smith, John', 'Net 30', 'ACC-STRAP', 'Leather Guitar Strap - Black', '1', '24.99', 'Pending'),
  
  -- Order 2: Drums
  (101, 50015, '05/15/2025', '05/15/2025', 'Johnson, Maria', 'Net 30', 'DP-SET-STD', 'Standard Drum Kit - 5pc', '1', '699.99', 'Paid'),
  (101, 50015, '05/15/2025', '05/15/2025', 'Johnson, Maria', 'Net 30', 'DRUM-STICKS', 'Oak Drum Sticks - Pair', '2', '12.50', 'Paid'),
  
  -- Order 3: Piano and accessories
  (101, 50022, '05/17/2025', '05/17/2025', 'Smith, John', 'Net 30', 'DGP-640', 'Yamaha Digital Grand Piano', '1', '3499.99', 'Partially Paid'),
  (101, 50022, '05/17/2025', '05/17/2025', 'Smith, John', 'Net 30', 'BENCH-ADJ', 'Adjustable Piano Bench - Black', '1', '129.99', 'Partially Paid'),
  (101, 50022, '05/17/2025', '05/17/2025', 'Smith, John', 'Net 30', 'BOOK-BASICS', 'Piano Basics for Beginners', '2', '19.99', 'Partially Paid');
