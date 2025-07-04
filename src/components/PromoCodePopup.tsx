import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PromoCodeSummary, AvailablePromoCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface PromoCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

// Extended PromoCodeSummary with account usage information
type ExtendedPromoCodeSummary = PromoCodeSummary & {
  uses_remaining_for_account?: number | null;
};

const PromoCodePopup: React.FC<PromoCodePopupProps> = ({ isOpen, onClose }) => {
  const [bestPromoCode, setBestPromoCode] = useState<ExtendedPromoCodeSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { totalPrice } = useCart();

  useEffect(() => {
    const fetchBestPromoCode = async () => {
      if (!isOpen || !user) return;
      
      setLoading(true);
      try {
        // Try to get the best promo code using the primary function
        const { data, error } = await supabase.rpc('get_best_promo_code', {
          p_account_number: user.accountNumber
        });
        
        if (error) {
          console.error('Error fetching best promo code:', error);
          
          // Fallback to getting all promo codes and taking the best one
          console.log('Attempting fallback to get_available_promo_codes...');
          
          const { data: allCodesData, error: fallbackError } = await supabase.rpc('get_available_promo_codes', {
            p_account_number: user.accountNumber,
            p_order_value: totalPrice || 100 // Use cart total or a reasonable default
          });
          
          if (fallbackError) {
            console.error('Error with fallback method:', fallbackError);
            setError('Unable to retrieve promo codes at this time. Please try again later.');
            return;
          }
          
          if (allCodesData && allCodesData.length > 0) {
            // Find the best promo code (should be marked with is_best)
            const bestCode = allCodesData.find((code: { is_best: boolean }) => code.is_best) || allCodesData[0];
            
            // Transform to expected format, including uses_remaining_for_account if available
            setBestPromoCode({
              code: bestCode.code,
              name: bestCode.name,
              description: bestCode.description,
              type: bestCode.type,
              value: bestCode.value,
              min_order_value: bestCode.min_order_value,
              uses_remaining_for_account: bestCode.uses_remaining_for_account
            });
          } else {
            // No promo codes available
            setError('No promotional codes are available for your account at this time.');
          }
          return;
        }
        
        if (data) {
          // If we're using the primary function, we might not have uses_remaining_for_account
          // In that case, we'll just use the data as is
          setBestPromoCode(data);
        } else {
          // No promo code available
          setError('No promotional codes are available for your account at this time.');
        }
      } catch (err) {
        console.error('Error in promo code popup:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBestPromoCode();
  }, [isOpen, user, onClose]);

  // Don't render anything if the modal isn't open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Special Offer Just For You!
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <div className="bg-red-50 p-6 rounded-lg mb-4">
              <div className="text-lg text-red-700 mb-2">
                {error}
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        ) : bestPromoCode && (
          <div className="text-center py-4">
            <div className="bg-blue-50 p-6 rounded-lg mb-4">
              <div className="text-2xl font-bold text-blue-800 mb-2">
                {bestPromoCode.code}
              </div>
              <div className="text-lg text-blue-700 mb-4">
                {bestPromoCode.name}
              </div>
              <div className="text-gray-700">
                {bestPromoCode.description}
              </div>
              <div className="mt-3 space-y-1">
                {bestPromoCode.min_order_value > 0 && (
                  <div className="text-sm text-gray-500">
                    *Minimum order value: ${bestPromoCode.min_order_value.toFixed(2)}
                  </div>
                )}
                {/* Show usage limits if it exists in the data */}
                {bestPromoCode.uses_remaining_for_account !== undefined && 
                 bestPromoCode.uses_remaining_for_account !== null && (
                  <div className="text-sm font-medium text-blue-600">
                    You can use this code {bestPromoCode.uses_remaining_for_account} more time{bestPromoCode.uses_remaining_for_account !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Use this code at checkout to receive your discount.
            </p>
            <button
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Got it!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoCodePopup;
