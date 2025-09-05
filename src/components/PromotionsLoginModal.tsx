import React, { useState, useEffect } from 'react';
import { Gift, Star, AlertCircle, X, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Promotion {
  code: string;
  name: string;
  description: string;
  type: string;
  value: number;
  min_order_value: number;
  discount_amount: number;
  valid_from: string;
  valid_until: string;
  status: 'available' | 'depleted' | 'expired' | 'min_not_met';
  is_free_gift: boolean;
  free_gift_inventory?: number;
}

interface PromotionsLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromotionsLoginModal: React.FC<PromotionsLoginModalProps> = ({
  isOpen,
  onClose
}) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPromotions = async () => {
      if (!isOpen || !user?.accountNumber) return;
      
      setIsLoading(true);
      try {
        // Get all active promotions with status information
        const { data: promoData, error } = await supabase.rpc('get_login_promotions_display', {
          p_account_number: user.accountNumber
        });

        if (!error && promoData) {
          setPromotions(promoData);
        }
      } catch (error) {
        console.error('Error fetching promotions for login modal:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromotions();
  }, [isOpen, user?.accountNumber]);

  if (!isOpen) return null;

  const getStatusEmoji = (promo: Promotion) => {
    if (promo.status === 'available') return '🎉';
    if (promo.status === 'depleted') return '😔';
    if (promo.status === 'expired') return '⏰';
    if (promo.status === 'min_not_met') return '💰';
    return '🎯';
  };

  const getStatusMessage = (promo: Promotion) => {
    if (promo.status === 'available') return 'Ready to Apply!';
    if (promo.status === 'depleted') return 'Sorry, promotion has ended';
    if (promo.status === 'expired') return 'Promotion expired';
    if (promo.status === 'min_not_met') return `Need $${(promo.min_order_value).toFixed(2)} minimum`;
    return '';
  };

  const getCardStyle = (promo: Promotion) => {
    if (promo.status === 'available') {
      return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-green-100';
    }
    if (promo.status === 'depleted' || promo.status === 'expired') {
      return 'bg-gray-50 border-gray-300 opacity-60';
    }
    return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white opacity-10 animate-pulse"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="animate-bounce">
                <Sparkles className="h-8 w-8 text-yellow-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">🎉 Special Promotions! 🎉</h2>
                <p className="text-purple-100 text-sm">Exclusive offers just for you!</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              <span className="ml-3 text-lg">Loading amazing deals...</span>
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No current promotions available</p>
              <p className="text-sm text-gray-500">Check back soon for new deals!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-lg font-semibold text-gray-800">
                  🌟 {promotions.filter(p => p.status === 'available').length} Active Deals Available! 🌟
                </p>
              </div>

              {promotions.map((promo, index) => (
                <div
                  key={promo.code}
                  className={`rounded-xl border-2 p-4 transition-all duration-300 ${getCardStyle(promo)} ${promo.status === 'available' ? 'animate-fade-in-up' : ''}`}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-2xl animate-pulse">
                          {getStatusEmoji(promo)}
                        </span>
                        <h3 className="text-lg font-bold text-gray-800">
                          {promo.name || promo.description}
                        </h3>
                      </div>
                      
                      {promo.description && promo.name && (
                        <p className="text-sm text-gray-600 mb-2">{promo.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-lg font-bold text-green-600">
                              Save ${promo.discount_amount?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          
                          {promo.min_order_value > 0 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              Min: ${promo.min_order_value.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                        promo.status === 'available' 
                          ? 'bg-green-100 text-green-700' 
                          : promo.status === 'depleted' || promo.status === 'expired'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {getStatusMessage(promo)}
                      </div>
                    </div>
                  </div>

                  {/* Special messaging for depleted free gifts */}
                  {promo.status === 'depleted' && promo.is_free_gift && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          😔 Sorry, this free gift promotion has ended - all items claimed!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              💡 Promotions automatically apply when you qualify!
            </p>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Start Shopping! 🛍️
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PromotionsLoginModal;
