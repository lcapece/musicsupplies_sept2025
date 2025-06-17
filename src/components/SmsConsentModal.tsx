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
        <h2 className="text-2xl font-bold mb-4">SMS Consent Agreement</h2>
        <p className="mb-4">
          By checking the box below, you agree to receive text messages from us. These messages may include:
        </p>
        <ul className="list-disc list-inside mb-4">
          <li>Copies of sales receipts and invoices</li>
          <li>Important account-related materials</li>
          <li>Occasional marketing offers and promotions</li>
        </ul>
        <p className="mb-4">
          You can opt out of marketing messages at any time. Standard messaging rates may apply.
        </p>
        <div className="flex items-center mb-6">
          <input
            type="checkbox"
            id="smsConsent"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="mr-2"
          />
          <label htmlFor="smsConsent" className="text-sm">
            I agree to receive SMS messages and accept the terms outlined above.
          </label>
        </div>
        <button
          onClick={handleSubmit}
          className={`w-full py-2 px-4 rounded-md text-white ${
            isChecked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
          disabled={!isChecked}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SmsConsentModal;
