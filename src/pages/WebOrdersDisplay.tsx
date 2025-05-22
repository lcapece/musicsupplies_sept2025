import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface OrderItem {
  part_number: string;
  quantity: number;
  description?: string; // To be enriched
  unit_price?: number;  // To be enriched
  item_total?: number;  // To be calculated
}

interface WebOrder {
  order_id: string; 
  order_number: number;
  account_number: number;
  order_comments: string;
  order_items: OrderItem[];
  total_price: number; // This is the grand total for the order
  status: string;
  created_at: string;
  // Add fields that might be needed for the invoice from customer details if available
  customer_name?: string; 
  customer_contact_person?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_zip?: string;
  customer_phone?: string;
  salesperson?: string; // Assuming this might come from order or related table
  terms?: string; // Assuming this might come from order or related table
  reference?: string; // Assuming this might come from order or related table
}

const WebOrdersDisplay: React.FC = () => {
  const [webOrders, setWebOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  // const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<WebOrder | null>(null);
  // const [isInvoicePopupOpen, setIsInvoicePopupOpen] = useState(false);


  useEffect(() => {
    if (user?.accountNumber === '999') {
      fetchWebOrdersWithCustomerDetails();
    } else {
      setLoading(false);
      setError("Access denied. This page is for administrators only.");
    }
  }, [user]);

  const fetchWebOrdersWithCustomerDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch web orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('web_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching web orders:', ordersError);
        setError(ordersError.message);
        setWebOrders([]);
        setLoading(false);
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        setWebOrders([]);
        setLoading(false);
        return;
      }

      // Get unique account numbers to fetch customer details
      const accountNumbers = [...new Set(ordersData.map(order => order.account_number))];
      
      const { data: customersData, error: customersError } = await supabase
        .from('accounts') // Assuming customer table is 'accounts'
        .select('account_number, account_name, contact_person, address_line1, city, state, zip_code, phone_number')
        .in('account_number', accountNumbers);

      if (customersError) {
        console.error('Error fetching customer details:', customersError);
      }
      const customersMap = new Map(customersData?.map(cust => [cust.account_number, cust]));

      // Extract all unique part numbers from order_items to fetch product details
      let allPartNumbers: string[] = [];
      ordersData.forEach(order => {
        if (order.order_items && Array.isArray(order.order_items)) {
          order.order_items.forEach((item: any) => { // item is initially any, will be cast to OrderItem
            if (item.part_number) {
              allPartNumbers.push(item.part_number);
            }
          });
        }
      });
      const uniquePartNumbers = [...new Set(allPartNumbers)];

      let productsMap = new Map();
      if (uniquePartNumbers.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products') // Assuming products table is 'products'
          .select('part_number, description, price') // Assuming 'price' is unit_price
          .in('part_number', uniquePartNumbers);

        if (productsError) {
          console.error('Error fetching product details:', productsError);
        } else {
          productsMap = new Map(productsData?.map(prod => [prod.part_number, prod]));
        }
      }

      const enrichedOrders = ordersData.map(order => {
        const customer = customersMap.get(order.account_number);
        const enrichedOrderItems = (order.order_items && Array.isArray(order.order_items)) 
          ? order.order_items.map((item: any) => {
              const product = productsMap.get(item.part_number);
              const unitPrice = product?.price ?? 0;
              const quantity = item.quantity ?? 0;
              return {
                part_number: item.part_number,
                quantity: quantity,
                description: product?.description ?? 'N/A',
                unit_price: unitPrice,
                item_total: quantity * unitPrice,
              };
            })
          : [];
        
        return {
          ...order,
          customer_name: customer?.account_name,
          customer_contact_person: customer?.contact_person,
          customer_address: customer?.address_line1,
          customer_city: customer?.city,
          customer_state: customer?.state,
          customer_zip: customer?.zip_code,
          customer_phone: customer?.phone_number,
          salesperson: 'Web Sale', 
          terms: 'Net 30',
          reference: `WB${order.order_number}`,
          order_items: enrichedOrderItems, // Replace with enriched items
        };
      });

      setWebOrders(enrichedOrders);

    } catch (err: any) {
      console.error('Unexpected error fetching data:', err);
      setError(err.message || 'An unexpected error occurred.');
      setWebOrders([]);
    } finally {
      setLoading(false);
    }
  };


  const populateInvoiceHtml = (htmlTemplate: string, order: WebOrder): string => {
    let populatedHtml = htmlTemplate;
    const now = new Date();

    const placeholders: Record<string, string | number | undefined> = {
        '{account name}': order.customer_name || `Account ${order.account_number}`,
        '{contact}': order.customer_contact_person || 'N/A',
        '{Address}': order.customer_address || 'N/A',
        '{city}': order.customer_city || 'N/A',
        '{state}': order.customer_state || 'N/A',
        '{zip}': order.customer_zip || 'N/A',
        '{phone}': order.customer_phone || 'N/A',
        '{Comments}': order.order_comments || 'None',
        '{salesperson}': order.salesperson || 'N/A',
        '{invoice_date}': now.toLocaleDateString(),
        '{terms}': order.terms || 'N/A',
        '{reference}': order.reference || `WB${order.order_number}`,
        '{subtotal}': (order.total_price ?? 0).toFixed(2),
        '{credit_card_surcharge}': (0.00).toFixed(2), // Assuming 0 for now
        '{shipping_handling}': (0.00).toFixed(2), // Assuming 0 for now
        '{total_due}': (order.total_price ?? 0).toFixed(2), // Assuming total_due is same as total_price for now
    };

    for (const key in placeholders) {
        populatedHtml = populatedHtml.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(placeholders[key]));
    }
    
    // Populate line items
    let itemsHtml = '';
    const maxItemsToShow = 8; // Number of rows in the template
    for (let i = 0; i < maxItemsToShow; i++) {
        const item = order.order_items && order.order_items[i];
        if (item) {
            itemsHtml += `
                <tr>
                    <td>${item.part_number || ''}</td>
                    <td>${item.quantity || 0}</td>
                    <td>${item.description || 'N/A'}</td>
                    <td>${(item.unit_price || 0).toFixed(2)}</td>
                    <td>${(item.item_total || 0).toFixed(2)}</td>
                </tr>`;
        } else {
             itemsHtml += `
                <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>`;
        }
    }
    
    // Replace the entire tbody content for line items
    // This assumes a simple structure; might need adjustment if template is complex
    const tbodyRegex = /<section class="line-items">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>[\s\S]*?<\/section>/;
    populatedHtml = populatedHtml.replace(tbodyRegex, (match, group1) => match.replace(group1, itemsHtml));


    return populatedHtml;
  };


  const handleShowInvoice = async (order: WebOrder) => {
    // setSelectedOrderForInvoice(order);
    // setIsInvoicePopupOpen(true);
    try {
        const response = await fetch('/invoices/invoice.html'); // Adjusted path assuming it's moved to public/invoices/
        if (!response.ok) {
            throw new Error(`Failed to fetch invoice template: ${response.statusText}`);
        }
        const htmlTemplate = await response.text();
        const populatedHtml = populateInvoiceHtml(htmlTemplate, order);

        const popupWindow = window.open('', `_blank`, 'width=850,height=1100,scrollbars=yes,resizable=yes');
        if (popupWindow) {
            popupWindow.document.open();
            popupWindow.document.write(populatedHtml);
            popupWindow.document.close();
            // Optional: Inject CSS if not linked properly in invoice.html or if dynamic styling is needed
            const styleLink = popupWindow.document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = '/invoices/invoice.css'; // Adjust path if necessary, assuming CSS is also moved
            popupWindow.document.head.appendChild(styleLink);
        } else {
            alert('Popup blocked. Please allow popups for this site.');
        }
    } catch (e: any) {
        console.error("Error showing invoice:", e);
        setError(`Could not load invoice: ${e.message}`);
    }
  };


  if (loading) {
    return <div className="p-6 text-center">Loading web orders...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600 text-center">Error: {error}</div>;
  }
  
  if (user?.accountNumber !== '999') {
     return <div className="p-6 text-center text-red-500">Access Denied. Administrator view only.</div>;
  }

  if (webOrders.length === 0) {
    return <div className="p-6 text-center">No web orders found.</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">All Web Orders</h2>
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Web Order #</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Acc #</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {webOrders.map((order) => (
              <tr key={order.order_id}> {/* Use order_id as key */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">WB{order.order_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.account_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${typeof order.total_price === 'number' ? order.total_price.toFixed(2) : '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.order_items?.length || 0} items</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.order_comments}>{order.order_comments}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => handleShowInvoice(order)}
                    className="text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    View Invoice
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WebOrdersDisplay;
