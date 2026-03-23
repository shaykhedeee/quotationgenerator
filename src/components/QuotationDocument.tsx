
import React from 'react';
import { Quotation, QuoteItem, CompanyProfile } from '../types';

interface QuotationDocumentProps {
  quotation: Quotation;
  companyProfile?: CompanyProfile;
}

const QuotationDocument: React.FC<QuotationDocumentProps> = ({ quotation, companyProfile }) => {
  // Helper to group items by Category
  const groupedItems = quotation.items.reduce((acc, item) => {
    const category = item.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, QuoteItem[]>);

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'APPROVED': return 'text-emerald-600 border-emerald-600';
          case 'REJECTED': return 'text-red-600 border-red-600';
          case 'SENT': return 'text-blue-600 border-blue-600';
          default: return 'text-slate-400 border-slate-400';
      }
  };

  return (
    <div className="w-full max-w-[850px] mx-auto bg-white shadow-2xl print:shadow-none print:w-full print:max-w-none print:mx-auto relative overflow-hidden text-slate-900">
      
      {/* --- COVER PAGE --- */}
      <div className="min-h-[1100px] relative flex flex-col justify-between page-break-after-always">
          {/* Cover Background / Graphics */}
          <div className="absolute top-0 right-0 w-2/3 h-full bg-[#1a2e5a]/5 skew-x-12 origin-top transform pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-3 bg-[#1a2e5a]"></div>

          <div className="p-6 md:p-16 relative z-10 flex flex-col h-full justify-center">
              
              {/* Brand */}
              <div className="mb-10 md:mb-20">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-[#1a2e5a] rounded-xl md:rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl mb-4 md:mb-6">
                      {companyProfile?.logo ? (
                          <img 
                              src={companyProfile.logo} 
                              alt="Logo" 
                              className="w-full h-full object-contain p-2 bg-white" 
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                          />
                      ) : (
                          <span className="text-white font-bold text-2xl md:text-4xl">
                              {companyProfile?.name ? companyProfile.name.substring(0, 2).toUpperCase() : '360'}
                          </span>
                      )}
                  </div>
                  <h1 className="text-3xl md:text-6xl font-black text-[#1a2e5a] tracking-tighter uppercase leading-none break-words">
                      {companyProfile?.name || 'SPACES 360'}
                  </h1>
                  <p className="text-sm md:text-xl uppercase tracking-[0.2em] md:tracking-[0.4em] font-bold text-[#1a2e5a]/60 mt-2 md:mt-4">
                      {companyProfile?.tagline || 'Interior Architecture'}
                  </p>
              </div>

              {/* Title */}
              <div className="mb-10 md:mb-20">
                  <h2 className="text-2xl md:text-4xl font-light text-slate-600 mb-2">Design Proposal &<br/>Cost Estimation</h2>
                  <div className="w-12 md:w-20 h-1 bg-[#1a2e5a] mt-4 md:mt-6"></div>
              </div>

              {/* Client Info */}
              <div className="space-y-3 md:space-y-4">
                  <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Prepared For</p>
                      <h3 className="text-xl md:text-3xl font-bold text-slate-800">{quotation.clientName || 'Valued Client'}</h3>
                      <p className="text-sm md:text-lg text-slate-500">{quotation.projectLocation}</p>
                  </div>
                  {quotation.projectType && (
                      <div className="mt-2 md:mt-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Property Type</p>
                          <p className="text-sm md:text-lg font-semibold text-[#1a2e5a]">{quotation.projectType}</p>
                      </div>
                  )}
              </div>

              {/* Date & Quote No */}
              <div className="mt-10 md:mt-16 flex flex-wrap gap-6 md:gap-12 text-xs md:text-sm border-t border-slate-200 pt-6 md:pt-8">
                   <div>
                      <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px] md:text-[10px]">Date</p>
                      <p className="text-slate-700 font-semibold">{new Date(quotation.dateOfIssue).toLocaleDateString('en-GB', { dateStyle: 'long' })}</p>
                   </div>
                   <div>
                      <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px] md:text-[10px]">Quote No</p>
                      <p className="text-slate-700 font-semibold">{quotation.quoteNumber}</p>
                   </div>
                   {quotation.projectDuration && (
                      <div>
                          <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px] md:text-[10px]">Duration</p>
                          <p className="text-slate-700 font-semibold">{quotation.projectDuration}</p>
                      </div>
                   )}
              </div>
          </div>
          
          {/* Cover Footer */}
          <div className="p-6 md:p-12 text-center relative z-10">
               <p className="text-[10px] text-slate-400 uppercase tracking-widest">{companyProfile?.address || 'Bangalore • Karnataka • India'}</p>
          </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="p-4 md:p-12 relative z-10">
          
        {/* Header on internal pages (Repeats context) */}
        <div className="flex justify-between items-center mb-6 md:mb-10 pb-4 md:pb-6 border-b border-slate-200">
           <div className="flex items-center gap-2 md:gap-3">
               <div className="w-6 h-6 md:w-8 md:h-8 bg-[#1a2e5a] rounded flex items-center justify-center overflow-hidden">
                  {companyProfile?.logo ? (
                      <img 
                          src={companyProfile.logo} 
                          alt="Logo" 
                          className="w-full h-full object-contain p-1 bg-white" 
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                      />
                  ) : (
                      <span className="text-white font-bold text-[10px] md:text-xs">
                          {companyProfile?.name ? companyProfile.name.substring(0, 2).toUpperCase() : '360'}
                      </span>
                  )}
               </div>
               <div className="text-[#1a2e5a] font-bold uppercase tracking-widest text-[10px] md:text-sm">{companyProfile?.name || 'SPACES 360'}</div>
           </div>
           <div className={`inline-block border-2 px-2 md:px-3 py-0.5 md:py-1 rounded text-[8px] md:text-[10px] font-bold uppercase tracking-wider ${getStatusColor(quotation.status)}`}>
                {quotation.status}
           </div>
        </div>

        {/* Grouped Table */}
        <div className="mb-6 md:mb-8 overflow-x-auto">
          <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Detailed Estimate</h3>
          <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
            <thead>
              <tr className="bg-[#1a2e5a] text-white text-[10px] uppercase tracking-widest font-black">
                <th className="py-3 px-4 rounded-tl-lg w-10">No.</th>
                <th className="py-3 px-2">Description</th>
                <th className="py-3 px-2 w-20">Size</th>
                <th className="py-3 px-2 text-right w-24">Rate</th>
                <th className="py-3 px-4 text-right rounded-tr-lg w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {(Object.entries(groupedItems) as [string, QuoteItem[]][]).map(([category, items], catIndex) => {
                  const sectionTotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);
                  return (
                      <React.Fragment key={category}>
                          {/* Section Header */}
                          <tr className="bg-slate-100 border-b border-slate-200 break-inside-avoid">
                              <td colSpan={5} className="py-2 px-4 font-bold text-[#1a2e5a] uppercase tracking-wider text-[10px]">
                                  {catIndex + 1}. {category}
                              </td>
                          </tr>
                          {items.map((item, index) => (
                          <tr key={item.id} className="border-b border-slate-100 break-inside-avoid">
                              <td className="py-3 px-4 text-slate-400 font-bold text-center align-top">
                                  {catIndex + 1}.{index + 1}
                              </td>
                              <td className="py-3 px-2 font-bold text-slate-800 align-top">
                                  <div className="flex gap-3">
                                      {item.image && (
                                          <div className="w-12 h-12 flex-shrink-0 rounded border border-slate-200 overflow-hidden bg-slate-50">
                                              <img 
                                                  src={item.image} 
                                                  alt="" 
                                                  className="w-full h-full object-cover" 
                                                  crossOrigin="anonymous"
                                                  referrerPolicy="no-referrer"
                                              />
                                          </div>
                                      )}
                                      <div className="whitespace-pre-wrap">{item.description}</div>
                                  </div>
                              </td>
                              <td className="py-3 px-2 text-slate-600 align-top">
                                  {item.dimensions} 
                                  {item.sqft > 0 && <div className="text-[10px] text-slate-400 mt-1">({item.sqft} sqft)</div>}
                              </td>
                              <td className="py-3 px-2 text-right text-slate-700 font-medium align-top">
                                  {item.rate > 0 ? item.rate.toLocaleString('en-IN') : '-'}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-slate-900 align-top">
                                  ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                          </tr>
                          ))}
                          {/* Section Subtotal */}
                          <tr className="border-b-2 border-slate-200 bg-slate-50/50 break-inside-avoid">
                              <td colSpan={4} className="py-2 px-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  Subtotal for {category}
                              </td>
                              <td className="py-2 px-4 text-right font-bold text-[#1a2e5a] text-xs">
                                  ₹ {sectionTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                          </tr>
                      </React.Fragment>
                  );
              })}
            </tbody>
          </table>
        </div>

        {/* Optional Items */}
        {quotation.requestedItems && quotation.requestedItems.length > 0 && (
          <div className="mb-10 mt-8 break-inside-avoid">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Supplementary / Optional Works</h3>
             <div className="rounded-xl border border-dashed border-slate-300 overflow-hidden">
              <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="py-2 px-4 font-bold text-slate-600">Category</th>
                          <th className="py-2 px-4 font-bold text-slate-600">Description</th>
                          <th className="py-2 px-4 font-bold text-slate-600 text-right">Estimate</th>
                      </tr>
                  </thead>
                  <tbody>
                      {quotation.requestedItems.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 break-inside-avoid">
                          <td className="py-3 px-4 font-bold text-slate-500 w-1/4 align-top">{item.category || 'General'}</td>
                          <td className="py-3 px-4 text-slate-700 font-semibold align-top">
                              <div className="flex gap-3">
                                  {item.image && (
                                      <div className="w-10 h-10 flex-shrink-0 rounded border border-slate-200 overflow-hidden bg-slate-50">
                                          <img 
                                              src={item.image} 
                                              alt="" 
                                              className="w-full h-full object-cover" 
                                              crossOrigin="anonymous"
                                              referrerPolicy="no-referrer"
                                          />
                                      </div>
                                  )}
                                  <div>
                                      {item.description} <span className="text-slate-400 font-normal ml-1">{item.dimensions !== '-' ? `(${item.dimensions})` : ''}</span>
                                  </div>
                              </div>
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-[#1a2e5a] pr-4 align-top">₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
             </div>
          </div>
        )}

        {/* Payment Schedule */}
        {quotation.paymentSchedule && quotation.paymentSchedule.length > 0 && (
            <div className="mb-10 mt-8 break-inside-avoid">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Payment Schedule</h3>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-[10px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="py-2 px-4 font-bold text-slate-600">Milestone</th>
                                <th className="py-2 px-4 font-bold text-slate-600 text-center">Percentage</th>
                                <th className="py-2 px-4 font-bold text-slate-600 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotation.paymentSchedule.map((p, idx) => (
                                <tr key={idx} className="border-b border-slate-100 last:border-0">
                                    <td className="py-3 px-4 text-slate-700 font-semibold">{p.milestone}</td>
                                    <td className="py-3 px-4 text-slate-600 text-center font-bold">{p.percentage}%</td>
                                    <td className="py-3 px-4 text-right font-bold text-[#1a2e5a]">₹ {Math.round(p.amount).toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Specifications */}
        {quotation.specifications.length > 0 && (
           <div className="mb-8 mt-8 break-inside-avoid">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Material Specifications</h3>
               <div className="grid grid-cols-1 gap-y-2">
                   {quotation.specifications.map((spec, idx) => (
                       <div key={idx} className="flex gap-3 text-[10px] text-slate-600">
                           <span className="text-[#1a2e5a] font-bold">•</span>
                           <span className="leading-relaxed">{spec}</span>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {/* Terms */}
        {quotation.terms.length > 0 && (
           <div className="mb-8 break-inside-avoid">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Terms & Conditions</h3>
               <div className="grid grid-cols-1 gap-y-2">
                   {quotation.terms.map((term, idx) => (
                       <div key={idx} className="flex gap-3 text-[10px] text-slate-600">
                           <span className="text-[#1a2e5a] font-bold">{idx + 1}.</span>
                           <span className="leading-relaxed">{term}</span>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {/* Financials & Signatures */}
        <div className="break-inside-avoid bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200 mt-6 md:mt-8">
            <div className="flex justify-end mb-6 md:mb-8 border-b border-slate-200 pb-4 md:pb-6">
              <div className="w-full md:w-80 space-y-2 md:space-y-3">
                  <div className="flex justify-between text-[10px] md:text-xs text-slate-500">
                      <span className="font-bold">Subtotal</span>
                      <span>₹ {quotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {quotation.discount > 0 && (
                      <div className="flex justify-between text-[10px] md:text-xs text-red-500">
                          <span className="font-bold">Discount</span>
                          <span>- ₹ {quotation.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                  )}
                  {quotation.isGstEnabled && (
                      <div className="flex justify-between text-[10px] md:text-xs text-slate-500">
                      <span className="font-bold">GST ({quotation.gstPercentage || 18}%)</span>
                      <span>₹ {quotation.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                  )}
                  <div className="pt-2 md:pt-3 border-t-2 border-slate-300 flex justify-between items-center text-[#1a2e5a] mt-1 md:mt-2">
                      <span className="font-black text-sm md:text-lg uppercase">Grand Total</span>
                      <span className="text-xl md:text-3xl font-black">₹ {quotation.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
              </div>
          </div>

          {/* Bank & Signature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div>
                  <h4 className="text-[9px] md:text-[10px] font-black text-[#1a2e5a] uppercase tracking-widest mb-2 md:mb-3">Bank Details</h4>
                  <div className="text-[9px] md:text-[10px] text-slate-600 leading-relaxed bg-white p-3 md:p-4 rounded border border-slate-200 shadow-sm">
                      <div className="grid grid-cols-3 gap-y-1">
                          <span className="font-bold text-slate-400 uppercase text-[8px] md:text-[9px]">Account Name</span>
                          <span className="col-span-2 font-bold">{quotation.bankDetails.accountName}</span>
                          
                          <span className="font-bold text-slate-400 uppercase text-[8px] md:text-[9px]">Bank</span>
                          <span className="col-span-2">{quotation.bankDetails.bankName}</span>
                          
                          <span className="font-bold text-slate-400 uppercase text-[8px] md:text-[9px]">Account No</span>
                          <span className="col-span-2 font-mono">{quotation.bankDetails.accountNumber}</span>
                          
                          <span className="font-bold text-slate-400 uppercase text-[8px] md:text-[9px]">IFSC</span>
                          <span className="col-span-2 font-mono">{quotation.bankDetails.ifscCode}</span>
                      </div>
                  </div>
              </div>

              <div className="flex flex-col justify-end items-center md:items-end text-center md:text-right">
                  <div className="mb-2 flex flex-col items-center md:items-end">
                      {companyProfile?.signature ? (
                          <img src={companyProfile.signature} alt="Signature" className="h-12 md:h-16 object-contain mb-2 md:-mr-4" />
                      ) : (
                          <div className="font-signature text-2xl md:text-4xl text-[#1a2e5a] transform -rotate-2 origin-bottom-right mb-2 md:mb-4 md:pr-4">
                              {companyProfile?.name || 'Spaces 360'}
                          </div>
                      )}
                      <div className="inline-block w-40 md:w-48 h-[1px] bg-slate-800 mb-1"></div>
                      <p className="text-[8px] md:text-[9px] font-bold uppercase text-slate-500">Authorized Signatory</p>
                  </div>
              </div>
          </div>
          
          <div className="mt-6 md:mt-8 border-t border-dashed border-slate-300 pt-4 md:pt-6 break-inside-avoid">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
                   <div className="w-full md:w-2/3">
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Client Acceptance</p>
                      
                      {quotation.status === 'APPROVED' ? (
                          <div className="flex flex-col gap-1 items-center md:items-start">
                              <div className="font-signature text-2xl md:text-3xl text-emerald-700 transform -rotate-2 origin-bottom-left">
                                  {quotation.clientName}
                              </div>
                              <p className="text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                  Accepted
                              </p>
                          </div>
                      ) : (
                          <div className="text-slate-400 text-[10px] italic">Pending Acceptance</div>
                      )}
                   </div>
                   
                   {quotation.status !== 'APPROVED' && (
                       <div className="text-right">
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

export default QuotationDocument;
