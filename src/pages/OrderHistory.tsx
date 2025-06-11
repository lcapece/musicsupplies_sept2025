import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// --- Interfaces for the new Invoice Structure ---
interface AddressInfo {
  name: string;
  attn?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

interface OrderLineItem {
  lineKey: string;
  qtyOrdered: number;
  qtyShipped: number;
  partNumber: string;
  description: string;
  unitNet: number;
  extendedNet: number;
}

interface FullOrderDetails {
  invoiceNumber: string;
  accountNumber: string;
  invoiceDate: string;
  terms: string;
  salesRep: string;
  // customerPO?: string; // Removed
  billToAddress: AddressInfo | null;
  shipToAddress: AddressInfo | null;
  lineItems: OrderLineItem[];
  subtotal: number;
  shippingCharges: number;
  paymentsReceived: number;
  interestCharges: number;
  totalAmountDue: number;
}

const CompanyInfo = {
  name: "Lou Capece Music Distributors",
  address1: "2555 North Jerusalem Rd.",
  cityStateZip: "East Meadow, NY 11554",
  phone: "Toll Free 1(800) 321-5584",
  email: "marketing@loucapece.com"
};

const OrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<FullOrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const safeParseFloat = (value: any, defaultValue = 0): number => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return defaultValue;
    }
    const stringValue = String(value).replace(/\$|,/g, '');
    const num = parseFloat(stringValue);
    return isNaN(num) ? defaultValue : num;
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      const offset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() + offset);
      return localDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const fetchOrderHistoryDetails = useCallback(async (accountNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const accountNumberInt = parseInt(accountNumber, 10);
      if (isNaN(accountNumberInt)) {
        setError("Invalid account number format.");
        setLoading(false);
        return;
      }

      let billToAddress: AddressInfo | null = null;
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('acctname, address, address2, city, state, zip, phone, contact')
        .eq('accountnumber', accountNumber)
        .single();

      if (accountError) {
        console.warn('[OrderHistory] Error fetching account details:', accountError.message);
      } else if (accountData) {
        billToAddress = {
          name: accountData.acctname || 'N/A',
          attn: accountData.contact || undefined,
          address1: accountData.address || 'N/A',
          address2: accountData.address2 || undefined,
          city: accountData.city || 'N/A',
          state: accountData.state || 'N/A',
          zip: accountData.zip || 'N/A',
          phone: accountData.phone || undefined,
        };
      }
      
      const { data: rawOrderData, error: queryError } = await supabase
        .from('lcmd_ordhist')
        .select(`
          invoicenumber, accountnumber, invoicedate, terms, salesman, 
          linekey, model, Description, Qty, unitnet, ups, payments
        `) // customerpo removed from select, fields aligned with lcmd_ordhist
        .eq('accountnumber', accountNumberInt)
        .order('invoicedate', { ascending: false })
        .order('invoicenumber', { ascending: false });

      if (queryError) {
        console.error('[OrderHistory] Query Error fetching lcmd_ordhist:', queryError);
        setError(queryError.message);
        setOrders([]);
        setLoading(false);
        return;
      }

      if (!rawOrderData || rawOrderData.length === 0) {
        console.log('[OrderHistory] No order data found for account:', accountNumber);
        setOrders([]);
        setLoading(false);
        return;
      }

      const groupedByInvoice: { [key: string]: any[] } = {};
      for (const item of rawOrderData) {
        const invoiceNumStr = String(item.invoicenumber);
        if (!groupedByInvoice[invoiceNumStr]) {
          groupedByInvoice[invoiceNumStr] = [];
        }
        groupedByInvoice[invoiceNumStr].push(item);
      }

      const processedOrders: FullOrderDetails[] = Object.values(groupedByInvoice).map(itemsInInvoice => {
        const firstItem = itemsInInvoice[0];

        const lineItems: OrderLineItem[] = itemsInInvoice.map((item, index) => {
          const qtyVal = safeParseFloat(item.Qty); // Using item.Qty for both ordered and shipped
          const unitNet = safeParseFloat(item.unitnet);
          const extendedNet = qtyVal * unitNet; // Calculate extendedNet directly
          return {
            lineKey: item.linekey || `${item.invoicenumber}-${index}`,
            qtyOrdered: qtyVal, // Derived from Qty
            qtyShipped: qtyVal, // Derived from Qty
            partNumber: item.model ?? 'N/A',
            description: item.Description ?? 'N/A',
            unitNet: unitNet,
            extendedNet: extendedNet,
          };
        });

        const subtotal = lineItems.reduce((sum, item) => sum + item.extendedNet, 0);
        const shippingChargesVal = safeParseFloat(firstItem.ups); // Mapped from ups
        const paymentsReceivedVal = safeParseFloat(firstItem.payments); // Mapped from payments
        const interestChargesVal = 0; // Defaulted to 0
        
        return {
          invoiceNumber: String(firstItem.invoicenumber),
          accountNumber: String(firstItem.accountnumber),
          invoiceDate: formatDate(firstItem.invoicedate),
          terms: firstItem.terms ?? 'N/A',
          salesRep: firstItem.salesman ?? 'N/A',
          // customerPO: firstItem.customerpo || undefined, // Removed
          billToAddress: billToAddress,
          shipToAddress: null, // Set to null as per original working fix
          lineItems: lineItems,
          subtotal: subtotal,
          shippingCharges: shippingChargesVal,
          paymentsReceived: paymentsReceivedVal,
          interestCharges: interestChargesVal, 
          totalAmountDue: subtotal + shippingChargesVal - paymentsReceivedVal + interestChargesVal, // Calculated
        };
      });
      
      console.log('[OrderHistory] Processed orders:', processedOrders);
      setOrders(processedOrders);

    } catch (err: any) {
      console.error('[OrderHistory] Unexpected error in fetchOrderHistoryDetails:', err);
      setError(err.message || 'An unexpected error occurred.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.accountNumber) {
      fetchOrderHistoryDetails(user.accountNumber);
    } else {
      if (user === null) { 
         setLoading(false);
         console.log('[OrderHistory] No user logged in.');
         setOrders([]);
      } else if (user === undefined) { 
        console.log('[OrderHistory] User context is loading or not yet available.');
      }
    }
  }, [user, fetchOrderHistoryDetails]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading order history...</div>;
  if (error) return <div className="p-6 text-red-600 text-center">Error: {error}</div>;
  if (!user) return <div className="p-6 text-center text-gray-500">Please log in to view order history.</div>;
  if (orders.length === 0) return <div className="p-6 text-center text-gray-500">No order history found for account {user.accountNumber}.</div>;

  return (
    <div className="p-4 sm:p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Order History</h1>
      <div className="space-y-8 max-w-4xl mx-auto">
        {orders.map((order) => (
          <div key={order.invoiceNumber} className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-2xl font-bold text-blue-700">{CompanyInfo.name}</h2>
                <p className="text-sm text-gray-600">{CompanyInfo.address1}</p>
                <p className="text-sm text-gray-600">{CompanyInfo.cityStateZip}</p>
                <p className="text-sm text-gray-600">{CompanyInfo.phone}</p>
                <p className="text-sm text-gray-600">
                  Reply to: <a href={`mailto:${CompanyInfo.email}`} className="text-blue-600 hover:underline">{CompanyInfo.email}</a>
                </p>
              </div>
              <div className="text-sm text-gray-700 sm:text-right">
                <h3 className="text-xl font-bold mb-2">Invoice Number: {order.invoiceNumber}</h3>
                <p><strong>Acct No.:</strong> {order.accountNumber}</p>
                <p><strong>Invoice Date:</strong> {order.invoiceDate}</p>
                <p><strong>Terms:</strong> {order.terms}</p>
                <p><strong>Sales Rep:</strong> {order.salesRep}</p>
                {/* {order.customerPO && <p><strong>Your PO:</strong> {order.customerPO}</p>} Removed */}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 pb-6 border-b">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Bill To:</h4>
                {order.billToAddress ? (
                  <>
                    <p>{order.billToAddress.name}</p>
                    {order.billToAddress.attn && <p>Attn: {order.billToAddress.attn}</p>}
                    <p>{order.billToAddress.address1}</p>
                    {order.billToAddress.address2 && <p>{order.billToAddress.address2}</p>}
                    <p>{order.billToAddress.city}, {order.billToAddress.state} {order.billToAddress.zip}</p>
                    {order.billToAddress.phone && <p>Phone: {order.billToAddress.phone}</p>}
                  </>
                ) : <p>N/A</p>}
              </div>
              {/* Ship To section removed as per requirement to not display ship to fields
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Ship To:</h4>
                {order.shipToAddress ? (
                  <>
                    <p>{order.shipToAddress.name}</p>
                    {order.shipToAddress.attn && <p>Attn: {order.shipToAddress.attn}</p>}
                    <p>{order.shipToAddress.address1}</p>
                    {order.shipToAddress.address2 && <p>{order.shipToAddress.address2}</p>}
                    <p>{order.shipToAddress.city}, {order.shipToAddress.state} {order.shipToAddress.zip}</p>
                  </>
                ) : <p>N/A</p>}
              </div>
              */}
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left font-semibold text-gray-600">Qty Ord</th>
                    <th className="p-2 text-left font-semibold text-gray-600">Qty Shp</th>
                    <th className="p-2 text-left font-semibold text-gray-600">Part Number</th>
                    <th className="p-2 text-left font-semibold text-gray-600 w-2/5">Description</th>
                    <th className="p-2 text-right font-semibold text-gray-600">Unit Net</th>
                    <th className="p-2 text-right font-semibold text-gray-600">Extended Net</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lineItems.map((item) => (
                    <tr key={item.lineKey} className="border-b last:border-b-0">
                      <td className="p-2">{item.qtyOrdered}</td>
                      <td className="p-2">{item.qtyShipped}</td>
                      <td className="p-2">{item.partNumber}</td>
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-right">${item.unitNet.toFixed(2)}</td>
                      <td className="p-2 text-right">${item.extendedNet.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full sm:w-1/2 md:w-1/3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-800">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping Charges:</span>
                  <span className="text-gray-800">${order.shippingCharges.toFixed(2)}</span>
                </div>
                {order.paymentsReceived !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payments Received:</span>
                    <span className="text-gray-800">(${Math.abs(order.paymentsReceived).toFixed(2)})</span>
                  </div>
                )}
                {order.interestCharges !== 0 && ( 
                   <div className="flex justify-between">
                     <span className="text-gray-600">Interest Charges on Overdue Invoice:</span>
                     <span className="text-gray-800">${order.interestCharges.toFixed(2)}</span>
                   </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span className="text-gray-800">TOTAL AMOUNT DUE:</span>
                  <span className="text-red-600">${order.totalAmountDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;
