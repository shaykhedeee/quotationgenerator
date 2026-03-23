import React, { useState } from 'react';
import { generateQuotationPDF } from '../services/pdfService';
import { Quotation, CompanyProfile } from '../types';
import { ToastType } from './Toast';
import QuotationDocument from './QuotationDocument';

interface QuotationPreviewProps {
  quotation: Quotation;
  onEdit: () => void;
  onBack: () => void;
  onStatusChange?: (status: string, clientName?: string, date?: string) => void;
  companyProfile?: CompanyProfile;
  showToast?: (message: string, type: ToastType) => void;
}

const QuotationPreview: React.FC<QuotationPreviewProps> = ({ quotation, onEdit, onBack, onStatusChange, companyProfile, showToast }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [clientSignatureName, setClientSignatureName] = useState('');
  const [acceptanceDate, setAcceptanceDate] = useState(new Date().toISOString().split('T')[0]);

  React.useEffect(() => {
    console.log("QuotationPreview mounted for:", quotation.quoteNumber);
  }, [quotation.quoteNumber]);

  const handleDownloadPDF = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    showToast?.("Generating PDF...", "info");
    try {
      generateQuotationPDF(quotation, companyProfile);
      showToast?.("PDF downloaded successfully!", "success");
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast?.(`PDF failed: ${err instanceof Error ? err.message : 'Unknown error'}. Opening print dialog.`, "error");
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
      showToast?.("Opening print dialog...", "info");
    } catch (error) {
      showToast?.("Print failed. Try opening in a new tab.", "error");
    }
  };

  const handleWhatsAppShare = () => {
    const company = companyProfile?.name || 'Spaces 360';
    const msg = [
      `*${company} — Quotation*`,
      ``,
      `Dear ${quotation.clientName || 'Sir/Madam'},`,
      ``,
      `Please find your quotation details below:`,
      `📋 Quote No: ${quotation.quoteNumber}`,
      `🏗️ Project: ${quotation.projectType}${quotation.projectLocation ? ' at ' + quotation.projectLocation : ''}`,
      `💰 Grand Total: ₹${quotation.grandTotal.toLocaleString('en-IN')}`,
      `📅 Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}`,
      ``,
      `Kindly review and revert at your earliest convenience.`,
      ``,
      `Thanks & Regards`,
      company,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleMarkSent = () => {
    if (onStatusChange) {
      onStatusChange('SENT');
      showToast?.("Marked as Sent to client.", "success");
    }
  };

  const handleAcceptance = () => {
    if (!clientSignatureName.trim()) {
      showToast?.("Please enter the client's name for signature.", "warning");
      return;
    }
    if (onStatusChange) {
      onStatusChange('APPROVED', clientSignatureName, acceptanceDate);
      showToast?.("Quotation approved successfully!", "success");
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen py-4 md:py-10 px-2 md:px-4 print:bg-white print:p-0">
      {/* Action Bar */}
      <div className="max-w-[850px] mx-auto mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden relative z-50 pointer-events-auto">
        <button 
          onClick={() => {
            console.log("Back clicked");
            onBack();
          }} 
          className="flex items-center gap-2 text-slate-600 hover:text-[#1a2e5a] font-semibold transition-all text-sm md:text-base cursor-pointer"
        >
          <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
        </button>
        <div className="flex gap-2 md:gap-4 w-full md:w-auto">
          {quotation.status === 'DRAFT' && (
            <button onClick={handleMarkSent} className="flex-1 md:flex-none bg-blue-50 text-blue-700 border border-blue-100 px-4 md:px-5 py-2 rounded-lg font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer">
              <i className="fa-solid fa-paper-plane"></i>
              <span className="hidden sm:inline">Mark Sent</span>
            </button>
          )}
          <button onClick={handleWhatsAppShare} className="flex-1 md:flex-none bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 md:px-5 py-2 rounded-lg font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer">
            <i className="fa-brands fa-whatsapp text-lg"></i>
            <span className="hidden sm:inline">Share</span>
          </button>
          {quotation.status !== 'APPROVED' && (
             <button onClick={onEdit} className="flex-1 md:flex-none bg-white text-slate-700 border border-slate-200 px-4 md:px-6 py-2 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer">
               <i className="fa-solid fa-pen"></i>
               <span className="hidden sm:inline">Edit</span>
             </button>
          )}
          <button onClick={handlePrint} className="flex-1 md:flex-none bg-white text-slate-700 border border-slate-200 px-4 md:px-6 py-2 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer">
            <i className="fa-solid fa-print"></i>
            <span className="hidden sm:inline">Print</span>
          </button>
          <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex-1 md:flex-none bg-[#1a2e5a] text-white px-4 md:px-6 py-2 rounded-lg font-bold hover:bg-[#2c4a8a] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed text-sm cursor-pointer">
            {isDownloading ? <><i className="fa-solid fa-circle-notch fa-spin"></i></> : <><i className="fa-solid fa-file-pdf"></i></>}
            <span className="hidden sm:inline">{isDownloading ? 'Generating...' : 'Download PDF'}</span>
            <span className="sm:hidden">{isDownloading ? '...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* Quotation Content */}
      <div id="quotation-content" className="print:w-full">
        <QuotationDocument 
          quotation={quotation} 
          companyProfile={companyProfile} 
        />
        
        {/* Print-only Acceptance Section (if not approved) */}
        <div className="max-w-[850px] mx-auto bg-white p-4 md:p-12 pt-0 no-print">
            <div className="mt-6 md:mt-8 border-t border-dashed border-slate-300 pt-4 md:pt-6">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
                     <div className="w-full md:w-2/3">
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Client Acceptance</p>
                        <p className="text-[9px] md:text-[10px] text-slate-500 italic mb-4">I/We hereby accept the proposal, specifications, and terms mentioned in this document.</p>
                        
                        {quotation.status === 'APPROVED' ? (
                            <div className="flex flex-col gap-1 items-center md:items-start">
                                <div className="font-signature text-2xl md:text-3xl text-emerald-700 transform -rotate-2 origin-bottom-left">
                                    {quotation.clientName || clientSignatureName}
                                </div>
                                <p className="text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                    Accepted on {new Date(acceptanceDate).toLocaleDateString()}
                                </p>
                            </div>
                        ) : (
                            <div className="no-print flex flex-col sm:flex-row items-center md:items-end gap-3 md:gap-4 bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-200">
                                <div className="w-full sm:w-auto">
                                    <label className="block text-[9px] md:text-[10px] font-bold text-slate-500 uppercase mb-1">Client Name (Signature)</label>
                                    <input 
                                        type="text" 
                                        value={clientSignatureName}
                                        onChange={(e) => setClientSignatureName(e.target.value)}
                                        placeholder="Type name to sign"
                                        className="p-2 text-xs md:text-sm border border-slate-300 rounded w-full sm:w-48 font-signature text-lg md:text-xl"
                                    />
                                </div>
                                <div className="w-full sm:w-auto">
                                    <label className="block text-[9px] md:text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                                    <input 
                                        type="date" 
                                        value={acceptanceDate}
                                        onChange={(e) => setAcceptanceDate(e.target.value)}
                                        className="p-2 text-xs md:text-sm border border-slate-300 rounded w-full"
                                    />
                                </div>
                                <button 
                                    onClick={handleAcceptance}
                                    className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded text-[10px] md:text-xs font-bold hover:bg-emerald-700 transition-colors"
                                >
                                    Accept
                                </button>
                            </div>
                        )}
                     </div>
                     
                     {quotation.status !== 'APPROVED' && (
                         <div className="text-right print:block hidden">
                            <div className="w-40 md:w-48 h-[1px] bg-slate-800 mb-1"></div>
                            <p className="text-[8px] md:text-[9px] font-bold uppercase text-slate-500">Client Signature & Date</p>
                         </div>
                     )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationPreview;
