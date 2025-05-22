import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Privacy Policy</h1>
        
        <div className="prose prose-lg text-gray-700">
          <p><strong>Last Updated:</strong> [Date]</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">1. Introduction</h2>
          <p>
            Welcome to [Your Company Name] ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us at [Your Contact Email/Link].
          </p>
          <p>
            This privacy notice describes how we might use your information if you:
            Visit our website at [Your Website URL]
            Engage with us in other related ways ― including any sales, marketing, or events.
          </p>
          <p>In this privacy notice, if we refer to:</p>
          <ul>
            <li><strong>"Website,"</strong> we are referring to any website of ours that references or links to this policy.</li>
            <li><strong>"Services,"</strong> we are referring to our Website, and other related services, including any sales, marketing, or events.</li>
          </ul>
          <p>The purpose of this privacy notice is to explain to you in the clearest way possible what information we collect, how we use it, and what rights you have in relation to it. If there are any terms in this privacy notice that you do not agree with, please discontinue use of our Services immediately.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">2. What Information Do We Collect?</h2>
          <p>
            [Placeholder for information about data collection: e.g., personal information you disclose to us, information automatically collected, etc.]
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">3. How Do We Use Your Information?</h2>
          <p>
            [Placeholder for information about data usage: e.g., to provide services, manage accounts, send marketing communications, etc.]
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">4. Will Your Information Be Shared With Anyone?</h2>
          <p>
            [Placeholder for information about data sharing: e.g., with third-party vendors, for legal reasons, etc.]
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">5. How Long Do We Keep Your Information?</h2>
          <p>
            [Placeholder for information about data retention policies.]
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">6. How Do We Keep Your Information Safe?</h2>
          <p>
            [Placeholder for information about security measures.]
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">7. What Are Your Privacy Rights?</h2>
          <p>
            [Placeholder for information about user rights: e.g., access, correction, deletion, etc.]
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">8. Controls for Do-Not-Track Features</h2>
          <p>
            Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track (“DNT”) feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">9. Updates To This Notice</h2>
          <p>
            We may update this privacy notice from time to time. The updated version will be indicated by an updated "Last Updated" date and the updated version will be effective as soon as it is accessible.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">10. How Can You Contact Us About This Notice?</h2>
          <p>
            If you have questions or comments about this notice, you may email us at [Your Contact Email] or by post to:
            [Your Company Name]
            [Your Company Address]
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

export default PrivacyPolicyPage;
