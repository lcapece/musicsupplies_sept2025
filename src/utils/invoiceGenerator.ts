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

  // Generate line items HTML
  const lineItemsHTML = items.map(item => `
    <tr>
      <td>${item.quantity}</td>
      <td>${item.quantity}</td>
      <td>${item.partnumber}</td>
      <td>${item.description || ''}</td>
      <td class="text-right">$${(item.price || 0).toFixed(2)}</td>
      <td class="text-right">$${((item.price || 0) * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  // Add empty rows to match the original template structure (minimum 6 rows total)
  const emptyRowsNeeded = Math.max(0, 6 - items.length);
  const emptyRowsHTML = Array(emptyRowsNeeded).fill(0).map(() => `
    <tr>
      <td>&nbsp;</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
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
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #fff;
            color: #000;
            font-size: 10pt;
        }

        .invoice-box {
            max-width: 850px;
            margin: auto;
            padding: 20px;
            border: none;
            background-color: #fff;
            box-shadow: none;
        }

        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 2px solid #000;
        }

        .company-details h2 {
            margin: 0 0 5px 0;
            font-size: 16pt;
            font-weight: bold;
            color: #000080;
        }

        .company-details p {
            margin: 2px 0;
            font-size: 10pt;
        }

        .company-details a {
            color: #0000FF;
            text-decoration: underline;
        }

        .logo-placeholder {
            font-size: 12pt;
            color: #666;
            font-style: italic;
            margin-bottom: 10px;
            padding: 10px;
            border: 1px dashed #ccc;
            text-align: center;
        }

        .invoice-info {
            text-align: right;
        }

        .invoice-info h1 {
            margin: 0 0 10px 0;
            font-size: 18pt;
            font-weight: bold;
        }

        .invoice-info p {
            margin: 2px 0;
            font-size: 10pt;
        }

        .bill-to {
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #000;
        }

        .bill-to p {
            margin: 2px 0;
            font-size: 10pt;
        }

        .bill-to strong {
            font-weight: bold;
            font-style: italic;
        }

        .line-items table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        .line-items th, .line-items td {
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: left;
            font-size: 9pt;
            vertical-align: top;
        }

        .line-items th {
            background-color: #000;
            color: #fff;
            font-weight: bold;
            text-align: center;
        }

        .line-items td {
            height: auto;
            min-height: 20px;
        }

        .line-items .desc-header {
            width: 45%;
        }

        .line-items .text-right {
            text-align: right;
        }

        .summary-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #000;
        }

        .qr-code {
            width: 20%;
            text-align: center;
        }

        .qr-placeholder {
            width: 80px;
            height: 80px;
            margin: 0 auto 5px;
            border: 1px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8pt;
            color: #666;
        }

        .qr-code p {
            font-size: 8pt;
            margin: 0;
            line-height: 1.2;
        }

        .totals {
            width: 45%;
        }

        .totals table {
            width: 100%;
            border-collapse: collapse;
        }

        .totals td {
            padding: 3px 6px;
            font-size: 10pt;
            border: none;
        }

        .totals .label {
            text-align: right;
            font-style: italic;
            width: 70%;
        }

        .totals .amount {
            text-align: right;
            font-weight: bold;
        }

        .totals .total-due-label {
            font-weight: bold;
            font-size: 10pt;
            font-style: normal;
        }

        .totals .total-due-amount {
            font-weight: bold;
            font-size: 10pt;
            color: #FF0000;
        }

        .payment-info {
            margin-top: 15px;
            padding: 10px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            font-size: 9pt;
        }

        .footer-note {
            margin-top: 20px;
            font-size: 9pt;
            color: #666;
            text-align: center;
        }

        /* Email-specific styles */
        @media screen and (max-width: 600px) {
            .invoice-header {
                flex-direction: column;
            }
            
            .invoice-info {
                text-align: left;
                margin-top: 10px;
            }
            
            .summary-section {
                flex-direction: column;
            }
            
            .totals {
                width: 100%;
                margin-top: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <header class="invoice-header">
            <div class="company-details">
                <div class="logo-placeholder">${companyInfo.logoPlaceholder}</div>
                <h2>${companyInfo.name}</h2>
                <p>${companyInfo.address}</p>
                <p>${companyInfo.cityStateZip}</p>
                <p>${companyInfo.phone}</p>
                <p>Reply to: <a href="mailto:${companyInfo.email}">${companyInfo.email}</a></p>
            </div>
            <div class="invoice-info">
                <h1>Invoice Number: ${orderNumber}</h1>
                ${accountNumber ? `<p>Acct No.: ${accountNumber}</p>` : ''}
                <p>Invoice Date: ${invoiceDate}</p>
                <p>Terms: ${terms}</p>
                <p>Sales Rep: ${salesRep}</p>
            </div>
        </header>

        <section class="bill-to">
            <p><strong>Bill To:</strong></p>
            <p>${customerName}</p>
            ${customerAddress?.line1 ? `<p>${customerAddress.line1}</p>` : ''}
            ${customerAddress?.cityStateZip ? `<p>${customerAddress.cityStateZip}</p>` : ''}
            <p>Email: ${customerEmail}</p>
            <p>Phone: ${customerPhone}</p>
        </section>

        <section class="line-items">
            <table>
                <thead>
                    <tr>
                        <th>Qty Ordered</th>
                        <th>Qty Shipped</th>
                        <th>Part Number</th>
                        <th class="desc-header">Desc</th>
                        <th class="text-right">Unit Net</th>
                        <th class="text-right">Extended Net</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItemsHTML}
                    ${emptyRowsHTML}
                </tbody>
            </table>
        </section>

        <section class="summary-section">
            <div class="qr-code">
                <div class="qr-placeholder">[QR CODE]</div>
                <p>Scan QR Code<br>to view our<br>latest catalog</p>
            </div>
            <div class="totals">
                <table>
                    <tr>
                        <td class="label">Subtotal:</td>
                        <td class="amount">$${subtotal.toFixed(2)}</td>
                    </tr>
                    ${shippingCharges > 0 ? `
                    <tr>
                        <td class="label">Shipping Charges:</td>
                        <td class="amount">$${shippingCharges.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    ${promoCodeDiscount > 0 ? `
                    <tr>
                        <td class="label">Promo Code Discount${promoCodeDescription ? ` (${promoCodeDescription})` : ''}:</td>
                        <td class="amount">-$${promoCodeDiscount.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    ${paymentsReceived > 0 ? `
                    <tr>
                        <td class="label">Payments Received:</td>
                        <td class="amount">-$${paymentsReceived.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    ${interestCharges > 0 ? `
                    <tr>
                        <td class="label">Interest Charges on Overdue Invoice:</td>
                        <td class="amount">$${interestCharges.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td class="label total-due-label">Total Amount Due:</td>
                        <td class="amount total-due-amount">$${totalAmountDue.toFixed(2)}</td>
                    </tr>
                </table>
            </div>
        </section>

        <div class="payment-info">
            <strong>Payment Method:</strong> ${paymentMethod === 'credit' ? 'Credit Card on File' : 'Net-10 Open Account'}
            ${paymentMethod === 'net10' ? '<br><em>Payment due within 10 days of invoice date.</em>' : ''}
        </div>

        <div class="footer-note">
            <p>Thank you for your business! Questions about this invoice? Contact us at ${companyInfo.email} or ${companyInfo.phone}</p>
            <p><em>This is an automated invoice generated from your online order.</em></p>
        </div>
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
