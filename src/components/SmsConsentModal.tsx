import React, { useState } from 'react';

interface SmsConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: (consented: boolean) => void;
}

const SmsConsentModal: React.FC<SmsConsentModalProps> = ({ isOpen, onClose, onConsent }) => {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked);
  };

  const handleSubmit = () => {
    onConsent(isChecked);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">SMS Consent Agreement</h2>
        <p className="mb-4 text-gray-700">
          By checking the box below, you acknowledge and agree to receive text messages from Lou Capece Music Distributors / musicsupplies.com. These messages may include, but are not limited to:
        </p>
        <ul className="list-disc list-inside mb-4 text-gray-700">
          <li>Copies of sales receipts and invoices pertaining to your orders.</li>
          <li>Important account-related materials, updates, and notifications.</li>
          <li>Occasional marketing offers and promotions.</li>
        </ul>
        <p className="mb-4 text-gray-700">
          You may opt out of marketing messages at any time by replying STOP to any message. Standard messaging rates may apply. For customer service, please call 1-800-321-5584.
        </p>
        <p className="mb-4 text-gray-700 text-sm">
          Lou Capece Music Distributors; musicsupplies.com<br/>
          2555 North Jerusalem Ave East Meadow, NY 11554<br/>
          Customer Service: 1-800-321-5584
        </p>
        <div className="flex items-center mb-6">
          <input
            type="checkbox"
            id="smsConsent"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="smsConsent" className="text-sm text-gray-700">
            I agree to receive SMS messages and accept the terms outlined above.
          </label>
        </div>
        <div className="flex flex-col space-y-3">
          <button
            onClick={handleSubmit}
            className={`w-full py-2 px-4 rounded-md text-white ${
              isChecked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={!isChecked}
          >
            Continue and Consent to SMS
          </button>
          <button
            onClick={() => onConsent(false)}
            className="w-full py-2 px-4 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300"
          >
            I do not want to receive SMS text messages
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmsConsentModal;
