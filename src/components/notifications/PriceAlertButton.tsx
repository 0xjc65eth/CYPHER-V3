'use client';

import { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, Plus } from 'lucide-react';

export function PriceAlertButton({ currentPrice }: { currentPrice: number }) {
  const { addNotification } = useNotifications();
  const [showModal, setShowModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState(currentPrice.toString());
  const [direction, setDirection] = useState<'above' | 'below'>('above');

  const handleCreateAlert = () => {
    const price = parseFloat(alertPrice);
    if (isNaN(price) || price <= 0) {
      addNotification({
        type: 'error',
        title: 'Invalid Price',
        message: 'Please enter a valid price',
      });
      return;
    }

    // Save to localStorage
    const alerts = JSON.parse(localStorage.getItem('priceAlerts') || '[]');
    alerts.push({
      id: Date.now().toString(),
      price,
      direction,
      triggered: false,
    });
    localStorage.setItem('priceAlerts', JSON.stringify(alerts));

    addNotification({ type: 'success', title: 'Alert Set', message: `Price alert set for $${price} (${direction})` });
    setShowModal(false);
    setAlertPrice(currentPrice.toString());
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-black rounded-lg hover:bg-orange-600 transition-colors"
      >
        <Bell className="w-4 h-4" />
        Set Price Alert
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Create Price Alert</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Alert when Bitcoin is:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDirection('above')}
                    className={`flex-1 py-2 rounded-lg border transition-colors ${
                      direction === 'above'
                        ? 'bg-orange-500 text-black border-orange-500'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    Above
                  </button>
                  <button
                    onClick={() => setDirection('below')}
                    className={`flex-1 py-2 rounded-lg border transition-colors ${
                      direction === 'below'
                        ? 'bg-orange-500 text-black border-orange-500'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    Below
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Price ($)</label>
                <input
                  type="number"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  placeholder="Enter price"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current price: ${currentPrice.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAlert}
                className="flex-1 py-2 bg-orange-500 text-black rounded-lg hover:bg-orange-600 transition-colors"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}