/*
  # Add test data to lcmd_ordhist table

  1. Test Data
    - Adding sample order history records
    - Using realistic values for testing
    - Including all required columns based on schema
*/

INSERT INTO lcmd_ordhist (
  accountnumber,
  invoicenumber,
  linekey,
  dstamp,
  payments,
  invoicedate,
  model,
  Qty,
  unitnet,
  Description,
  ups,
  terms,
  salesman
) VALUES
(101, 12345, 1, '2025-01-15', 0, '2025-01-15', 'GS100', '2', '299.99', 'Gibson SG Standard', 25.00, 'Net 30', 'John Smith'),
(101, 12345, 2, '2025-01-15', 0, '2025-01-15', 'FD100', '1', '899.99', 'Fender Deluxe Stratocaster', 35.00, 'Net 30', 'John Smith'),
(101, 12346, 1, '2025-01-20', 0, '2025-01-20', 'YFL100', '3', '499.99', 'Yamaha Flute Professional', 15.00, 'Net 30', 'John Smith'),
(102, 12347, 1, '2025-01-25', 0, '2025-01-25', 'PV100', '2', '199.99', 'Pearl Vision Drum Set', 75.00, 'Credit Card', 'Jane Doe'),
(102, 12347, 2, '2025-01-25', 0, '2025-01-25', 'ZCR100', '4', '89.99', 'Zildjian Crash Cymbal', 25.00, 'Credit Card', 'Jane Doe');