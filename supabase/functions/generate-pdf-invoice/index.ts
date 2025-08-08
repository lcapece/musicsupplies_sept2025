// @deno-types="https://deno.land/x/puppeteer@16.2.0/mod.ts"
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PDFRequest {
  invoiceData: {
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
    items: Array<{
      partnumber: string;
      description?: string;
      quantity: number;
      price?: number;
    }>;
    subtotal: number;
    shippingCharges?: number;
    paymentsReceived?: number;
    interestCharges?: number;
    promoCodeDiscount?: number;
    promoCodeDescription?: string;
    totalAmountDue: number;
    paymentMethod: 'credit' | 'net10';
  };
  companyInfo?: {
    name: string;
    address: string;
    cityStateZip: string;
    phone: string;
    email: string;
    logoPlaceholder?: string;
  };
}

const defaultCompanyInfo = {
  name: "Lou Capece Music Distributors",
  address: "2555 North Jerusalem Rd.",
  cityStateZip: "East Meadow, NY 11554",
  phone: "Toll Free 1(800) 321-5584",
  email: "marketing@loucapecemusic.com",
  logoPlaceholder: "[COMPANY LOGO]"
};

// Embedded invoice HTML generator for PDF
function generateInvoiceHTML(invoiceData: PDFRequest['invoiceData'], companyInfo = defaultCompanyInfo): string {
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
    promoCodeDiscount = 0,
    promoCodeDescription,
    totalAmountDue,
    paymentMethod
  } = invoiceData;

  // Fix order number display - ensure single WB prefix for web orders
  const orderNum = parseInt(orderNumber.replace(/[^\d]/g, ''));
  const isWebOrder = orderNum >= 750000 && orderNum <= 770000;
  const displayLabel = isWebOrder ? "WEB ORDER" : "INVOICE";
  const displayNumber = isWebOrder ? 
    (orderNumber.startsWith('WB') ? orderNumber : `WB${orderNumber}`) : 
    orderNumber;

  // Generate line items HTML
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

  // Add empty rows for professional appearance
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Number: ${orderNumber}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: white; color: #000; line-height: 1.4; font-size: 12px; }
        .invoice-container { width: 210mm; max-width: 210mm; margin: 0 auto; padding: 15mm; background: white; box-sizing: border-box; }
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .company-section { flex: 1; }
        .company-website { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
        .company-name { font-size: 18px; font-weight: bold; color: #2c5aa0; margin-bottom: 15px; }
        .company-details { font-size: 11px; color: #333; line-height: 1.5; }
        .invoice-meta { text-align: right; flex: 0 0 200px; }
        .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 15px; color: #4a90a4; }
        .meta-item { font-size: 11px; margin: 3px 0; color: #333; }
        .meta-item strong { color: #000; }
        .customer-sections { display: flex; gap: 20px; margin-bottom: 20px; }
        .customer-section { flex: 1; padding: 12px; border: 2px solid #000; min-height: 120px; }
        .bill-to-title, .ship-to-title { font-size: 12px; font-weight: bold; margin-bottom: 8px; text-decoration: underline; }
        .customer-info { font-size: 11px; line-height: 1.4; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
        .items-table th { background: #4a90a4; color: white; padding: 8px 6px; text-align: center; font-weight: bold; border: 1px solid #000; font-size: 10px; }
        .items-table th.text-left { text-align: left; }
        .items-table th.text-right { text-align: right; }
        .items-table td { padding: 6px; border: 1px solid #000; vertical-align: top; font-size: 10px; }
        .items-table tbody tr.row-even { background-color: white; }
        .items-table tbody tr.row-odd { background-color: white; }
        .qty-cell { text-align: center; width: 8%; }
        .part-cell { text-align: left; width: 15%; }
        .desc-cell { text-align: left; width: 47%; }
        .price-cell, .total-cell { text-align: right; width: 15%; }
        .empty-row td { height: 20px; }
        .totals-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .discount-box { flex: 0 0 150px; border: 2px dashed #000; padding: 15px; text-align: center; margin-right: 20px; }
        .discount-text { font-size: 10px; font-weight: bold; margin-bottom: 5px; }
        .totals-table { flex: 0 0 300px; border-collapse: collapse; font-size: 11px; }
        .totals-table td { padding: 6px 12px; border: 1px solid #000; }
        .total-label { text-align: right; font-weight: bold; width: 60%; }
        .total-amount { text-align: right; font-weight: bold; width: 40%; }
        .grand-total-row { background: white; }
        .grand-total-row .total-label, .grand-total-row .total-amount { font-size: 14px; font-weight: bold; }
        .footer-section { margin-top: 30px; text-align: center; font-size: 10px; color: #333; }
        @media print { body { margin: 0; padding: 0; } .invoice-container { margin: 0; padding: 15mm; box-shadow: none; border: none; } @page { size: A4; margin: 10mm; } }
    </style>
</head>
<body>
    <div class="invoice-container">
        <header class="invoice-header">
            <div class="company-section">
                <div class="company-website">MusicSupplies<span style="color: #dc3545;">Supplies</span>.com</div>
                <h1 class="company-name">${companyInfo.name}</h1>
                <div class="company-details">
                    <div>${companyInfo.address}</div>
                    <div>${companyInfo.cityStateZip}</div>
                    <div>${companyInfo.phone}</div>
                    <div>Reply to: ${companyInfo.email}</div>
                </div>
            </div>
            <div class="invoice-meta">
                <h2 class="invoice-title">${displayLabel}</h2>
                <div class="meta-item"><strong>Web Order:</strong> ${displayNumber}</div>
                ${accountNumber ? `<div class="meta-item"><strong>Acct No.:</strong> ${accountNumber}</div>` : ''}
                <div class="meta-item"><strong>Order Date:</strong> ${invoiceDate}</div>
                <div class="meta-item"><strong>Terms:</strong> ${terms}</div>
                <div class="meta-item"><strong>Sales Rep:</strong> ${salesRep}</div>     
            </div>
        </header>

        ${(!shippingCharges || shippingCharges === 0) ? `
        <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #fff3cd; border: 2px solid #dc3545;">
            <h2 style="color: #dc3545; font-weight: bold; margin: 0; font-size: 18px;">
                PROFORMA INVOICE - SHIPPING NOT YET CALCULATED
            </h2>
        </div>
        ` : ''}

        <section class="customer-sections">
            <div class="customer-section">
                <h3 class="bill-to-title">Bill To:</h3>
                <div class="customer-info">
                    <div><strong>${customerName}</strong></div>
                    ${customerAddress?.line1 ? `<div>${customerAddress.line1}</div>` : ''}
                    ${customerAddress?.cityStateZip ? `<div>${customerAddress.cityStateZip}</div>` : ''}
                    <div>Email: ${customerEmail}</div>
                    <div>Phone: ${customerPhone}</div>
                </div>
            </div>
            <div class="customer-section">
                <h3 class="ship-to-title">Ship To:</h3>
                <div class="customer-info">
                    ${shippingAddress && shippingAddress.line1 ? `
                        <div><strong>${shippingAddress.name || customerName}</strong></div>
                        <div>${shippingAddress.line1}</div>
                        <div>${shippingAddress.cityStateZip || ''}</div>
                    ` : `<div>&nbsp;</div><div>&nbsp;</div><div>&nbsp;</div>`}
                </div>
            </div>
        </section>

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

        <section class="totals-section">
            <div class="discount-box">
                ${promoCodeDiscount > 0 && promoCodeDescription ? `
                    <div class="discount-text">${promoCodeDescription}</div>
                    <div class="discount-text">Discount: $${promoCodeDiscount.toFixed(2)}</div>
                ` : `<div class="discount-text">&nbsp;</div><div class="discount-text">&nbsp;</div>`}
            </div>
            <table class="totals-table">
                <tr>
                    <td class="total-label">Subtotal:</td>
                    <td class="total-amount">$${subtotal.toFixed(2)}</td>
                </tr>
                ${promoCodeDiscount > 0 ? `
                <tr>
                    <td class="total-label">Discount ${promoCodeDescription ? `(${promoCodeDescription})` : ''}:</td>
                    <td class="total-amount">-$${promoCodeDiscount.toFixed(2)}</td>
                </tr>` : ''}
                ${shippingCharges > 0 ? `
                <tr>
                    <td class="total-label">Shipping:</td>
                    <td class="total-amount">$${shippingCharges.toFixed(2)}</td>
                </tr>` : ''}
                ${paymentsReceived > 0 ? `
                <tr>
                    <td class="total-label">Payments Received:</td>
                    <td class="total-amount">-$${paymentsReceived.toFixed(2)}</td>
                </tr>` : ''}
                <tr class="grand-total-row">
                    <td class="total-label">Total Due:</td>
                    <td class="total-amount">$${totalAmountDue.toFixed(2)}</td>
                </tr>
            </table>
        </section>

        <section class="payment-method-section" style="margin-bottom: 20px; padding: 10px; border: 1px solid #000;">
            <strong>Payment Method: ${paymentMethod === 'credit' ? 'Credit Card on File' : 'Net-10 Open Account'}</strong>
            ${paymentMethod === 'net10' ? '<br>Payment due within 10 days of invoice date.' : ''}
        </section>

        <section class="footer-section">
            <div>Thank you for your business!</div>
        </section>
    </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invoiceData, companyInfo }: PDFRequest = await req.json()

    if (!invoiceData || !invoiceData.orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required invoice data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Generating PDF for order:', invoiceData.orderNumber)

    const htmlContent = generateInvoiceHTML(invoiceData, companyInfo)

    console.log('Launching browser...')
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    })

    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    
    console.log('Generating PDF...')
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true,
      preferCSSPageSize: false
    })

    await browser.close()

    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    // Convert to base64 for response
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))

    return new Response(
      JSON.stringify({ 
        success: true,
        pdf: base64PDF,
        filename: `Invoice-${invoiceData.orderNumber}.pdf`,
        size: pdfBuffer.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating PDF:', error)
    
    return new Response(
      JSON.stringify({ 
        error: `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
