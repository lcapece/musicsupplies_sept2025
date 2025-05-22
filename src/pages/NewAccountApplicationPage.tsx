import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Assuming supabase client is here

interface TradeReference {
  name: string; // Will be "Distributor Name"
  phone: string;
  addn_info: string; // Was 'contact', now "Optional: Addn Info"
}

interface ApplicationFormData {
  business_name: string;
  business_type: string;
  other_retailer_type_description: string;
  business_address: string;
  business_city: string;
  business_state: string;
  business_zip: string;
  business_website: string;
  business_email: string;
  business_phone: string;
  contact_name: string;
  contact_title: string;
  state_registration: string; // For State of Certificate Issue
  resale_cert_number: string; // For Resale Certificate Number
  year_established: string;
  estimated_annual_purchases: string;
  requesting_credit_line: boolean;
  trade_references: TradeReference[]; // Will always be 3 items if requesting_credit_line is true
  notes: string; // General notes, can include 'other retailer type' if not a dedicated field
}

const initialFormData: ApplicationFormData = {
  business_name: '',
  business_type: '',
  other_retailer_type_description: '',
  business_address: '',
  business_city: '',
  business_state: '',
  business_zip: '',
  business_website: '',
  business_email: '',
  business_phone: '',
  contact_name: '',
  contact_title: '',
  state_registration: '',
  resale_cert_number: '',
  year_established: '',
  estimated_annual_purchases: '',
  requesting_credit_line: false,
  trade_references: [ // Initialize with 3 empty references
    { name: '', phone: '', addn_info: '' },
    { name: '', phone: '', addn_info: '' },
    { name: '', phone: '', addn_info: '' },
  ],
  notes: '',
};

const retailerTypes = ["Single Store", "Chain of Stores", "Web Only", "Other"];

const NewAccountApplicationPage: React.FC = () => {
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (formData.requesting_credit_line) {
      // Ensure 3 trade reference objects exist if requesting credit
      if (formData.trade_references.length !== 3) {
        setFormData(prev => ({
          ...prev,
          trade_references: [
            prev.trade_references[0] || { name: '', phone: '', addn_info: '' },
            prev.trade_references[1] || { name: '', phone: '', addn_info: '' },
            prev.trade_references[2] || { name: '', phone: '', addn_info: '' },
          ]
        }));
      }
    } else {
      // Optionally, reset to 3 empty ones if credit line is unchecked, or leave as is
      // For simplicity, let's ensure it's always an array of 3, but they'll only be submitted if requesting_credit_line is true
       setFormData(prev => ({
         ...prev,
         trade_references: [
            prev.trade_references[0] || { name: '', phone: '', addn_info: '' },
            prev.trade_references[1] || { name: '', phone: '', addn_info: '' },
            prev.trade_references[2] || { name: '', phone: '', addn_info: '' },
         ]
       }));
    }
  }, [formData.requesting_credit_line]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTradeReferenceChange = (index: number, field: keyof TradeReference, value: string) => {
    const updatedReferences = [...formData.trade_references];
    updatedReferences[index] = { ...updatedReferences[index], [field]: value };
    setFormData(prev => ({ ...prev, trade_references: updatedReferences }));
  };

  // addTradeReference and removeTradeReference are no longer needed as we always show 3 rows.
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    setFormSuccess(null);

    // Basic validation
    if (formData.requesting_credit_line) {
      const filledReferences = formData.trade_references.filter(ref => ref.name.trim() !== '' && ref.phone.trim() !== '');
      if (filledReferences.length < 2) {
        setFormError("Please provide at least 2 complete trade references (Distributor Name and Phone Number) if requesting credit.");
        setIsLoading(false);
        return;
      }
    }
    if (formData.business_type === "Other" && !formData.other_retailer_type_description.trim()) {
        setFormError("Please describe your business type if 'Other' is selected.");
        setIsLoading(false);
        return;
    }

    const dataToSubmit = {
      ...formData,
      // If 'Other' type, combine into notes or ensure a dedicated field exists if preferred
      notes: formData.business_type === "Other" 
             ? `Retailer Type: Other - ${formData.other_retailer_type_description}. ${formData.notes}` 
             : formData.notes,
      trade_references: formData.requesting_credit_line ? formData.trade_references : null, // Send null if not requesting
    };
    // Remove other_retailer_type_description if it was merged into notes and not a separate DB column
    // delete dataToSubmit.other_retailer_type_description; 

    try {
      const { error } = await supabase.from('account_applications').insert([dataToSubmit]);
      if (error) {
        console.error("Error submitting application:", error);
        setFormError(`Submission failed: ${error.message}`);
      } else {
        setFormSuccess("Application submitted successfully! We will get back to you soon.");
        setFormData(initialFormData); // Reset form
        // navigate('/application-success'); // Optional: redirect to a success page
      }
    } catch (err: any) {
      console.error("Unexpected error submitting application:", err);
      setFormError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render input fields for brevity
  const renderInput = (name: keyof ApplicationFormData, label: string, type: string = "text", required: boolean = false, placeholder?: string) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
      <input
        type={type}
        id={name}
        name={name}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        value={String(formData[name] || '')}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">New Account Application</h1>
        
        {formSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md">{formSuccess}</div>}
        {formError && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">{formError}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Business Information</h2>
            {renderInput("business_name", "Business Name", "text", true)}
            {renderInput("business_address", "Business Address", "text", true)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {renderInput("business_city", "City", "text", true)}
              {renderInput("business_state", "State", "text", true)}
              {renderInput("business_zip", "Zip Code", "text", true)}
            </div>
            {renderInput("business_phone", "Business Phone", "tel", true)}
            {renderInput("business_email", "Business Email", "email", true)}
            {renderInput("business_website", "Business Website (Optional)", "url")}
            {renderInput("year_established", "Year Established", "text", true)}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Contact Information</h2>
            {renderInput("contact_name", "Primary Contact Name", "text", true)}
            {renderInput("contact_title", "Primary Contact Title", "text", true)}
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Retailer & Tax Information</h2>
            <div className="mb-4">
                <label htmlFor="business_type" className="block text-sm font-medium text-gray-700 mb-1">Type of Retailer<span className="text-red-500">*</span></label>
                <select 
                    id="business_type" 
                    name="business_type" 
                    value={formData.business_type} 
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Select type...</option>
                    {retailerTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
            {formData.business_type === "Other" && renderInput("other_retailer_type_description", "If Other, please describe", "text", true)}
            {renderInput("resale_cert_number", "Resale Certificate Number", "text", true)}
            {renderInput("state_registration", "State of Certificate Issue", "text", true)}
            {renderInput("estimated_annual_purchases", "Estimated Annual Purchases (USD - Optional)", "text")}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Credit Information</h2>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="requesting_credit_line"
                  checked={formData.requesting_credit_line}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Request Credit Line</span>
              </label>
            </div>

            {formData.requesting_credit_line && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-md font-semibold text-gray-600">Trade References</h3>
                  <p className="text-sm text-gray-500">Minimum of 2 trade references are needed.</p>
                </div>
                {formData.trade_references.map((ref, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-md mb-3 space-y-2">
                    <h4 className="text-sm font-medium text-gray-500">Reference {index + 1}</h4>
                    <input
                      type="text"
                      placeholder="Distributor Name"
                      value={ref.name}
                      onChange={(e) => handleTradeReferenceChange(index, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      // required={index < 2} // Validation handled in handleSubmit
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={ref.phone}
                      onChange={(e) => handleTradeReferenceChange(index, 'phone', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      // required={index < 2} // Validation handled in handleSubmit
                    />
                    <input
                      type="text"
                      placeholder="Optional: Addn Info"
                      value={ref.addn_info}
                      onChange={(e) => handleTradeReferenceChange(index, 'addn_info', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                ))}
                {/* Add/Remove buttons are removed as we always show 3 rows */}
              </div>
            )}
          </section>
          
          <section>
             <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Additional Notes</h2>
             <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any other information you'd like to provide?"
             />
          </section>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NewAccountApplicationPage;
