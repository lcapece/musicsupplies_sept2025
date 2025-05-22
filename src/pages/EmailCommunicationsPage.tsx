import React from 'react';
import { Link } from 'react-router-dom';

const EmailCommunicationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Email Communications Policy</h1>
        
        <div className="prose prose-lg text-gray-700">
          <p><strong>Last Updated:</strong> [Date]</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">1. Introduction</h2>
          <p>
            This page outlines our policies regarding email communications from [Your Company Name] ("we," "our," or "us"). By providing us with your email address, you may receive emails related to your account, orders, and optionally, promotional content.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">2. Types of Emails We Send</h2>
          <p>We may send the following types of emails:</p>
          <ul>
            <li><strong>Transactional Emails:</strong> These are related to your account activity, such as account creation confirmations, password reset emails, order confirmations, shipping notifications, and responses to your inquiries. You cannot opt-out of essential transactional emails as they are necessary for providing our services.</li>
            <li><strong>Promotional & Marketing Emails:</strong> These include newsletters, special offers, product announcements, and other marketing content. You will only receive these emails if you have opted in.</li>
            <li><strong>Informational Emails:</strong> These may include updates to our terms of service, privacy policy, or other important notices related to our services.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">3. Opting-In to Promotional Emails</h2>
          <p>
            You can opt-in to receive promotional and marketing emails by:
          </p>
          <ul>
            <li>Checking the consent box during account registration or at checkout.</li>
            <li>Subscribing through a form on our website.</li>
            <li>[Placeholder for other opt-in methods, if any.]</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">4. How to Opt-Out / Unsubscribe from Promotional Emails</h2>
          <p>
            You can opt-out of receiving promotional and marketing emails from us at any time by:
          </p>
          <ul>
            <li>Clicking the "unsubscribe" link typically found at the bottom of any promotional email you receive from us.</li>
            <li>Updating your email preferences in your account settings page on our website [if applicable, provide link or instructions].</li>
            <li>Contacting us directly at [Your Support Email] with your request to unsubscribe.</li>
          </ul>
          <p>
            Please note that even if you opt-out of promotional emails, you may still receive essential transactional and informational emails related to your account and our services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">5. Email Frequency</h2>
          <p>
            The frequency of promotional emails will vary. We strive to send relevant content without overwhelming your inbox. Transactional emails are sent as needed based on your activity.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">6. Data Protection and Privacy</h2>
          <p>
            We are committed to protecting your email address and personal information. For more details on how we handle your data, please review our <Link to="/privacy-policy" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link>.
          </p>
          <p>
            We do not sell or rent your email address to third parties for their marketing purposes without your explicit consent.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">7. Accuracy of Information</h2>
          <p>
            It is your responsibility to ensure that the email address associated with your account is accurate and up-to-date.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">8. Contact Us</h2>
          <p>
            If you have any questions about our email communications policy, or if you are having trouble unsubscribing, please contact us at [Your Support Email or Link].
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmailCommunicationsPage;
