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

  // Add empty rows for consistent layout (minimum 6 rows total)
  const emptyRowsNeeded = Math.max(0, 6 - items.length);
  const emptyRowsHTML = Array(emptyRowsNeeded).fill(0).map((_, index) => `
    <tr class="${(items.length + index) % 2 === 0 ? 'row-even' : 'row-odd'} empty-row">
      <td class="qty-cell">&nbsp;</td>
      <td class="qty-cell"></td>
      <td class="part-cell"></td>
      <td class="desc-cell"></td>
      <td class="price-cell"></td>
      <td class="total-cell"></td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isWebOrder ? 'Web Order' : 'Invoice'} ${displayNumber}</title>
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
        }

        /* Print-optimized container for 8.5" x 11" */
        .invoice-container {
            width: 8.5in;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
            background: white;
            box-sizing: border-box;
        }

        /* Clean Header Section */
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ddd;
        }

        .company-section {
            flex: 1;
        }

        .company-name {
            font-size: 22px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 5px;
        }

        .company-website {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 15px;
        }

        .company-website .music { color: #2c5aa0; }
        .company-website .supplies { color: #dc3545; }
        .company-website .com { color: #000; }

        .company-details {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
        }

        /* Invoice Meta Information */  
        .invoice-meta {
            text-align: right;
            flex: 0 0 250px;
        }

        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 15px;
        }

        .meta-item {
            font-size: 14px;
            margin: 5px 0;
            color: #333;
        }

        .meta-item strong {
            color: #000;
        }

        /* Customer Information */
        .customer-section {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #2c5aa0;
        }

        .bill-to-title {
            font-size: 16px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 10px;
        }

        .customer-info {
            font-size: 14px;
            line-height: 1.6;
        }

        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 13px;
        }

        .items-table th {
            background: #2c5aa0;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
        }

        .items-table th.text-center { text-align: center; }
        .items-table th.text-right { text-align: right; }

        .items-table td {
            padding: 8px;
            border: 1px solid #ddd;
            vertical-align: top;
        }

        .items-table tbody tr.row-even {
            background-color: #f8f9fa;
        }

        .items-table tbody tr.row-odd {
            background-color: white;
        }

        .qty-cell {
            text-align: center;
            font-weight: bold;
            width: 8%;
        }

        .part-cell {
            font-family: monospace;
            font-weight: bold;
            width: 18%;
        }

        .desc-cell {
            width: 44%;
        }

        .price-cell, .total-cell {
            text-align: right;
            font-family: monospace;
            font-weight: bold;
            width: 15%;
        }

        .empty-row td {
            height: 25px;
            border-color: #eee;
        }

        /* Summary Section */
        .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 25px;
        }

        .totals-table {
            width: 300px;
            border-collapse: collapse;
            font-size: 14px;
        }

        .totals-table td {
            padding: 8px 12px;
            border: 1px solid #ddd;
        }

        .total-label {
            text-align: right;
            font-weight: bold;
            background: #f8f9fa;
            width: 60%;
        }

        .total-amount {
            text-align: right;
            font-family: monospace;
            font-weight: bold;
            width: 40%;
        }

        .grand-total-row {
            background: #2c5aa0;
            color: white;
        }

        .grand-total-row .total-label,
        .grand-total-row .total-amount {
            color: white;
            font-size: 16px;
            font-weight: bold;
        }

        /* Payment Information */
        .payment-section {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8f9fa;
            border: 1px solid #ddd;
        }

        .payment-method {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .payment-terms {
            font-size: 13px;
            color: #666;
            font-style: italic;
        }

        /* Pro-Forma Notice */
        .proforma-notice {
            margin-bottom: 20px;
            padding: 15px;
            background: #fff5f5;
            border: 2px solid #dc3545;
            border-radius: 5px;
            text-align: center;
        }

        .proforma-text {
            color: #dc3545;
            font-size: 14px;
            font-weight: bold;
            margin: 0;
        }

        /* Footer */
        .footer-section {
            padding: 15px 0;
            text-align: center;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }

        .footer-text {
            margin: 5px 0;
        }

        /* Print Styles */
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            
            .invoice-container {
                margin: 0;
                padding: 0.5in;
                box-shadow: none;
                border: none;
            }
            
            @page {
                size: 8.5in 11in;
                margin: 0.5in;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Clean Header -->
        <header class="invoice-header">
            <div class="company-section">
                <h1 class="company-name">${companyInfo.name}</h1>
                <div class="company-website">
                    <span class="music">Music</span><span class="supplies">Supplies</span><span class="com">.com</span>
                </div>
                <div class="company-details">
                    <div>${companyInfo.address}</div>
                    <div>${companyInfo.cityStateZip}</div>
                    <div>${companyInfo.phone}</div>
                    <div>Reply to: ${companyInfo.email}</div>
                </div>
            </div>
            <div class="invoice-meta">
                <h2 class="invoice-title">${isWebOrder ? 'WEB ORDER' : 'INVOICE'}</h2>
                <div class="meta-item"><strong>${displayLabel}</strong> ${displayNumber}</div>
                ${accountNumber ? `<div class="meta-item"><strong>Acct No.:</strong> ${accountNumber}</div>` : ''}
                <div class="meta-item"><strong>${isWebOrder ? 'Order' : 'Invoice'} Date:</strong> ${invoiceDate}</div>
                <div class="meta-item"><strong>Terms:</strong> ${terms}</div>
                <div class="meta-item"><strong>Sales Rep:</strong> ${salesRep}</div>
            </div>
        </header>

        <!-- Customer Information -->
        <section class="customer-section">
            <h3 class="bill-to-title">Bill To:</h3>
            <div class="customer-info">
                <div><strong>${customerName}</strong></div>
                ${customerAddress?.line1 ? `<div>${customerAddress.line1}</div>` : ''}
                ${customerAddress?.cityStateZip ? `<div>${customerAddress.cityStateZip}</div>` : ''}
                <div>Email: ${customerEmail}</div>
                <div>Phone: ${customerPhone}</div>
            </div>
        </section>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="text-center">Qty Ord</th>
                    <th class="text-center">Qty Shp</th>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th class="text-right">Unit Net</th>
                    <th class="text-right">Extended Net</th>
                </tr>
            </thead>
            <tbody>
                ${lineItemsHTML}
                ${emptyRowsHTML}
            </tbody>
        </table>

        <!-- Summary Section -->
        <section class="summary-section">
            <table class="totals-table">
                <tr>
                    <td class="total-label">Subtotal:</td>
                    <td class="total-amount">$${subtotal.toFixed(2)}</td>
                </tr>
                ${shippingCharges > 0 ? `
                <tr>
                    <td class="total-label">Shipping:</td>
                    <td class="total-amount">$${shippingCharges.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${promoCodeDiscount > 0 ? `
                <tr>
                    <td class="total-label">Discount${promoCodeDescription ? ` (${promoCodeDescription})` : ''}:</td>
                    <td class="total-amount">-$${promoCodeDiscount.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${paymentsReceived > 0 ? `
                <tr>
                    <td class="total-label">Payments Received:</td>
                    <td class="total-amount">-$${paymentsReceived.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${interestCharges > 0 ? `
                <tr>
                    <td class="total-label">Interest Charges:</td>
                    <td class="total-amount">$${interestCharges.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="grand-total-row">
                    <td class="total-label">Total Amount Due:</td>
                    <td class="total-amount">$${totalAmountDue.toFixed(2)}</td>
                </tr>
            </table>
        </section>

        <!-- Payment Information -->
        <section class="payment-section">
            <div class="payment-method">Payment Method: ${paymentMethod === 'credit' ? 'Credit Card on File' : 'Net-10 Open Account'}</div>
            ${paymentMethod === 'net10' ? '<div class="payment-terms">Payment due within 10 days of invoice date.</div>' : ''}
        </section>

        <!-- Pro-Forma Notice -->
        <section class="proforma-notice">
            <p class="proforma-text">Note: This is a Pro-Forma Invoice. You will be notified of the Grand Total when Shipping Charges are calculated - Thank You!</p>
        </section>

        <!-- Footer -->
        <section class="footer-section">
            <div class="footer-text">Thank you for your business! Questions about this ${isWebOrder ? 'order' : 'invoice'}?</div>
            <div class="footer-text">Contact us at ${companyInfo.email} or ${companyInfo.phone}</div>
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
  customerInfo?: { name?: string; accountNumber?: string }
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
    items,
    subtotal,
    promoCodeDiscount: promoDiscount,
    promoCodeDescription: appliedPromoCode?.code,
    totalAmountDue,
    paymentMethod
  };
}
