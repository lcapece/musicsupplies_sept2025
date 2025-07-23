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

  // Generate line items HTML with enhanced styling
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

  // Add empty rows to match the original template structure (minimum 6 rows total)
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
    <title>Invoice ${orderNumber}</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: #2c3e50;
            line-height: 1.6;
            min-height: 100vh;
        }

        .invoice-container {
            max-width: 210mm;
            margin: 20px auto;
            background: #ffffff;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e3e8ef;
        }

        /* Premium Header with Gradient */
        .invoice-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }

        .invoice-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.1);
            transform: rotate(45deg);
            border-radius: 50%;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            position: relative;
            z-index: 2;
        }

        .company-section {
            flex: 1;
        }

        .company-logo {
            width: 120px;
            height: 120px;
            background: rgba(255,255,255,0.15);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            margin-bottom: 20px;
            border: 2px dashed rgba(255,255,255,0.3);
            backdrop-filter: blur(10px);
        }

        .company-name {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 8px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .company-details {
            font-size: 16px;
            opacity: 0.95;
            line-height: 1.8;
        }

        .company-details a {
            color: #ffeaa7;
            text-decoration: none;
            font-weight: 600;
        }

        .invoice-meta {
            text-align: right;
            flex: 0 0 300px;
        }

        .invoice-title {
            font-size: 36px;
            font-weight: 800;
            margin: 0 0 20px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .meta-item {
            margin: 8px 0;
            font-size: 16px;
            font-weight: 500;
        }

        /* Customer Information Section */
        .customer-section {
            padding: 40px;
            background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
            border-bottom: 3px solid #e3e8ef;
        }

        .bill-to-title {
            font-size: 20px;
            font-weight: 700;
            color: #2c3e50;
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #667eea;
            display: inline-block;
        }

        .customer-info {
            font-size: 16px;
            line-height: 1.8;
            color: #34495e;
        }

        .customer-info p {
            margin: 6px 0;
        }

        /* Line Items Table */
        .items-section {
            padding: 0;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 15px;
        }

        .items-table thead {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
        }

        .items-table th {
            padding: 18px 16px;
            font-weight: 600;
            text-align: left;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 3px solid #667eea;
        }

        .items-table th.text-center { text-align: center; }
        .items-table th.text-right { text-align: right; }

        .items-table tbody tr.row-even {
            background-color: #f8f9fa;
        }

        .items-table tbody tr.row-odd {
            background-color: #ffffff;
        }

        .items-table tbody tr:hover:not(.empty-row) {
            background-color: #e8f4fd;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }

        .items-table td {
            padding: 16px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: top;
        }

        .qty-cell {
            text-align: center;
            font-weight: 600;
            color: #667eea;
            width: 8%;
        }

        .part-cell {
            font-family: 'Courier New', monospace;
            font-weight: 600;
            color: #2c3e50;
            width: 18%;
        }

        .desc-cell {
            width: 44%;
            font-weight: 500;
        }

        .price-cell, .total-cell {
            text-align: right;
            font-weight: 600;
            font-family: 'Courier New', monospace;
            color: #27ae60;
            width: 15%;
        }

        .empty-row td {
            height: 50px;
            color: transparent;
        }

        /* Summary Section */
        .summary-section {
            padding: 40px;
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 40px;
        }

        .qr-section {
            flex: 0 0 200px;
            text-align: center;
        }

        .qr-placeholder {
            width: 120px;
            height: 120px;
            margin: 0 auto 16px;
            background: rgba(255,255,255,0.9);
            border: 2px dashed #95a5a6;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #7f8c8d;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .qr-text {
            font-size: 14px;
            color: #2c3e50;
            font-weight: 600;
            line-height: 1.4;
        }

        .totals-section {
            flex: 1;
            max-width: 400px;
        }

        .totals-table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(255,255,255,0.95);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }

        .totals-table td {
            padding: 16px 20px;
            border-bottom: 1px solid #ecf0f1;
        }

        .totals-table tr:last-child td {
            border-bottom: none;
        }

        .total-label {
            text-align: right;
            font-weight: 600;
            color: #34495e;
            font-size: 16px;
            width: 60%;
        }

        .total-amount {
            text-align: right;
            font-weight: 700;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            color: #27ae60;
            width: 40%;
        }

        .grand-total-row {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .grand-total-row .total-label,
        .grand-total-row .total-amount {
            color: white;
            font-size: 20px;
            font-weight: 800;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        /* Payment Information */
        .payment-section {
            padding: 30px 40px;
            background: #f8f9fa;
            border-top: 3px solid #e3e8ef;
        }

        .payment-info {
            background: linear-gradient(135deg, #ffffff 0%, #f1f3f4 100%);
            padding: 20px;
            border-radius: 12px;
            border-left: 5px solid #667eea;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .payment-method {
            font-size: 16px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
        }

        .payment-terms {
            font-size: 14px;
            color: #7f8c8d;
            font-style: italic;
        }

        /* Footer */
        .footer-section {
            padding: 30px 40px;
            text-align: center;
            background: #2c3e50;
            color: white;
        }

        .footer-text {
            font-size: 14px;
            line-height: 1.6;
            margin: 8px 0;
        }

        .footer-text a {
            color: #ffeaa7;
            text-decoration: none;
            font-weight: 600;
        }

        .footer-disclaimer {
            font-size: 12px;
            opacity: 0.8;
            font-style: italic;
        }

        /* Responsive Design */
        @media screen and (max-width: 768px) {
            .invoice-container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .header-content {
                flex-direction: column;
                gap: 30px;
            }
            
            .invoice-meta {
                text-align: left;
                flex: none;
            }
            
            .summary-section {
                flex-direction: column;
                gap: 30px;
            }
            
            .qr-section {
                flex: none;
            }
            
            .items-table {
                font-size: 13px;
            }
            
            .items-table th,
            .items-table td {
                padding: 12px 8px;
            }
        }

        /* Print Styles */
        @media print {
            body {
                background: white;
            }
            
            .invoice-container {
                box-shadow: none;
                border-radius: 0;
                margin: 0;
                max-width: none;
            }
            
            .invoice-header::before {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Premium Header -->
        <header class="invoice-header">
            <div class="header-content">
                <div class="company-section">
                    <div class="company-logo">${companyInfo.logoPlaceholder}</div>
                    <h1 class="company-name">${companyInfo.name}</h1>
                    <div class="company-details">
                        <p>${companyInfo.address}</p>
                        <p>${companyInfo.cityStateZip}</p>
                        <p>${companyInfo.phone}</p>
                        <p>Email: <a href="mailto:${companyInfo.email}">${companyInfo.email}</a></p>
                    </div>
                </div>
                <div class="invoice-meta">
                    <h2 class="invoice-title">INVOICE</h2>
                    <div class="meta-item"><strong>Invoice #:</strong> ${orderNumber}</div>
                    ${accountNumber ? `<div class="meta-item"><strong>Account:</strong> ${accountNumber}</div>` : ''}
                    <div class="meta-item"><strong>Date:</strong> ${invoiceDate}</div>
                    <div class="meta-item"><strong>Terms:</strong> ${terms}</div>
                    <div class="meta-item"><strong>Rep:</strong> ${salesRep}</div>
                </div>
            </div>
        </header>

        <!-- Customer Information -->
        <section class="customer-section">
            <h3 class="bill-to-title">Bill To:</h3>
            <div class="customer-info">
                <p><strong>${customerName}</strong></p>
                ${customerAddress?.line1 ? `<p>${customerAddress.line1}</p>` : ''}
                ${customerAddress?.cityStateZip ? `<p>${customerAddress.cityStateZip}</p>` : ''}
                <p>Email: ${customerEmail}</p>
                <p>Phone: ${customerPhone}</p>
            </div>
        </section>

        <!-- Line Items -->
        <section class="items-section">
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="text-center">Qty<br>Ordered</th>
                        <th class="text-center">Qty<br>Shipped</th>
                        <th>Part Number</th>
                        <th>Description</th>
                        <th class="text-right">Unit Price</th>
                        <th class="text-right">Extended</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItemsHTML}
                    ${emptyRowsHTML}
                </tbody>
            </table>
        </section>

        <!-- Summary Section -->
        <section class="summary-section">
            <div class="qr-section">
                <div class="qr-placeholder">[QR CODE]</div>
                <p class="qr-text">Scan to view our<br>latest catalog</p>
            </div>
            <div class="totals-section">
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
            </div>
        </section>

        <!-- Payment Information -->
        <section class="payment-section">
            <div class="payment-info">
                <div class="payment-method">Payment Method: ${paymentMethod === 'credit' ? 'Credit Card on File' : 'Net-10 Open Account'}</div>
                ${paymentMethod === 'net10' ? '<div class="payment-terms">Payment due within 10 days of invoice date.</div>' : ''}
            </div>
        </section>

        <!-- Footer -->
        <section class="footer-section">
            <p class="footer-text">Thank you for your business! Questions about this invoice?</p>
            <p class="footer-text">Contact us at <a href="mailto:${companyInfo.email}">${companyInfo.email}</a> or ${companyInfo.phone}</p>
            <p class="footer-disclaimer">This is an automated invoice generated from your online order.</p>
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

  return `
INVOICE

${companyInfo.name}
${companyInfo.address}
${companyInfo.cityStateZip}
${companyInfo.phone}
Email: ${companyInfo.email}

Invoice Number: ${orderNumber}
${accountNumber ? `Account Number: ${accountNumber}` : ''}
Invoice Date: ${invoiceDate}
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
