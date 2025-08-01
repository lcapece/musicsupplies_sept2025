import { CartItem } from '../types';

export interface InvoiceData {
  orderNumber: string;
  accountNumber?: string;
  invoiceDate: string;
  terms: string;
  salesRep: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: {
    line1?: string;
    cityStateZip?: string;
  };
  shippingAddress?: {
    name?: string;
    line1?: string;
    cityStateZip?: string;
  };
  items: CartItem[];
  subtotal: number;
  shippingCharges?: number;
  paymentsReceived?: number;
  interestCharges?: number;
  promoCodeDiscount?: number;
  promoCodeDescription?: string;
  totalAmountDue: number;
  paymentMethod: 'credit' | 'net10';
}

export interface CompanyInfo {
  name: string;
  address: string;
  cityStateZip: string;
  phone: string;
  email: string;
  logoPlaceholder?: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: "Lou Capece Music Distributors",
  address: "2555 North Jerusalem Rd.",
  cityStateZip: "East Meadow, NY 11554",
  phone: "Toll Free 1(800) 321-5584",
  email: "marketing@loucapecemusic.com",
  logoPlaceholder: "[COMPANY LOGO]"
};

export function generateInvoiceHTML(invoiceData: InvoiceData, companyInfo: CompanyInfo = defaultCompanyInfo): string {
  const {
    orderNumber,
    accountNumber,
    invoiceDate,
    terms,
    salesRep,
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    shippingAddress,
    items,
    subtotal,
    shippingCharges = 0,
    paymentsReceived = 0,
    interestCharges = 0,
    promoCodeDiscount = 0,
    promoCodeDescription,
    totalAmountDue,
    paymentMethod
  } = invoiceData;

  // Determine if this is a web order (750000-770000 range)
  const orderNum = parseInt(orderNumber.replace(/[^\d]/g, ''));
  const isWebOrder = orderNum >= 750000 && orderNum <= 770000;
  const displayLabel = isWebOrder ? "Web Order:" : "Invoice Number:";
  const displayNumber = isWebOrder ? `WB${orderNumber}` : orderNumber;

  // Generate line items HTML with clean styling
  const lineItemsHTML = items.map((item, index) => `
    <tr class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="qty-cell">${item.quantity}</td>
      <td class="qty-cell">${item.quantity}</td>
      <td class="part-cell">${item.partnumber}</td>
      <td class="desc-cell">${item.description || ''}</td>
      <td class="price-cell">$${(item.price || 0).toFixed(2)}</td>
      <td class="total-cell">$${((item.price || 0) * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  // Add empty rows for consistent layout (minimum 12 rows total for professional appearance)
  const emptyRowsNeeded = Math.max(0, 12 - items.length);
  const emptyRowsHTML = Array(emptyRowsNeeded).fill(0).map((_, index) => `
    <tr class="${(items.length + index) % 2 === 0 ? 'row-even' : 'row-odd'} empty-row">
      <td class="qty-cell">&nbsp;</td>
      <td class="qty-cell">&nbsp;</td>
      <td class="part-cell">&nbsp;</td>
      <td class="desc-cell">&nbsp;</td>
      <td class="price-cell">&nbsp;</td>
      <td class="total-cell">&nbsp;</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Number: ${orderNumber}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Arial, sans-serif;
            background: white;
            color: #000;
            line-height: 1.4;
            font-size: 12px;
        }

        /* Print-optimized container */
        .invoice-container {
            width: 210mm;
            max-width: 210mm;
            margin: 0 auto;
            padding: 15mm;
            background: white;
            box-sizing: border-box;
        }

        /* Header Section */
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .company-section {
            flex: 1;
        }

        .company-website {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 15px;
        }

        .company-details {
            font-size: 11px;
            color: #333;
            line-height: 1.5;
        }

        /* Invoice Meta Information */  
        .invoice-meta {
            text-align: right;
            flex: 0 0 200px;
        }

        .invoice-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
        }

        .meta-item {
            font-size: 11px;
            margin: 3px 0;
            color: #333;
        }

        .meta-item strong {
            color: #000;
        }

        /* Customer Information - Side by Side Layout */
        .customer-sections {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }

        .customer-section {
            flex: 1;
            padding: 12px;
            border: 2px solid #000;
            min-height: 120px;
        }

        .bill-to-title, .ship-to-title {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
            text-decoration: underline;
        }

        .customer-info {
            font-size: 11px;
            line-height: 1.4;
        }

        .na-text {
            color: #666;
            font-style: italic;
        }

        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 10px;
        }

        .items-table th {
            background: white;
            color: #000;
            padding: 8px 6px;
            text-align: center;
            font-weight: bold;
            border: 1px solid #000;
            font-size: 10px;
        }

        .items-table th.text-left { text-align: left; }
        .items-table th.text-right { text-align: right; }

        .items-table td {
            padding: 6px;
            border: 1px solid #000;
            vertical-align: top;
            font-size: 10px;
        }

        .items-table tbody tr.row-even {
            background-color: white;
        }

        .items-table tbody tr.row-odd {
            background-color: white;
        }

        .qty-cell {
            text-align: center;
            width: 8%;
        }

        .part-cell {
            text-align: left;
            width: 15%;
        }

        .desc-cell {
            text-align: left;
            width: 47%;
        }

        .price-cell, .total-cell {
            text-align: right;
            width: 15%;
        }

        .empty-row td {
            height: 20px;
        }

        /* Totals Section with Discount Box */
        .totals-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .discount-box {
            flex: 0 0 150px;
            border: 2px dashed #000;
            padding: 15px;
            text-align: center;
            margin-right: 20px;
        }

        .discount-text {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .totals-table {
            flex: 0 0 300px;
            border-collapse: collapse;
            font-size: 11px;
        }

        .totals-table td {
            padding: 6px 12px;
            border: 1px solid #000;
        }

        .total-label {
            text-align: right;
            font-weight: bold;
            width: 60%;
        }

        .total-amount {
            text-align: right;
            font-weight: bold;
            width: 40%;
        }

        .grand-total-row {
            background: white;
        }

        .grand-total-row .total-label,
        .grand-total-row .total-amount {
            font-size: 14px;
            font-weight: bold;
        }

        /* Footer */
        .footer-section {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #333;
        }

        /* Print Styles */
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            
            .invoice-container {
                margin: 0;
                padding: 15mm;
                box-shadow: none;
                border: none;
            }
            
            @page {
                size: A4;
                margin: 10mm;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <header class="invoice-header">
            <div class="company-section">
                <div class="company-website">MusicSupplies.com</div>
                <h1 class="company-name">${companyInfo.name}</h1>
                <div class="company-details">
                    <div>${companyInfo.address}</div>
                    <div>${companyInfo.cityStateZip}</div>
                    <div>${companyInfo.phone}</div>
                    <div>Reply to: ${companyInfo.email}</div>
                </div>
            </div>
            <div class="invoice-meta">
                <h2 class="invoice-title">Invoice Number: ${orderNumber}</h2>
                ${accountNumber ? `<div class="meta-item"><strong>Acct No.:</strong> ${accountNumber}</div>` : ''}
                <div class="meta-item"><strong>Invoice Date:</strong> ${invoiceDate}</div>
                <div class="meta-item"><strong>Terms:</strong> ${terms}</div>
                <div class="meta-item"><strong>Sales Rep:</strong> ${salesRep}</div>
            </div>
        </header>

        <!-- Customer Information - Side by Side -->
        <section class="customer-sections">
            <div class="customer-section">
                <h3 class="bill-to-title">Bill To:</h3>
                <div class="customer-info">
                    <div><strong>${customerName}</strong></div>
                    ${customerAddress?.line1 ? `<div>${customerAddress.line1}</div>` : '<div class="na-text">N/A</div>'}
                    ${customerAddress?.cityStateZip ? `<div>${customerAddress.cityStateZip}</div>` : ''}
                    <div>Email: ${customerEmail}</div>
                    <div>Phone: ${customerPhone}</div>
                </div>
            </div>
            <div class="customer-section">
                <h3 class="ship-to-title">Ship To:</h3>
                <div class="customer-info">
                    ${shippingAddress ? `
                        <div><strong>${shippingAddress.name || customerName}</strong></div>
                        <div>${shippingAddress.line1 || ''}</div>
                        <div>${shippingAddress.cityStateZip || ''}</div>
                    ` : `
                        <div class="na-text">optional ship-to</div>
                        <div class="na-text">info here</div>
                    `}
                </div>
            </div>
        </section>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Qty Ord</th>
                    <th>Qty Shp</th>
                    <th class="text-left">Part Number</th>
                    <th class="text-left">Description</th>
                    <th class="text-right">Unit Net</th>
                    <th class="text-right">Extended Net</th>
                </tr>
            </thead>
            <tbody>
                ${lineItemsHTML}
                ${emptyRowsHTML}
            </tbody>
        </table>

        <!-- Totals Section with Discount Box -->
        <section class="totals-section">
            <div class="discount-box">
                <div class="discount-text">Insert line for</div>
                <div class="discount-text">discount</div>
            </div>
            <table class="totals-table">
                <tr>
                    <td class="total-label">Subtotal:</td>
                    <td class="total-amount">$${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="total-label">Shipping:</td>
                    <td class="total-amount">${shippingCharges > 0 ? `$${shippingCharges.toFixed(2)}` : '$36.29'}</td>
                </tr>
                <tr>
                    <td class="total-label">Payments Received:</td>
                    <td class="total-amount">${paymentsReceived > 0 ? `-$${paymentsReceived.toFixed(2)}` : '($832.19)'}</td>
                </tr>
                <tr class="grand-total-row">
                    <td class="total-label">Total Due:</td>
                    <td class="total-amount">$${totalAmountDue.toFixed(2)}</td>
                </tr>
            </table>
        </section>

        <!-- Footer -->
        <section class="footer-section">
            <div>Thank you for your business!</div>
        </section>
    </div>
</body>
</html>
  `;
}

export function generateInvoiceText(invoiceData: InvoiceData, companyInfo: CompanyInfo = defaultCompanyInfo): string {
  const {
    orderNumber,
    accountNumber,
    invoiceDate,
    terms,
    salesRep,
    customerName,
    customerEmail,
    customerPhone,
    items,
    subtotal,
    shippingCharges = 0,
    promoCodeDiscount = 0,
    promoCodeDescription,
    totalAmountDue,
    paymentMethod
  } = invoiceData;

  // Determine if this is a web order (750000-770000 range)
  const orderNum = parseInt(orderNumber.replace(/[^\d]/g, ''));
  const isWebOrder = orderNum >= 750000 && orderNum <= 770000;
  const displayLabel = isWebOrder ? "Web Order" : "Invoice Number";
  const displayNumber = isWebOrder ? `WB${orderNumber}` : orderNumber;

  return `
${isWebOrder ? 'WEB ORDER' : 'INVOICE'}

${companyInfo.name}
MusicSupplies.com
${companyInfo.address}
${companyInfo.cityStateZip}
${companyInfo.phone}
Reply to: ${companyInfo.email}

${displayLabel}: ${displayNumber}
${accountNumber ? `Account Number: ${accountNumber}` : ''}
${isWebOrder ? 'Order' : 'Invoice'} Date: ${invoiceDate}
Terms: ${terms}
Sales Rep: ${salesRep}

BILL TO:
${customerName}
Email: ${customerEmail}
Phone: ${customerPhone}

ITEMS ORDERED:
${items.map(item => 
  `${item.quantity}x ${item.partnumber} - ${item.description || ''} @ $${(item.price || 0).toFixed(2)} = $${((item.price || 0) * item.quantity).toFixed(2)}`
).join('\n')}

SUMMARY:
Subtotal: $${subtotal.toFixed(2)}
${shippingCharges > 0 ? `Shipping: $${shippingCharges.toFixed(2)}` : ''}
${promoCodeDiscount > 0 ? `Promo Discount${promoCodeDescription ? ` (${promoCodeDescription})` : ''}: -$${promoCodeDiscount.toFixed(2)}` : ''}
TOTAL AMOUNT DUE: $${totalAmountDue.toFixed(2)}

Payment Method: ${paymentMethod === 'credit' ? 'Credit Card on File' : 'Net-10 Open Account'}
${paymentMethod === 'net10' ? 'Payment due within 10 days of invoice date.' : ''}

Thank you for your business!
Questions? Contact us at ${companyInfo.email} or ${companyInfo.phone}
  `.trim();
}

export function createInvoiceDataFromOrder(
  orderNumber: string,
  items: CartItem[],
  email: string,
  phone: string,
  paymentMethod: 'credit' | 'net10',
  appliedPromoCode?: { discount_amount: number; message?: string; code?: string },
  customerInfo?: { 
    name?: string; 
    accountNumber?: string;
    address?: { line1?: string; cityStateZip?: string };
    shippingAddress?: { name?: string; line1?: string; cityStateZip?: string };
  }
): InvoiceData {
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const promoDiscount = appliedPromoCode?.discount_amount || 0;
  const totalAmountDue = subtotal - promoDiscount;

  return {
    orderNumber,
    accountNumber: customerInfo?.accountNumber,
    invoiceDate: new Date().toLocaleDateString(),
    terms: paymentMethod === 'net10' ? 'Net 10' : 'Credit Card',
    salesRep: 'Online Order',
    customerName: customerInfo?.name || email.split('@')[0], // Use email prefix if no name provided
    customerEmail: email,
    customerPhone: phone,
    customerAddress: customerInfo?.address,
    shippingAddress: customerInfo?.shippingAddress,
    items,
    subtotal,
    promoCodeDiscount: promoDiscount,
    promoCodeDescription: appliedPromoCode?.code,
    totalAmountDue,
    paymentMethod
  };
}
