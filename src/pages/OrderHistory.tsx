import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Define interfaces for our processed data
interface LineItem {
  linekey: number | string; // Assuming linekey is present and unique for items within an invoice
  model: string;
  description: string;
  qty: number;
  unitNet: number;
  extendedNetPrice: number;
}

interface ProcessedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  salesman: string;
  terms: string;
  lineItems: LineItem[];
  totalExtendedNetPrice: number;
  shippingCharge: number;
  subtotalBeforePayments: number; // totalExtendedNetPrice + shippingCharge
  paymentsReceived: number; // Will now come from the RPC result
  netAmountDue: number;
}

const OrderHistory: React.FC = () => {
  const [processedInvoices, setProcessedInvoices] = useState<ProcessedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const safeParseFloat = (value: any, defaultValue = 0): number => {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    // Attempt to remove common currency symbols and thousands separators
    const stringValue = String(value).replace(/\$|,/g, '');
    const num = parseFloat(stringValue);
    return isNaN(num) ? defaultValue : num;
  };

  useEffect(() => {
    if (user?.accountNumber) {
      fetchOrders(user.accountNumber);
    } else {
      if (user === null && loading) {
         setLoading(false);
         console.log('[OrderHistory] No user logged in or user data not yet available.');
         setProcessedInvoices([]);
         setLoading(false); 
      } else if (user === undefined && loading) {
        console.log('[OrderHistory] User context is loading.');
      }
    }
  }, [user]);

  const fetchOrders = async (accountNumber: string) => {
    setLoading(true); 
    setError(null);
    try {
      const accountNumberInt = parseInt(accountNumber, 10);
      if (isNaN(accountNumberInt)) {
        setError("Invalid account number format.");
        setLoading(false);
        return;
      }

      // Use direct query to lcmd_ordhist instead of RPC
      const { data: rawOrderData, error: queryError } = await supabase
        .from('lcmd_ordhist')
        .select('*')
        .eq('accountnumber', accountNumberInt);

      if (queryError) {
        console.error('[OrderHistory] Query Error:', queryError);
        setError(queryError.message);
        setProcessedInvoices([]);
        setLoading(false);
        return;
      }

      if (!rawOrderData || rawOrderData.length === 0) {
        console.log('[OrderHistory] No order data found for account:', accountNumber);
        setProcessedInvoices([]);
        setLoading(false);
        return;
      }

      console.log('[OrderHistory] Raw data from query:', rawOrderData);

      const groupedByInvoice: { [key: string]: any[] } = {};
      for (const item of rawOrderData) {
        const invoiceNumStr = String(item.invoicenumber);
        if (!groupedByInvoice[invoiceNumStr]) {
          groupedByInvoice[invoiceNumStr] = [];
        }
        groupedByInvoice[invoiceNumStr].push(item);
      }

      const invoices: ProcessedInvoice[] = Object.values(groupedByInvoice).map(itemsInInvoice => {
        const firstItem = itemsInInvoice[0];

        const lineItems: LineItem[] = itemsInInvoice.map(item => {
          const rawQty = item.Qty;
          const rawUnitNet = item.unitnet;

          const qty = safeParseFloat(rawQty);
          const unitNet = safeParseFloat(rawUnitNet);
          
          const calculatedExtendedNetPrice = qty * unitNet;

          return {
            linekey: item.linekey || `${item.invoicenumber}-${item.model}`,
            model: item.model ?? 'N/A',
            description: item.Description ?? 'N/A',
            qty: qty,
            unitNet: unitNet,
            extendedNetPrice: calculatedExtendedNetPrice,
          };
        });

        const totalExtendedNetPrice = lineItems.reduce((sum, item) => sum + item.extendedNetPrice, 0);
        
        const upsValues = itemsInInvoice.map(item => safeParseFloat(item.ups)).filter(ups => ups > 0);
        const shippingCharge = upsValues.length > 0 ? Math.max(...upsValues) : 0;
        
        const subtotalBeforePayments = totalExtendedNetPrice + shippingCharge;
        
        // Use payments field from first item or default to 0
        const paymentsReceived = safeParseFloat(firstItem.payments);
        const netAmountDue = subtotalBeforePayments - paymentsReceived;

        return {
          invoiceNumber: String(firstItem.invoicenumber),
          invoiceDate: firstItem.invoicedate ?? 'N/A',
          salesman: firstItem.salesman ?? 'N/A',
          terms: firstItem.terms ?? 'N/A',
          lineItems: lineItems,
          totalExtendedNetPrice: totalExtendedNetPrice,
          shippingCharge: shippingCharge,
          subtotalBeforePayments: subtotalBeforePayments,
          paymentsReceived: paymentsReceived,
          netAmountDue: netAmountDue,
        };
      }).sort((a, b) => parseInt(b.invoiceNumber, 10) - parseInt(a.invoiceNumber, 10));

      console.log('[OrderHistory] Processed invoices:', invoices);
      setProcessedInvoices(invoices);

    } catch (err: any) {
      console.error('[OrderHistory] Unexpected error in fetchOrders:', err);
      setError(err.message || 'An unexpected error occurred.');
      setProcessedInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading order history...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600 text-center">Error loading order history: {error}</div>;
  }

  if (!user) {
    return <div className="p-6 text-center">Please log in to view your order history.</div>;
  }

  if (processedInvoices.length === 0) {
    return <div className="p-6 text-center">No order history found for account {user.accountNumber}.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Order History for Account {user.accountNumber}
        </h2>
        
        {processedInvoices.map(invoice => (
          <div key={invoice.invoiceNumber} className="mb-8 bg-white p-6 rounded-lg shadow-md">
            {/* Invoice Header */}
            <div className="pb-4 mb-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-blue-600">Invoice: {invoice.invoiceNumber}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                <p><strong>Date:</strong> {invoice.invoiceDate}</p>
                <p><strong>Salesman:</strong> {invoice.salesman}</p>
                <p><strong>Terms:</strong> {invoice.terms}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-700 mb-2">Items:</h4>
              <ul className="space-y-3">
                {invoice.lineItems.map(item => (
                  <li key={item.linekey} className="p-3 bg-gray-100 rounded-md text-sm">
                    <div className="font-medium text-gray-800">{item.model} - {item.description}</div>
                    <div className="text-gray-600">
                      Qty: {item.qty} @ ${item.unitNet.toFixed(2)} 
                      <span className="float-right font-medium">Ext. Price: ${item.extendedNetPrice.toFixed(2)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Invoice Footer / Totals */}
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm">
              <div className="space-y-1">
                <p className="flex justify-between">
                  <span>Total Item Price:</span>
                  <span>${invoice.totalExtendedNetPrice.toFixed(2)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Shipping Charge:</span>
                  <span>${invoice.shippingCharge.toFixed(2)}</span>
                </p>
                <p className="flex justify-between font-semibold text-gray-700">
                  <span>Subtotal:</span>
                  <span>${invoice.subtotalBeforePayments.toFixed(2)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Payments Received:</span>
                  <span>-${invoice.paymentsReceived.toFixed(2)}</span>
                </p>
                <p className="flex justify-between font-bold text-lg text-red-600 mt-1">
                  <span>NET AMOUNT DUE:</span>
                  <span>${invoice.netAmountDue.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;