
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Settings as SettingsIcon, LayoutDashboard, FileText, ChevronRight, CloudUpload, CheckCircle2 } from 'lucide-react';
import { Quotation, ViewState, QuoteItem, CompanyProfile } from './types';
import { SAMPLE_QUOTATION, NIRANVELENDRA_QUOTATION, RIYA_YADAV_QUOTATION, DEFAULT_TERMS, DEFAULT_SPECS, DEFAULT_BANK_DETAILS, DEFAULT_COMPANY_PROFILE } from './constants';
import QuotationForm from './components/QuotationForm';
import QuotationPreview from './components/QuotationPreview';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import ConfirmDialog from './components/ConfirmDialog';
import Toast, { ToastType } from './components/Toast';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LIST);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };
  // --- Quotations State ---
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    try {
      const saved = localStorage.getItem('spaces360_quotes');
      const migrate = (q: any) => ({
        ...q,
        items: q.items || [],
        requestedItems: q.requestedItems || [], 
        isGstEnabled: q.isGstEnabled ?? true,
        status: q.status || 'DRAFT',
        revision: q.revision || 0,
        subtotal: q.subtotal || 0,
        discount: q.discount || 0,
        gst: q.gst || 0,
        grandTotal: q.grandTotal || 0,
        specifications: q.specifications || DEFAULT_SPECS,
        terms: q.terms || DEFAULT_TERMS,
        bankDetails: q.bankDetails || DEFAULT_BANK_DETAILS
      });
      if (saved) {
        const parsed: any[] = JSON.parse(saved);
        const migrated = parsed.map(migrate);
        // Inject scanned quotations if not already present
        const hasNvs = migrated.some(q => q.id === NIRANVELENDRA_QUOTATION.id);
        const hasRiy = migrated.some(q => q.id === RIYA_YADAV_QUOTATION.id);
        let result = hasNvs ? migrated : [NIRANVELENDRA_QUOTATION, ...migrated];
        result = hasRiy ? result : [RIYA_YADAV_QUOTATION, ...result];
        return result;
      }
      return [RIYA_YADAV_QUOTATION, NIRANVELENDRA_QUOTATION, SAMPLE_QUOTATION];
    } catch (error) {
      console.error("Error parsing saved quotations:", error);
      return [RIYA_YADAV_QUOTATION, NIRANVELENDRA_QUOTATION, SAMPLE_QUOTATION];
    }
  });

  // --- Company Profile State ---
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem('spaces360_profile');
      return saved ? JSON.parse(saved) : DEFAULT_COMPANY_PROFILE;
    } catch (error) {
      return DEFAULT_COMPANY_PROFILE;
    }
  });

  const [activeQuote, setActiveQuote] = useState<Quotation | null>(null);

  useEffect(() => {
    localStorage.setItem('spaces360_quotes', JSON.stringify(quotations));
  }, [quotations]);

  useEffect(() => {
    localStorage.setItem('spaces360_profile', JSON.stringify(companyProfile));
  }, [companyProfile]);

  const handleCreateNew = (template?: Partial<Quotation>) => {
    const items = template?.items ? template.items.map(i => ({...i, id: Date.now() + Math.random().toString()})) : [];
    const requestedItems = template?.requestedItems ? template.requestedItems.map(i => ({...i, id: Date.now() + Math.random().toString()})) : [];

    // Calculate totals for template
    const subtotal = items.reduce((acc, i) => acc + (i.amount || 0), 0) + requestedItems.reduce((acc, i) => acc + (i.amount || 0), 0);
    const gstPercentage = 18;
    const gst = subtotal * (gstPercentage / 100);
    const grandTotal = subtotal + gst;

    const newQuote: Quotation = {
      id: Date.now().toString(),
      quoteNumber: `Q-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${new Date().getFullYear()}`,
      clientName: '',
      projectLocation: '',
      projectType: '',
      dateOfIssue: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: items,
      requestedItems: requestedItems,
      isGstEnabled: true,
      gstPercentage: gstPercentage,
      status: 'DRAFT',
      revision: 0,
      subtotal: subtotal,
      discount: 0,
      gst: gst,
      grandTotal: grandTotal,
      specifications: DEFAULT_SPECS,
      terms: DEFAULT_TERMS,
      bankDetails: companyProfile.bankDetails || DEFAULT_BANK_DETAILS,
      paymentSchedule: []
    };
    setActiveQuote(newQuote);
    setView(ViewState.EDIT);
  };

  const handleScannedQuote = (scannedData: Partial<Quotation>) => {
    const gstPercentage = scannedData.gstPercentage || 18;
    const newQuote: Quotation = {
      id: Date.now().toString(),
      quoteNumber: `Q-SCAN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      clientName: scannedData.clientName || '',
      projectLocation: scannedData.projectLocation || '',
      projectType: scannedData.projectType || '',
      dateOfIssue: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: (scannedData.items || []).map((item, idx) => ({
        ...item,
        id: `scanned-${idx}-${Date.now()}`
      })) as QuoteItem[],
      requestedItems: (scannedData.requestedItems || []).map((item, idx) => ({
        ...item,
        id: `scanned-req-${idx}-${Date.now()}`
      })) as QuoteItem[],
      isGstEnabled: scannedData.isGstEnabled ?? true,
      gstPercentage: gstPercentage,
      status: 'DRAFT',
      revision: 0,
      subtotal: scannedData.subtotal || 0,
      discount: 0,
      gst: scannedData.gst || 0,
      grandTotal: scannedData.grandTotal || 0,
      specifications: DEFAULT_SPECS,
      terms: DEFAULT_TERMS,
      bankDetails: companyProfile.bankDetails || DEFAULT_BANK_DETAILS,
      paymentSchedule: []
    };
    setActiveQuote(newQuote);
    setView(ViewState.EDIT);
  };

  const handleEdit = (quote: Quotation) => {
    setActiveQuote(quote);
    setView(ViewState.EDIT);
  };

  const handlePreview = (quote: Quotation) => {
    setActiveQuote(quote);
    setView(ViewState.PREVIEW);
  };

  const handleDelete = (id: string) => {
    setConfirmDelete({ isOpen: true, id });
  };

  const executeDelete = () => {
    if (confirmDelete.id) {
      setQuotations(prev => prev.filter(q => q.id !== confirmDelete.id));
      setConfirmDelete({ isOpen: false, id: null });
    }
  };

  const handleSave = (updatedQuote: Quotation, stayInView = false) => {
    setQuotations(prev => {
      const exists = prev.find(q => q.id === updatedQuote.id);
      if (exists) {
        return prev.map(q => q.id === updatedQuote.id ? updatedQuote : q);
      }
      return [updatedQuote, ...prev];
    });
    setActiveQuote(updatedQuote);
    if (!stayInView) {
      setView(ViewState.PREVIEW);
    }
  };

  const handleSaveSettings = (profile: CompanyProfile) => {
    setCompanyProfile(profile);
    setView(ViewState.LIST);
  };

  const handleStatusChange = (status: string, clientName?: string, date?: string) => {
    if (activeQuote) {
      const updatedQuote = { 
        ...activeQuote, 
        status: status as 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED',
        clientName: clientName || activeQuote.clientName,
      };
      handleSave(updatedQuote);
    }
  };

  const handleDuplicate = (id: string) => {
    const source = quotations.find(q => q.id === id);
    if (!source) return;
    const newQuote: Quotation = {
      ...JSON.parse(JSON.stringify(source)),
      id: Date.now().toString(),
      quoteNumber: `Q-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${new Date().getFullYear()}`,
      status: 'DRAFT',
      revision: 0,
      dateOfIssue: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setQuotations(prev => [newQuote, ...prev]);
    showToast('Quotation duplicated successfully.', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-[#1a2e5a] text-white py-3 px-4 md:px-8 shadow-xl no-print flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView(ViewState.LIST)}>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-300">
            {companyProfile.logo ? (
              <img src={companyProfile.logo} alt="Logo" className="w-full h-full object-contain p-1.5" />
            ) : (
              <span className="text-[#1a2e5a] font-black text-xl">
                  {companyProfile.name ? companyProfile.name.substring(0, 2).toUpperCase() : '360'}
              </span>
            )}
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg md:text-xl font-black tracking-tight leading-none mb-1">{companyProfile.name}</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-60 font-bold">{companyProfile.tagline}</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-1 md:gap-3">
          <button 
            onClick={() => setView(ViewState.LIST)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${view === ViewState.LIST ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <LayoutDashboard size={18} />
            <span className="hidden md:inline">Dashboard</span>
          </button>
          <button 
            onClick={() => setView(ViewState.SETTINGS)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${view === ViewState.SETTINGS ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <SettingsIcon size={18} />
            <span className="hidden md:inline">Settings</span>
          </button>
          <div className="w-px h-6 bg-white/20 mx-1 hidden sm:block"></div>
          <button 
            onClick={() => handleCreateNew()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl transition-all font-bold flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20 active:scale-95 ml-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Quote</span>
          </button>
        </nav>
      </header>

      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + (activeQuote?.id || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {view === ViewState.LIST && (
              <Dashboard 
                quotations={quotations} 
                onEdit={handleEdit} 
                onPreview={handlePreview} 
                onDelete={handleDelete}
                onCreate={handleCreateNew}
                onScanned={handleScannedQuote}
                onDuplicate={handleDuplicate}
                showToast={showToast}
                companyProfile={companyProfile}
              />
            )}
            
            {view === ViewState.EDIT && activeQuote && (
              <QuotationForm 
                quotation={activeQuote} 
                onSave={(q, stay) => handleSave(q, stay)} 
                onCancel={() => setView(ViewState.LIST)} 
                companyProfile={companyProfile}
                showToast={showToast}
              />
            )}

            {view === ViewState.PREVIEW && activeQuote && (
              <QuotationPreview 
                quotation={activeQuote} 
                onEdit={() => setView(ViewState.EDIT)} 
                onBack={() => setView(ViewState.LIST)}
                onStatusChange={handleStatusChange}
                companyProfile={companyProfile}
                showToast={showToast}
              />
            )}

            {view === ViewState.SETTINGS && (
              <Settings 
                profile={companyProfile}
                onSave={handleSaveSettings}
                onCancel={() => setView(ViewState.LIST)}
                showToast={showToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-white py-6 px-8 text-center text-slate-400 text-xs no-print border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} {companyProfile.name}. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Support</span>
          </div>
        </div>
      </footer>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
