
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Trash2, 
  FileText, 
  Edit3, 
  Wand2, 
  ChevronRight, 
  AlertCircle,
  BarChart3,
  TrendingUp,
  MoreVertical,
  Download,
  Copy,
  CheckCircle2,
  Clock,
  IndianRupee
} from 'lucide-react';
import { Quotation, CompanyProfile } from '../types';
import { extractQuoteFromImages } from '../services/geminiService';
import { TEMPLATE_1BHK, TEMPLATE_2BHK, TEMPLATE_3BHK, TEMPLATE_VILLA } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ConfirmDialog from './ConfirmDialog';
import { ToastType } from './Toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import QuotationDocument from './QuotationDocument';

interface DashboardProps {
  quotations: Quotation[];
  onEdit: (q: Quotation) => void;
  onPreview: (q: Quotation) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCreate: (template?: Partial<Quotation>) => void;
  onScanned: (q: Partial<Quotation>) => void;
  showToast?: (message: string, type: ToastType) => void;
  companyProfile?: CompanyProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ quotations, onEdit, onPreview, onDelete, onDuplicate, onCreate, onScanned, showToast, companyProfile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkDownloadRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeDownloadQuote, setActiveDownloadQuote] = useState<Quotation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('DATE_NEW');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Analytics Data Preparation
  const statusData = [
    { name: 'Draft', value: quotations.filter(q => q.status === 'DRAFT').length, color: '#94a3b8' },
    { name: 'Sent', value: quotations.filter(q => q.status === 'SENT').length, color: '#3b82f6' },
    { name: 'Approved', value: quotations.filter(q => q.status === 'APPROVED').length, color: '#10b981' },
    { name: 'Rejected', value: quotations.filter(q => q.status === 'REJECTED').length, color: '#ef4444' },
  ];

  const filteredQuotations = quotations
    .filter(q => {
        const matchesSearch = (q.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                              (q.quoteNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
        return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
        switch(sortBy) {
            case 'DATE_NEW': return new Date(b.dateOfIssue).getTime() - new Date(a.dateOfIssue).getTime();
            case 'DATE_OLD': return new Date(a.dateOfIssue).getTime() - new Date(b.dateOfIssue).getTime();
            case 'VALUE_HIGH': return b.grandTotal - a.grandTotal;
            case 'VALUE_LOW': return a.grandTotal - b.grandTotal;
            case 'NAME_AZ': return (a.clientName || '').localeCompare(b.clientName || '');
            default: return 0;
        }
    });

  const handleSelectAll = () => {
      if (selectedQuotes.size === filteredQuotations.length) {
          setSelectedQuotes(new Set());
      } else {
          setSelectedQuotes(new Set(filteredQuotations.map(q => q.id)));
      }
  };

  const handleSelectOne = (id: string) => {
      const newSelected = new Set(selectedQuotes);
      if (newSelected.has(id)) {
          newSelected.delete(id);
      } else {
          newSelected.add(id);
      }
      setSelectedQuotes(newSelected);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const executeBulkDelete = () => {
    selectedQuotes.forEach(id => onDelete(id));
    const count = selectedQuotes.size;
    setSelectedQuotes(new Set());
    setShowBulkDeleteConfirm(false);
    showToast?.(`${count} quotations deleted.`, "success");
  };

  const handleBulkDownload = async () => {
    if (selectedQuotes.size === 0) return;
    
    setIsBulkDownloading(true);
    setDownloadProgress(0);
    showToast?.(`Preparing ${selectedQuotes.size} quotations...`, "info");
    
    const zip = new JSZip();
    const selectedList = quotations.filter(q => selectedQuotes.has(q.id));
    
    try {
      for (let i = 0; i < selectedList.length; i++) {
        const quote = selectedList[i];
        setDownloadProgress(Math.round(((i) / selectedList.length) * 100));
        
        // Set active quote for rendering
        setActiveDownloadQuote(quote);
        
        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const element = bulkDownloadRef.current;
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 850,
          onclone: (clonedDoc) => {
            console.log("Cloned document for bulk PDF capture - applying safe but aggressive color fallbacks");
            
            // 1. Inject a massive fallback stylesheet with CSS variable overrides
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              /* Global fallback for oklch/oklab - try to force standard colors */
              :root {
                color-scheme: light !important;
                /* Force standard colors for common Tailwind 4 variables */
                --color-slate-50: #f8fafc !important;
                --color-slate-100: #f1f5f9 !important;
                --color-slate-200: #e2e8f0 !important;
                --color-slate-300: #cbd5e1 !important;
                --color-slate-400: #94a3b8 !important;
                --color-slate-500: #64748b !important;
                --color-slate-600: #475569 !important;
                --color-slate-700: #334155 !important;
                --color-slate-800: #1e293b !important;
                --color-slate-900: #0f172a !important;
                
                --color-emerald-50: #ecfdf5 !important;
                --color-emerald-600: #059669 !important;
                --color-emerald-700: #047857 !important;
                
                --color-red-500: #ef4444 !important;
                --color-red-600: #dc2626 !important;
                
                --color-blue-600: #2563eb !important;
                
                --color-zinc-50: #fafafa !important;
                --color-zinc-500: #71717a !important;
              }
              
              /* Force standard colors for common Tailwind 4 utility patterns */
              [class*="bg-slate-"], [class*="text-slate-"], [class*="border-slate-"] { color-scheme: light !important; }
              
              /* Slate colors fallback */
              .bg-slate-50 { background-color: #f8fafc !important; }
              .bg-slate-100 { background-color: #f1f5f9 !important; }
              .bg-slate-200 { background-color: #e2e8f0 !important; }
              .bg-slate-300 { background-color: #cbd5e1 !important; }
              .bg-slate-400 { background-color: #94a3b8 !important; }
              .bg-slate-500 { background-color: #64748b !important; }
              .bg-slate-600 { background-color: #475569 !important; }
              .bg-slate-700 { background-color: #334155 !important; }
              .bg-slate-800 { background-color: #1e293b !important; }
              .bg-slate-900 { background-color: #0f172a !important; }
              
              .text-slate-400 { color: #94a3b8 !important; }
              .text-slate-500 { color: #64748b !important; }
              .text-slate-600 { color: #475569 !important; }
              .text-slate-700 { color: #334155 !important; }
              .text-slate-800 { color: #1e293b !important; }
              .text-slate-900 { color: #0f172a !important; }
              
              .border-slate-100 { border-color: #f1f5f9 !important; }
              .border-slate-200 { border-color: #e2e8f0 !important; }
              .border-slate-300 { border-color: #cbd5e1 !important; }
              
              /* Emerald colors fallback */
              .bg-emerald-50 { background-color: #ecfdf5 !important; }
              .bg-emerald-600 { background-color: #059669 !important; }
              .text-emerald-600 { color: #059669 !important; }
              .text-emerald-700 { color: #047857 !important; }
              .border-emerald-600 { border-color: #059669 !important; }
              
              /* Red colors fallback */
              .text-red-500 { color: #ef4444 !important; }
              .text-red-600 { color: #dc2626 !important; }
              .border-red-600 { border-color: #dc2626 !important; }
              
              /* Blue colors fallback */
              .bg-blue-600 { background-color: #2563eb !important; }
              .text-blue-600 { color: #2563eb !important; }
              .border-blue-600 { border-color: #2563eb !important; }
              
              /* Zinc/Gray fallbacks just in case */
              .bg-zinc-50 { background-color: #fafafa !important; }
              .text-zinc-500 { color: #71717a !important; }
              
              /* Force white background for the whole content */
              #bulk-download-container {
                background-color: #ffffff !important;
              }
              
              /* Ensure all text is visible */
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            `;
            clonedDoc.head.appendChild(style);

            // 2. Safe but aggressive replacement: replace oklch/oklab in all style tags and attributes
            const colorRegex = /(oklch|oklab)\s*\([^)]+\)/g;

            // Process all style tags
            const styleTags = clonedDoc.getElementsByTagName('style');
            for (let i = 0; i < styleTags.length; i++) {
              styleTags[i].innerHTML = styleTags[i].innerHTML.replace(colorRegex, '#888888');
            }

            // Process all inline styles using a TreeWalker (non-destructive to DOM structure)
            const walker = clonedDoc.createTreeWalker(clonedDoc.body, NodeFilter.SHOW_ELEMENT);
            let node;
            while (node = walker.nextNode()) {
              const el = node as HTMLElement;
              if (el.hasAttribute('style')) {
                const styleAttr = el.getAttribute('style')!;
                if (styleAttr.includes('oklch') || styleAttr.includes('oklab')) {
                  el.setAttribute('style', styleAttr.replace(colorRegex, '#000000'));
                }
              }
            }
            
            console.log("Color functions stripped from cloned document safely");
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const pdfBlob = pdf.output('blob');
        zip.file(`${quote.quoteNumber}_Rev${quote.revision}.pdf`, pdfBlob);
      }

      setDownloadProgress(100);
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotations_Batch_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      showToast?.("ZIP file downloaded successfully!", "success");
    } catch (error) {
      console.error("Bulk download error:", error);
      showToast?.("Bulk download failed. Please try again.", "error");
    } finally {
      setIsBulkDownloading(false);
      setActiveDownloadQuote(null);
      setSelectedQuotes(new Set());
    }
  };

  const enhanceImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve((e.target?.result as string).split(',')[1]);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Apply simple contrast and brightness adjustment
          // Contrast factor (1.2 = 20% more contrast)
          const contrast = 1.2; 
          const intercept = 128 * (1 - contrast);
          
          for (let i = 0; i < data.length; i += 4) {
            // Apply contrast to RGB
            data[i] = data[i] * contrast + intercept;     // R
            data[i+1] = data[i+1] * contrast + intercept; // G
            data[i+2] = data[i+2] * contrast + intercept; // B
            
            // Simple sharpening (unsharp mask simulation could be complex, 
            // so we stick to contrast/brightness which helps OCR significantly)
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          // Return base64 string (remove prefix)
          const enhancedBase64 = canvas.toDataURL(file.type).split(',')[1];
          resolve(enhancedBase64);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setScanError(null);
    setShowCreateModal(false); // Close modal if open
    
    try {
      const imagePromises = Array.from(files).map(async (file: File) => {
         const base64 = await enhanceImage(file);
         return { data: base64, mimeType: file.type };
      });

      const images = await Promise.all(imagePromises);
      const data = await extractQuoteFromImages(images);
      
      if (Object.keys(data).length === 0) {
          throw new Error("No data extracted");
      }

      onScanned(data);
      showToast?.("Quotation data extracted successfully!", "success");
    } catch (error) {
      console.error("Scanning failed", error);
      const errorMessage = "We couldn't extract data from that image. Please ensure the image is clear, well-lit, and contains readable text. You can try again or enter details manually.";
      setScanError(errorMessage);
      showToast?.("AI Scan failed. Please try again.", "error");
    } finally {
      setIsScanning(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative">
      
      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-2xl w-full overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
              
              <div className="mb-8">
                <h3 className="text-3xl font-black text-[#1a2e5a] mb-2">Create New Quotation</h3>
                <p className="text-slate-500">Choose how you want to start your project.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Blank */}
                <button 
                  onClick={() => onCreate()} 
                  className="p-6 rounded-2xl border-2 border-slate-100 hover:border-[#1a2e5a] hover:bg-slate-50 transition-all flex flex-col items-center text-center gap-4 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <Plus size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800">Start from Blank</h4>
                    <p className="text-sm text-slate-500">Clean slate, default settings.</p>
                  </div>
                </button>

                {/* AI Scan */}
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-6 rounded-2xl border-2 border-slate-100 hover:border-[#1a2e5a] hover:bg-slate-50 transition-all flex flex-col items-center text-center gap-4 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                    <Wand2 size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800">AI Scan & Extract</h4>
                    <p className="text-sm text-slate-500">Upload floor plan or list.</p>
                  </div>
                </button>
              </div>

              <div className="mt-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Quick Templates</h4>
                  <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: '1 BHK', desc: 'Essential', template: TEMPLATE_1BHK },
                    { name: '2 BHK', desc: 'Standard', template: TEMPLATE_2BHK },
                    { name: '3 BHK', desc: 'Family', template: TEMPLATE_3BHK },
                    { name: 'Villa', desc: 'Premium', template: TEMPLATE_VILLA },
                  ].map((t) => (
                    <button 
                      key={t.name}
                      onClick={() => onCreate(t.template)} 
                      className="p-4 rounded-xl border border-slate-200 hover:border-[#1a2e5a] hover:bg-slate-50 transition-all text-center group"
                    >
                      <span className="block font-bold text-slate-700 mb-1 group-hover:text-[#1a2e5a]">{t.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      {scanError && (
          <div className="fixed bottom-8 right-8 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl shadow-lg max-w-md animate-slideUp flex gap-3 items-start z-50">
              <i className="fa-solid fa-circle-exclamation mt-1 text-red-500"></i>
              <div>
                  <h4 className="font-bold text-sm">Scan Failed</h4>
                  <p className="text-xs mt-1 leading-relaxed">{scanError}</p>
                  <button onClick={() => setScanError(null)} className="text-xs font-bold underline mt-2 hover:text-red-900">Dismiss</button>
              </div>
          </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-black text-[#1a2e5a] tracking-tight mb-2">Quotations</h2>
          <p className="text-slate-500 font-medium">Manage your project estimates and proposals</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1a2e5a] flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pipeline Value</p>
              <p className="text-xl font-black text-[#1a2e5a]">
                ₹ {quotations.reduce((acc, q) => acc + q.grandTotal, 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            disabled={isScanning}
            className="bg-[#1a2e5a] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#2c4a8a] transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-[#1a2e5a]/20 transform active:scale-95"
          >
            {isScanning ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</>
            ) : (
              <><Plus size={20} /> New Quote</>
            )}
          </button>
        </div>
      </div>

      {/* Pipeline Stats Cards */}
      {quotations.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1a2e5a]/10 text-[#1a2e5a] flex items-center justify-center flex-shrink-0">
              <IndianRupee size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Pipeline</p>
              <p className="text-lg font-black text-[#1a2e5a] leading-none">₹{(quotations.reduce((a, q) => a + q.grandTotal, 0) / 100000).toFixed(1)}L</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Approved Value</p>
              <p className="text-lg font-black text-emerald-600 leading-none">
                ₹{(quotations.filter(q => q.status === 'APPROVED').reduce((a, q) => a + q.grandTotal, 0) / 100000).toFixed(1)}L
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pending Quotes</p>
              <p className="text-lg font-black text-amber-600 leading-none">
                {quotations.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
              <BarChart3 size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Avg. Quote Value</p>
              <p className="text-lg font-black text-slate-700 leading-none">
                ₹{((quotations.reduce((a, q) => a + q.grandTotal, 0) / (quotations.length || 1)) / 100000).toFixed(1)}L
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Section */}
      {quotations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Quote Status Distribution</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-4">
                    <i className="fa-solid fa-check-double"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-800">
                    {((quotations.filter(q => q.status === 'APPROVED').length / (quotations.length || 1)) * 100).toFixed(0)}%
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Conversion Rate</p>
                
                {/* Pipeline Progress Bar */}
                <div className="w-full mt-6">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                        <span>Goal Progress</span>
                        <span>{quotations.filter(q => q.status === 'APPROVED').length} / 10 Deals</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min((quotations.filter(q => q.status === 'APPROVED').length / 10) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
      )}
           {/* Filter & Sort Bar */}
      {quotations.length > 0 && (
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className="relative w-full lg:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                          type="text" 
                          placeholder="Search clients or quotes..." 
                          className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#1a2e5a]/5 focus:border-[#1a2e5a] outline-none transition-all"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                    <Filter size={16} className="text-slate-400" />
                    <select 
                        className="bg-transparent py-2 text-sm font-bold text-slate-600 focus:outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
  
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                    <ArrowUpDown size={16} className="text-slate-400" />
                    <select 
                        className="bg-transparent py-2 text-sm font-bold text-slate-600 focus:outline-none"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="DATE_NEW">Newest First</option>
                        <option value="DATE_OLD">Oldest First</option>
                        <option value="VALUE_HIGH">Highest Value</option>
                        <option value="VALUE_LOW">Lowest Value</option>
                        <option value="NAME_AZ">Name (A-Z)</option>
                    </select>
                  </div>
                                   <AnimatePresence>
                    {selectedQuotes.size > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-3 pl-4 border-l border-slate-200"
                        >
                            <span className="text-xs font-black text-[#1a2e5a] uppercase tracking-wider">{selectedQuotes.size} selected</span>
                            <button 
                                onClick={handleBulkDelete}
                                className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                                title="Delete Selected"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button 
                                onClick={handleBulkDownload}
                                disabled={isBulkDownloading}
                                className="h-10 px-4 flex items-center justify-center bg-[#1a2e5a] text-white rounded-xl hover:bg-[#2c4a8a] transition-colors shadow-sm gap-2 disabled:opacity-50"
                                title="Download Selected as ZIP"
                            >
                                {isBulkDownloading ? (
                                    <><i className="fa-solid fa-spinner fa-spin"></i> {downloadProgress}%</>
                                ) : (
                                    <><Download size={18} /> ZIP</>
                                )}
                            </button>
                        </motion.div>
                    )}
                  </AnimatePresence>
              </div>
          </div>
      )}

      {quotations.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-24 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <i className="fa-solid fa-file-invoice text-slate-300 text-4xl"></i>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">No quotations found</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">Get started by creating your first interior design quotation for a client.</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-[#1a2e5a] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#2c4a8a] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <i className="fa-solid fa-plus mr-2"></i> Create New Quote
          </button>
          
          <div className="flex gap-4 justify-center mt-6">
            <button 
                onClick={() => onCreate(TEMPLATE_1BHK)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:border-[#1a2e5a] hover:text-[#1a2e5a] transition-all text-xs font-bold"
            >
                Start with 1 BHK Template
            </button>
            <button 
                onClick={() => onCreate(TEMPLATE_2BHK)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:border-[#1a2e5a] hover:text-[#1a2e5a] transition-all text-xs font-bold"
            >
                Start with 2 BHK Template
            </button>
          </div>
        </div>
      ) : (
      <>
        {filteredQuotations.length > 0 && (
          <div className="flex items-center gap-2 mb-4 px-2">
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded border-slate-300 text-[#1a2e5a] focus:ring-[#1a2e5a] cursor-pointer"
              checked={selectedQuotes.size === filteredQuotations.length && filteredQuotations.length > 0}
              onChange={handleSelectAll}
            />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select All Visible</span>
          </div>
        )}

        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
        >
          <AnimatePresence mode="popLayout">
            {filteredQuotations.map((quote) => (
              <motion.div 
                key={quote.id} 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 transition-all group flex flex-col relative overflow-hidden ${selectedQuotes.has(quote.id) ? 'border-[#1a2e5a] bg-blue-50/30' : 'border-slate-100 hover:border-[#1a2e5a]/20 hover:shadow-xl hover:shadow-slate-200/50'}`}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-5 left-5 z-10">
                    <input 
                        type="checkbox" 
                        className="w-6 h-6 rounded-lg border-slate-300 text-[#1a2e5a] focus:ring-[#1a2e5a] cursor-pointer transition-all"
                        checked={selectedQuotes.has(quote.id)}
                        onChange={() => handleSelectOne(quote.id)}
                    />
                </div>

                <div className="p-8 flex-1 pt-14">
                  <div className="flex justify-between items-start mb-6">
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${
                        quote.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        quote.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                        quote.status === 'SENT' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {quote.status}
                    </span>
                    <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => onEdit(quote)} 
                        className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-[#1a2e5a] hover:border-[#1a2e5a] flex items-center justify-center transition-all shadow-sm" 
                        title="Edit"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => onDuplicate(quote.id)} 
                        className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-400 flex items-center justify-center transition-all shadow-sm" 
                        title="Duplicate"
                      >
                        <Copy size={18} />
                      </button>
                      <button 
                        onClick={() => onDelete(quote.id)} 
                        className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-red-600 hover:border-red-600 flex items-center justify-center transition-all shadow-sm" 
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-1 truncate group-hover:text-[#1a2e5a] transition-colors" title={quote.clientName}>
                    {quote.clientName || 'Unnamed Client'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
                    <FileText size={14} />
                    {quote.quoteNumber}
                  </div>
                  
                  <div className="space-y-4">
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">Date of Issue</span>
                        <span className="font-bold text-slate-700">{new Date(quote.dateOfIssue).toLocaleDateString()}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">Project Scope</span>
                        <span className="font-bold text-slate-700">{quote.items.length} items</span>
                     </div>
                  </div>
                </div>
                
                <div className="bg-slate-50/50 p-8 border-t border-slate-100 flex justify-between items-center">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
                      <p className="text-2xl font-black text-[#1a2e5a]">₹ {quote.grandTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <button 
                      onClick={() => onPreview(quote)}
                      className="bg-[#1a2e5a] text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg hover:shadow-[#1a2e5a]/20 hover:-translate-y-0.5 active:translate-y-0"
                  >
                      View Quote
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </>
      )}

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={executeBulkDelete}
        title="Delete Multiple Quotations"
        message={`Are you sure you want to delete ${selectedQuotes.size} quotations? This action cannot be undone.`}
        confirmText="Delete All"
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*" 
        multiple 
      />

      {/* Hidden container for bulk PDF generation */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0 w-0">
          <div 
            ref={bulkDownloadRef} 
            id="bulk-download-container"
            style={{ width: '850px' }}
          >
              {activeDownloadQuote && (
                  <QuotationDocument 
                    quotation={activeDownloadQuote} 
                    companyProfile={companyProfile} 
                  />
              )}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
