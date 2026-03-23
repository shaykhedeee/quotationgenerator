import React, { useState, useEffect } from 'react';
import { CompanyProfile, BankDetails } from '../types';
import { generateSignatureImage } from '../services/geminiService';
import { ToastType } from './Toast';

interface SettingsProps {
  profile: CompanyProfile;
  onSave: (profile: CompanyProfile) => void;
  onCancel: () => void;
  showToast?: (message: string, type: ToastType) => void;
}

const Settings: React.FC<SettingsProps> = ({ profile, onSave, onCancel, showToast }) => {
  const [formData, setFormData] = useState<CompanyProfile>(profile);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(profile.logo);
  const [signaturePreview, setSignaturePreview] = useState<string | undefined>(profile.signature);
  const [isGeneratingSignature, setIsGeneratingSignature] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setFormData({ ...formData, logo: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSignaturePreview(base64);
        setFormData({ ...formData, signature: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSignature = async () => {
    if (!formData.name) {
      showToast?.("Please enter a Company Name first to generate a signature.", "warning");
      return;
    }

    setIsGeneratingSignature(true);
    try {
      const signatureImage = await generateSignatureImage(formData.name);
      if (signatureImage) {
        setSignaturePreview(signatureImage);
        setFormData({ ...formData, signature: signatureImage });
        showToast?.("Signature generated successfully!", "success");
      } else {
        showToast?.("Failed to generate signature. Please try again.", "error");
      }
    } catch (error) {
      console.error("Signature generation failed:", error);
      showToast?.("An error occurred while generating the signature.", "error");
    } finally {
      setIsGeneratingSignature(false);
    }
  };

  const handleBankChange = (field: keyof BankDetails, value: string) => {
    setFormData({
      ...formData,
      bankDetails: { ...formData.bankDetails, [field]: value }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Company Settings</h2>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-all">Cancel</button>
          <button onClick={() => onSave(formData)} className="px-6 py-2 bg-[#1a2e5a] text-white rounded-lg font-bold hover:bg-[#2c4a8a] transition-all shadow-md">Save Changes</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fadeIn">
        
        {/* Branding Section */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-palette text-[#1a2e5a]"></i> Branding & Identity
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden relative group hover:border-[#1a2e5a] transition-all">
                {logoPreview ? (
                  <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center text-slate-400">
                    <i className="fa-solid fa-image text-3xl mb-2"></i>
                    <p className="text-xs font-bold uppercase">Upload Logo</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-white text-xs font-bold uppercase tracking-wider">Change Logo</span>
                </div>
              </div>
              
              {logoPreview && (
                  <button 
                    onClick={() => {
                        setLogoPreview(undefined);
                        setFormData({ ...formData, logo: undefined });
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                  >
                      <i className="fa-solid fa-trash"></i> Remove Logo
                  </button>
              )}
              
              {!logoPreview && (
                  <p className="text-[10px] text-slate-400 text-center max-w-[150px]">Recommended: Square PNG with transparent background.</p>
              )}

              {/* Signature Upload */}
              <div className="w-40 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative group hover:border-[#1a2e5a] transition-all mt-4">
                {signaturePreview ? (
                  <img src={signaturePreview} alt="Signature" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center text-slate-400">
                    <i className="fa-solid fa-signature text-xl mb-1"></i>
                    <p className="text-[10px] font-bold uppercase">Add Signature</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleSignatureUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider">Change</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 w-40">
                <button 
                    onClick={handleGenerateSignature}
                    disabled={isGeneratingSignature}
                    className="text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-200 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                >
                    {isGeneratingSignature ? (
                        <><i className="fa-solid fa-spinner fa-spin"></i> Generating...</>
                    ) : (
                        <><i className="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</>
                    )}
                </button>
                
                {signaturePreview && (
                    <button 
                        onClick={() => {
                            setSignaturePreview(undefined);
                            setFormData({ ...formData, signature: undefined });
                        }}
                        className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center justify-center gap-1"
                    >
                        <i className="fa-solid fa-trash"></i> Remove Signature
                    </button>
                )}
              </div>
              
              <p className="text-[10px] text-slate-400 text-center max-w-[150px]">Digital Signature for Quotations</p>
            </div>

            {/* Company Details */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all font-bold text-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. SPACES 360" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tagline / Slogan</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} placeholder="e.g. Interior Architecture" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                    <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 98765 43210" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                    <input type="email" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="contact@spaces360.in" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Website</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="www.spaces360.in" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                <textarea className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all resize-none" rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Registered Office Address" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GST Number (Optional)</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all font-mono uppercase" value={formData.gstNo || ''} onChange={e => setFormData({...formData, gstNo: e.target.value})} placeholder="29ABCDE1234F1Z5" />
              </div>
            </div>
          </div>
        </div>

        {/* Banking Section */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-building-columns text-[#1a2e5a]"></i> Default Bank Details
          </h3>
          <p className="text-sm text-slate-500 mb-6">These details will be automatically populated for new quotations.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Holder Name</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.bankDetails.accountName} onChange={e => handleBankChange('accountName', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bank Name</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.bankDetails.bankName} onChange={e => handleBankChange('bankName', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Number</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all font-mono" value={formData.bankDetails.accountNumber} onChange={e => handleBankChange('accountNumber', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">IFSC Code</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all font-mono uppercase" value={formData.bankDetails.ifscCode} onChange={e => handleBankChange('ifscCode', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Branch</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.bankDetails.branch} onChange={e => handleBankChange('branch', e.target.value)} />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">UPI ID (Optional)</label>
                <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.bankDetails.upiId || ''} onChange={e => handleBankChange('upiId', e.target.value)} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
