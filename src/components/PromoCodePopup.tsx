import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PromoCodeSummary } from '../types';
import { useAuth } from '../context/AuthContext';

interface PromoCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromoCodePopup: React.FC<PromoCodePopupProps> = ({ isOpen, onClose }) => {
  const [bestPromoCode, setBestPromoCode] = useState<PromoCodeSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchBestPromoCode = async () => {
      if (!isOpen || !user) return;
      
      setLoading(true);
      try {
        // Get the best promo code for the user
        const { data, error } = await supabase.rpc('get_best_promo_code', {
          p_account_number: user.accountNumber
        });
        
        if (error) {
          console.error('Error fetching best promo code:', error);
          onClose(); // Close the modal on error
          return;
        }
        
        if (data) {
          setBestPromoCode(data);
        } else {
          // No promo code available, close the modal
          onClose();
        }
      } catch (err) {
        console.error('Error in promo code popup:', err);
        onClose(); // Close the modal on error
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
              {bestPromoCode.min_order_value > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  *Minimum order value: ${bestPromoCode.min_order_value.toFixed(2)}
                </div>
              )}
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
