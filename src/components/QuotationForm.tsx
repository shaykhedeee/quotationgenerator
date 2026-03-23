
import React, { useState, useRef, useEffect } from 'react';
import { Quotation, QuoteItem, CompanyProfile } from '../types';
import { INITIAL_ITEM, PROJECT_TYPES } from '../constants';
import { getSmartEstimation, suggestItemsForCategory, generateItemSpecification, generatePaymentSchedule, generateProjectSummary, estimateProjectDuration } from '../services/geminiService';
import { ToastType } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import PromptModal from './PromptModal';

interface QuotationFormProps {
  quotation: Quotation;
  onSave: (q: Quotation, stayInView?: boolean) => void;
  onCancel: () => void;
  companyProfile?: CompanyProfile;
  showToast?: (message: string, type: ToastType) => void;
}

type Tab = 'PARTICULARS' | 'DETAILS' | 'TEXT' | 'BANKING' | 'PAYMENT';

const TextListEditor: React.FC<{
  title: string;
  icon: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}> = ({ title, icon, items, onChange, placeholder }) => {
  const handleAdd = () => {
      onChange([...items, ""]);
  };

  const handleChange = (index: number, value: string) => {
      const newItems = [...items];
      newItems[index] = value;
      onChange(newItems);
  };

  const handleDelete = (index: number) => {
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === items.length - 1) return;
      
      const newItems = [...items];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      onChange(newItems);
  };

  return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
              <i className={`fa-solid ${icon} text-[#1a2e5a]`}></i> {title}
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[500px]">
              {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start group">
                      <span className="text-slate-400 font-bold text-xs mt-3 w-4 text-right flex-shrink-0">{index + 1}.</span>
                      <textarea 
                          className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none text-sm leading-relaxed transition-all resize-none"
                          rows={2}
                          value={item}
                          onChange={(e) => handleChange(index, e.target.value)}
                          placeholder={placeholder}
                      />
                      <div className="flex flex-col gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                              onClick={() => handleMove(index, 'up')} 
                              disabled={index === 0}
                              className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-[#1a2e5a] hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-500 transition-colors"
                              title="Move Up"
                          >
                              <i className="fa-solid fa-chevron-up text-[10px]"></i>
                          </button>
                          <button 
                              onClick={() => handleMove(index, 'down')} 
                              disabled={index === items.length - 1}
                              className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-[#1a2e5a] hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-500 transition-colors"
                              title="Move Down"
                          >
                              <i className="fa-solid fa-chevron-down text-[10px]"></i>
                          </button>
                          <button 
                              onClick={() => handleDelete(index)} 
                              className="w-6 h-6 flex items-center justify-center rounded bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors mt-1"
                              title="Delete"
                          >
                              <i className="fa-solid fa-xmark text-[10px]"></i>
                          </button>
                      </div>
                  </div>
              ))}
              {items.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm italic border-2 border-dashed border-slate-100 rounded-lg">
                      No items added yet.
                  </div>
              )}
          </div>

          <button 
              onClick={handleAdd}
              className="mt-4 w-full py-2 border border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-[#1a2e5a] hover:text-[#1a2e5a] hover:bg-slate-50 transition-all text-sm font-bold flex items-center justify-center gap-2"
          >
              <i className="fa-solid fa-plus"></i> Add New Item
          </button>
      </div>
  );
};

const QuotationForm: React.FC<QuotationFormProps> = ({ quotation, onSave, onCancel, companyProfile, showToast }) => {
  const [activeTab, setActiveTab] = useState<Tab>('PARTICULARS');
  const [formData, setFormData] = useState<Quotation>({ 
    ...quotation,
    gstPercentage: quotation.gstPercentage || 18,
    items: quotation.items || [],
    requestedItems: quotation.requestedItems || []
  });
  const [isEstimating, setIsEstimating] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageItemId, setActiveImageItemId] = useState<string | null>(null);

  // Modal States
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean; title: string; message: string; defaultValue: string; onConfirm: (val: string) => void } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' } | null>(null);

  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isEstimatingDuration, setIsEstimatingDuration] = useState(false);

  // --- Auto-save logic ---
  useEffect(() => {
    const timer = setTimeout(() => {
        if (JSON.stringify(formData) !== JSON.stringify(quotation)) {
            setIsSaving(true);
            onSave(formData, true);
            setLastSaved(new Date());
            setTimeout(() => setIsSaving(false), 1000);
        }
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData]);

  // --- Ctrl+S shortcut ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setIsSaving(true);
        onSave(formData, true);
        setLastSaved(new Date());
        setTimeout(() => setIsSaving(false), 1000);
        showToast?.('Saved!', 'success');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [formData]);

  // --- Calculations & Updates ---

  const updateCalculations = (items: QuoteItem[], isGst: boolean, discount: number, gstPercent: number) => {
    const subtotal = items.reduce((acc, item) => acc + (item.amount || 0), 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const gst = isGst ? taxableAmount * (gstPercent / 100) : 0;
    const grandTotal = taxableAmount + gst;
    return { subtotal, gst, grandTotal };
  };

  const handleItemChange = (id: string, field: keyof QuoteItem, value: any, isRequested = false) => {
    if ((field === 'sqft' || field === 'rate' || field === 'amount' || field === 'cost') && typeof value === 'number') {
      if (value < 0) return;
    }

    const listKey = isRequested ? 'requestedItems' : 'items';
    const newList = formData[listKey].map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate Amount if Sqft or Rate changes AND not in Lump Sum mode
        if (!updatedItem.isLumpSum && (field === 'sqft' || field === 'rate')) {
            const sqft = field === 'sqft' ? value : updatedItem.sqft;
            const rate = field === 'rate' ? value : updatedItem.rate;
            updatedItem.amount = Number(((sqft || 0) * (rate || 0)).toFixed(2));
        }
        
        // If switching to Lump Sum, we might want to keep the amount but stop auto-calc
        if (field === 'isLumpSum' && value === true) {
            // No action needed, user will edit amount directly
        }

        return updatedItem;
      }
      return item;
    });
    
    // Recalculate only if modifying items affecting totals (main items)
    const calcs = updateCalculations(isRequested ? formData.items : newList, formData.isGstEnabled, formData.discount, formData.gstPercentage);
    setFormData({ ...formData, [listKey]: newList, ...(!isRequested ? calcs : {}) });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeImageItemId) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = reader.result as string;
              // Check if it's a requested item or main item
              const isRequested = formData.requestedItems.some(i => i.id === activeImageItemId);
              handleItemChange(activeImageItemId, 'image', base64, isRequested);
              setActiveImageItemId(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
          };
          reader.readAsDataURL(file);
      }
  };

  const triggerImageUpload = (id: string) => {
      setActiveImageItemId(id);
      fileInputRef.current?.click();
  };

  const handleDiscountChange = (value: number) => {
      if (value < 0) return;
      const calcs = updateCalculations(formData.items, formData.isGstEnabled, value, formData.gstPercentage);
      setFormData({ ...formData, discount: value, ...calcs });
  };

  const handleGstToggle = (enabled: boolean) => {
    const calcs = updateCalculations(formData.items, enabled, formData.discount, formData.gstPercentage);
    setFormData({ ...formData, isGstEnabled: enabled, ...calcs });
  };

  const handleGstPercentChange = (percent: number) => {
    if (percent < 0) return;
    const calcs = updateCalculations(formData.items, formData.isGstEnabled, formData.discount, percent);
    setFormData({ ...formData, gstPercentage: percent, ...calcs });
  };

  // --- Actions ---

  const addItem = (category: string = 'General', isRequested = false) => {
    const listKey = isRequested ? 'requestedItems' : 'items';
    const newItem = { 
        ...INITIAL_ITEM, 
        id: Date.now().toString(), 
        category: category 
    };
    
    const newList = [...formData[listKey], newItem];
    const calcs = updateCalculations(isRequested ? formData.items : newList, formData.isGstEnabled, formData.discount, formData.gstPercentage);
    
    setFormData({ ...formData, [listKey]: newList, ...(!isRequested ? calcs : {}) });
  };

  const addSection = () => {
    setPromptModal({
        isOpen: true,
        title: "New Section",
        message: "Enter name for new section (e.g., Master Bedroom):",
        defaultValue: "",
        onConfirm: (newCategory) => {
            if (newCategory && newCategory.trim()) {
                addItem(newCategory.trim(), false);
                showToast?.(`Section "${newCategory}" added.`, "success");
            }
        }
    });
  };

  const deleteSection = (category: string) => {
    setConfirmModal({
        isOpen: true,
        title: "Delete Section",
        message: `Are you sure you want to delete the entire "${category}" section?`,
        variant: "danger",
        onConfirm: () => {
            const newList = formData.items.filter(i => i.category !== category);
            const calcs = updateCalculations(newList, formData.isGstEnabled, formData.discount, formData.gstPercentage);
            setFormData({ ...formData, items: newList, ...calcs });
            showToast?.(`Section "${category}" deleted.`, "success");
        }
    });
  };

  const renameSection = (oldCategory: string) => {
    setPromptModal({
        isOpen: true,
        title: "Rename Section",
        message: `Enter new name for "${oldCategory}":`,
        defaultValue: oldCategory,
        onConfirm: (newCategory) => {
            if (newCategory && newCategory.trim() !== "" && newCategory !== oldCategory) {
                const newList = formData.items.map(i => i.category === oldCategory ? { ...i, category: newCategory.trim() } : i);
                setFormData({ ...formData, items: newList });
                showToast?.(`Section renamed to "${newCategory}".`, "success");
            }
        }
    });
  };

  const removeItem = (id: string, isRequested = false) => {
    const listKey = isRequested ? 'requestedItems' : 'items';
    const newList = formData[listKey].filter(i => i.id !== id);
    const calcs = updateCalculations(isRequested ? formData.items : newList, formData.isGstEnabled, formData.discount, formData.gstPercentage);
    setFormData({ ...formData, [listKey]: newList, ...(!isRequested ? calcs : {}) });
  };

  const duplicateItem = (item: QuoteItem, isRequested = false) => {
    const listKey = isRequested ? 'requestedItems' : 'items';
    const newItem = { ...item, id: Date.now().toString() };
    const newList = [...formData[listKey], newItem];
    const calcs = updateCalculations(isRequested ? formData.items : newList, formData.isGstEnabled, formData.discount, formData.gstPercentage);
    setFormData({ ...formData, [listKey]: newList, ...(!isRequested ? calcs : {}) });
  };

  const moveToMainList = (item: QuoteItem) => {
    setPromptModal({
        isOpen: true,
        title: "Move to Main List",
        message: "Move to which section?",
        defaultValue: "Miscellaneous",
        onConfirm: (targetCategory) => {
            const newItem = { ...item, category: targetCategory || "Miscellaneous" };
            
            // Remove from requestedItems
            const newRequestedItems = formData.requestedItems.filter(i => i.id !== item.id);
            
            // Add to items
            const newItems = [...formData.items, newItem];
            
            // Recalculate
            const calcs = updateCalculations(newItems, formData.isGstEnabled, formData.discount, formData.gstPercentage);
            
            setFormData({ 
                ...formData, 
                requestedItems: newRequestedItems, 
                items: newItems,
                ...calcs 
            });
            showToast?.(`Item moved to "${targetCategory}".`, "success");
        }
    });
  };

  const moveItem = (id: string, direction: 'up' | 'down', isRequested = false) => {
    const listKey = isRequested ? 'requestedItems' : 'items';
    const list = [...formData[listKey]];
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return;
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    
    // Swap
    [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
    setFormData({ ...formData, [listKey]: list });
  };

  const handleSmartEstimate = async (id: string, description: string, isRequested = false) => {
    if (!description || description.trim() === '') {
        showToast?.("Please enter a description first.", "warning");
        return;
    }
    
    setIsEstimating(id);
    try {
        const estimate = await getSmartEstimation(description);
        if (estimate && Object.keys(estimate).length > 0) {
            const listKey = isRequested ? 'requestedItems' : 'items';
            const newList = formData[listKey].map(item => {
                if (item.id === id) {
                    return {
                        ...item,
                        dimensions: estimate.dimensions || item.dimensions,
                        sqft: estimate.sqft || 0,
                        rate: estimate.rate || 0,
                        amount: estimate.amount || 0,
                        isLumpSum: false // AI estimates usually provide sqft/rate
                    };
                }
                return item;
            });
            const calcs = updateCalculations(isRequested ? formData.items : newList, formData.isGstEnabled, formData.discount, formData.gstPercentage);
            setFormData({ ...formData, [listKey]: newList, ...(!isRequested ? calcs : {}) });
            showToast?.("AI estimate applied.", "success");
        } else {
            showToast?.("AI could not estimate this item. Try adding more detail.", "error");
        }
    } catch (e) {
        showToast?.("Error connecting to AI service.", "error");
    } finally {
        setIsEstimating(null);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!formData.grandTotal || formData.grandTotal === 0) {
      showToast?.("Please add items to the quotation first.", "warning");
      return;
    }
    setIsGeneratingSchedule(true);
    try {
      const schedule = await generatePaymentSchedule(formData.grandTotal, formData.projectType, formData.projectDuration);
      if (schedule && schedule.length > 0) {
        setFormData({ ...formData, paymentSchedule: schedule });
        showToast?.("AI payment schedule generated!", "success");
      }
    } catch {
      showToast?.("Failed to generate payment schedule.", "error");
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!formData.clientName && !formData.projectType) {
      showToast?.("Please fill in client name and project type first.", "warning");
      return;
    }
    setIsGeneratingSummary(true);
    try {
      const summary = await generateProjectSummary(
        formData.clientName || 'Client',
        formData.projectType || 'Interior Design',
        formData.projectLocation || 'Bangalore',
        formData.grandTotal,
        formData.items.length
      );
      if (summary) {
        setFormData({ ...formData, notes: summary });
        showToast?.("AI project summary generated!", "success");
      }
    } catch {
      showToast?.("Failed to generate project summary.", "error");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleEstimateDuration = async () => {
    if (!formData.projectType) {
      showToast?.("Please select a project type first.", "warning");
      return;
    }
    setIsEstimatingDuration(true);
    try {
      const duration = await estimateProjectDuration(formData.projectType, formData.items.length, formData.grandTotal);
      if (duration) {
        setFormData({ ...formData, projectDuration: duration });
        showToast?.(`Duration estimated: ${duration}`, "success");
      }
    } catch {
      showToast?.("Failed to estimate duration.", "error");
    } finally {
      setIsEstimatingDuration(false);
    }
  };

  const handleSuggestItems = async (category: string) => {
    setIsSuggesting(category);
    try {
        const suggestions = await suggestItemsForCategory(category);
        if (suggestions && suggestions.length > 0) {
            const newItems = suggestions.map(s => ({
                ...INITIAL_ITEM,
                id: Math.random().toString(36).substr(2, 9),
                category,
                description: s.description || '',
                dimensions: s.dimensions || '',
                sqft: s.sqft || 0,
                rate: s.rate || 0,
                amount: s.amount || 0,
                isLumpSum: false
            }));

            // Filter out empty items in this category before adding suggestions
            const filteredItems = formData.items.filter(i => !(i.category === category && i.description.trim() === ''));
            const newList = [...filteredItems, ...newItems];
            const calcs = updateCalculations(newList, formData.isGstEnabled, formData.discount, formData.gstPercentage);
            setFormData({ ...formData, items: newList, ...calcs });
            showToast?.(`Added ${suggestions.length} suggested items to ${category}.`, "success");
        } else {
            showToast?.("AI could not suggest items for this section.", "error");
        }
    } catch (e) {
        showToast?.("Error connecting to AI service.", "error");
    } finally {
        setIsSuggesting(null);
    }
  };

  const handleEnhanceItem = async (id: string, currentDescription: string, isRequested = false) => {
    if (!currentDescription || currentDescription.trim() === '') {
        showToast?.("Please enter a basic item name first.", "warning");
        return;
    }

    setIsEnhancing(id);
    try {
        const enhancedSpec = await generateItemSpecification(currentDescription);
        if (enhancedSpec) {
            handleItemChange(id, 'description', enhancedSpec, isRequested);
            showToast?.("Item specification enhanced.", "success");
        }
    } catch (e) {
        showToast?.("Error connecting to AI service.", "error");
    } finally {
        setIsEnhancing(null);
    }
  };


  // --- Rendering Helpers ---
  
  const groupedItems = formData.items.reduce((acc, item) => {
      const cat = item.category || 'General';
      if(!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
  }, {} as Record<string, QuoteItem[]>);

  const categories = Object.keys(groupedItems);

  const renderItemRow = (item: QuoteItem, isRequested: boolean) => (
    <div key={item.id} className={`group bg-white md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none border md:border-0 border-slate-200 mb-4 md:mb-0 hover:bg-slate-50 transition-colors md:border-b md:border-slate-100 md:last:border-0 flex flex-col md:table-row ${item.isLumpSum ? 'bg-amber-50/30 md:bg-amber-50/30' : ''}`}>
      {/* Description & Image */}
      <div className="md:table-cell py-2 md:py-4 px-0 md:px-3 align-top md:w-[35%]">
        <div className="relative flex gap-3">
          {/* Reorder Buttons */}
          <div className="flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity pr-1">
              <button 
                onClick={() => moveItem(item.id, 'up', isRequested)} 
                className="w-6 h-6 md:w-5 md:h-5 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-400 hover:text-[#1a2e5a] hover:border-[#1a2e5a] shadow-sm"
              >
                <i className="fa-solid fa-chevron-up text-[10px] md:text-[8px]"></i>
              </button>
              <button 
                onClick={() => moveItem(item.id, 'down', isRequested)} 
                className="w-6 h-6 md:w-5 md:h-5 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-400 hover:text-[#1a2e5a] hover:border-[#1a2e5a] shadow-sm"
              >
                <i className="fa-solid fa-chevron-down text-[10px] md:text-[8px]"></i>
              </button>
          </div>

          {/* Image Thumbnail / Upload */}
          <div className="flex-shrink-0">
            <div 
                onClick={() => triggerImageUpload(item.id)}
                className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:border-[#1a2e5a] overflow-hidden relative group/img"
                title="Click to upload image"
            >
                {item.image ? (
                    <>
                        <img src={item.image} alt="Item" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                            <i className="fa-solid fa-pen text-white text-xs"></i>
                        </div>
                    </>
                ) : (
                    <i className="fa-regular fa-image text-slate-300 group-hover/img:text-[#1a2e5a] transition-colors"></i>
                )}
            </div>
          </div>

          <div className="flex-1 relative">
            <textarea 
                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-[#1a2e5a]/10 focus:border-[#1a2e5a] outline-none transition-all shadow-sm resize-y" 
                value={item.description}
                onChange={e => handleItemChange(item.id, 'description', e.target.value, isRequested)}
                placeholder="Item Description"
                rows={2}
            />
            <div className="absolute right-2 top-2 flex gap-1">
                <button 
                    onClick={() => handleItemChange(item.id, 'isLumpSum', !item.isLumpSum, isRequested)}
                    title={item.isLumpSum ? "Switch to Sqft/Rate" : "Switch to Lump Sum (Labor/Electrical)"}
                    className={`text-[9px] font-bold px-2 py-1 rounded transition-all flex items-center gap-1 border
                    ${item.isLumpSum ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className={item.isLumpSum ? "fa-solid fa-calculator" : "fa-solid fa-tag"}></i> {item.isLumpSum ? 'LUMP SUM' : 'UNIT RATE'}
                </button>
                <button 
                    onClick={() => handleEnhanceItem(item.id, item.description, isRequested)}
                    disabled={isEnhancing === item.id}
                    title="Enhance with AI Specification"
                    className={`text-[9px] font-bold px-2 py-1 rounded transition-all flex items-center gap-1 border
                    ${isEnhancing === item.id ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border-indigo-100 disabled:opacity-30'}`}
                >
                    {isEnhancing === item.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-sparkles"></i> ENHANCE</>}
                </button>
                <button 
                    onClick={() => handleSmartEstimate(item.id, item.description, isRequested)}
                    disabled={isEstimating === item.id || item.isLumpSum}
                    title="Auto-fill with AI"
                    className={`text-[9px] font-bold px-2 py-1 rounded transition-all flex items-center gap-1 border
                    ${isEstimating === item.id ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-600 hover:bg-[#1a2e5a] hover:text-white border-slate-200 disabled:opacity-30'}`}
                >
                    {isEstimating === item.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-wand-magic-sparkles"></i> AI</>}
                </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Grid for Inputs */}
      <div className="grid grid-cols-2 md:contents gap-3 mt-3 md:mt-0">
        {/* Dimensions */}
        <div className="md:table-cell py-1 md:py-4 px-0 md:px-2 align-top">
          <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1">Dimensions</label>
          <input 
            type="text" 
            disabled={item.isLumpSum}
            className={`w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-[#1a2e5a]/10 focus:border-[#1a2e5a] outline-none transition-all shadow-sm text-center ${item.isLumpSum ? 'opacity-30 cursor-not-allowed' : ''}`} 
            value={item.dimensions} 
            onChange={e => handleItemChange(item.id, 'dimensions', e.target.value, isRequested)} 
            placeholder="L x W" 
          />
        </div>
        
        {/* SQFT */}
        <div className="md:table-cell py-1 md:py-4 px-0 md:px-2 align-top">
          <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1">Area (Sqft)</label>
          <input 
            type="number" min="0" step="0.01" 
            disabled={item.isLumpSum}
            className={`w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-[#1a2e5a]/10 focus:border-[#1a2e5a] outline-none transition-all shadow-sm text-right ${item.isLumpSum ? 'opacity-30 cursor-not-allowed' : ''}`} 
            value={item.sqft === 0 ? '' : item.sqft} 
            onChange={e => handleItemChange(item.id, 'sqft', e.target.value === '' ? 0 : parseFloat(e.target.value), isRequested)} 
            placeholder="0" 
          />
        </div>

        {/* Cost (Internal) */}
        <div className="md:table-cell py-1 md:py-4 px-0 md:px-2 align-top">
          <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1">Cost (₹)</label>
          <div className="relative group/cost">
            <span className="absolute left-3 top-2.5 text-slate-300 text-sm group-hover/cost:text-slate-400 transition-colors">₹</span>
            <input 
              type="number" min="0" step="1" 
              className="w-full p-2.5 pl-6 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm text-right hover:bg-white" 
              value={item.cost === 0 || item.cost === undefined ? '' : item.cost} 
              onChange={e => handleItemChange(item.id, 'cost', e.target.value === '' ? 0 : parseFloat(e.target.value), isRequested)} 
              placeholder="0" 
              title="Internal Cost Price"
            />
          </div>
        </div>
        
        {/* Rate */}
        <div className="md:table-cell py-1 md:py-4 px-0 md:px-2 align-top">
          <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1">Rate (₹)</label>
          <div className="relative">
            <span className={`absolute left-3 top-2.5 text-slate-400 text-sm ${item.isLumpSum ? 'opacity-30' : ''}`}>₹</span>
            <input 
              type="number" min="0" step="1" 
              disabled={item.isLumpSum}
              className={`w-full p-2.5 pl-6 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-[#1a2e5a]/10 focus:border-[#1a2e5a] outline-none transition-all shadow-sm text-right ${item.isLumpSum ? 'opacity-30 cursor-not-allowed' : ''}`} 
              value={item.rate === 0 ? '' : item.rate} 
              onChange={e => handleItemChange(item.id, 'rate', e.target.value === '' ? 0 : parseFloat(e.target.value), isRequested)} 
              placeholder="0" 
            />
          </div>
        </div>
        
        {/* Amount */}
        <div className="md:table-cell py-1 md:py-4 px-0 md:px-2 align-top col-span-2 md:col-span-1">
          <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1">Total Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
            <input 
              type="number" 
              disabled={!item.isLumpSum}
              className={`w-full p-2.5 pl-6 border rounded-lg font-bold text-sm outline-none shadow-sm text-right transition-all
                  ${item.isLumpSum 
                      ? 'bg-white border-amber-300 text-amber-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 cursor-not-allowed'}`} 
              value={item.amount === 0 ? '' : item.amount} 
              onChange={e => handleItemChange(item.id, 'amount', e.target.value === '' ? 0 : parseFloat(e.target.value), isRequested)}
              placeholder="0" 
            />
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="md:table-cell py-3 md:py-4 px-0 md:px-2 align-top text-center border-t md:border-t-0 border-slate-100 mt-2 md:mt-0">
        <div className="flex justify-end md:justify-center gap-2 md:gap-1 pt-1">
            {isRequested && (
                <button 
                    onClick={() => moveToMainList(item)} 
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-2 md:block" 
                    title="Move to Main List"
                >
                    <i className="fa-solid fa-arrow-up-from-bracket"></i>
                    <span className="text-[10px] font-bold md:hidden">MOVE TO MAIN</span>
                </button>
            )}
            <button onClick={() => duplicateItem(item, isRequested)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Duplicate"><i className="fa-regular fa-copy"></i></button>
            <button onClick={() => removeItem(item.id, isRequested)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete"><i className="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-32">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
        accept="image/*" 
      />
      
      {/* --- Sticky Header --- */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-40 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
        <div className="w-full md:w-auto">
            <div className="flex items-center gap-2 text-[10px] md:text-sm text-slate-500 mb-1">
                <span className="hidden sm:inline">Edit Quotation</span>
                <i className="fa-solid fa-chevron-right text-[8px] md:text-[10px] hidden sm:inline"></i>
                <span className="text-[#1a2e5a] font-bold">{formData.quoteNumber}</span>
                {isSaving && (
                    <span className="ml-2 md:ml-4 text-[9px] md:text-[10px] text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                        <i className="fa-solid fa-cloud-arrow-up"></i> <span className="hidden xs:inline">Auto-saving...</span>
                    </span>
                )}
                {lastSaved && !isSaving && (
                    <span className="ml-2 md:ml-4 text-[9px] md:text-[10px] text-slate-400 font-medium">
                        <span className="hidden xs:inline">Saved:</span> {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 truncate max-w-[200px] sm:max-w-none">{formData.clientName || 'New Project'}</h2>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
                { id: 'PARTICULARS', label: 'Items', icon: 'fa-list-check' },
                { id: 'DETAILS', label: 'Info', icon: 'fa-circle-info' },
                { id: 'TEXT', label: 'Terms', icon: 'fa-file-contract' },
                { id: 'BANKING', label: 'Bank', icon: 'fa-building-columns' },
                { id: 'PAYMENT', label: 'Payment', icon: 'fa-money-bill-transfer' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)} 
                    className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap
                    ${activeTab === tab.id 
                        ? 'bg-white text-[#1a2e5a] shadow-sm ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <i className={`fa-solid ${tab.icon}`}></i>
                    <span className="hidden sm:inline">{tab.label}</span>
                </button>
            ))}
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        
        {/* --- TAB: PROJECT DETAILS --- */}
        {activeTab === 'DETAILS' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
             <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
               <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-2">Project Information</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Client Name</label>
                   <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="e.g. Mr. Sharma" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Property Type</label>
                   <div className="relative">
                        <select 
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg appearance-none focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" 
                            value={formData.projectType} 
                            onChange={e => setFormData({...formData, projectType: e.target.value})}
                        >
                            <option value="">Select Property Type</option>
                            {PROJECT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400"><i className="fa-solid fa-chevron-down text-xs"></i></div>
                    </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Client Phone</label>
                   <input type="tel" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.clientPhone || ''} onChange={e => setFormData({...formData, clientPhone: e.target.value})} placeholder="+91 98765 43210" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Client Email</label>
                   <input type="email" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.clientEmail || ''} onChange={e => setFormData({...formData, clientEmail: e.target.value})} placeholder="client@example.com" />
                 </div>
               </div>
               
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Location / Address</label>
                 <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.projectLocation} onChange={e => setFormData({...formData, projectLocation: e.target.value})} placeholder="Project Site Address" />
               </div>

               <div>
                 <div className="flex items-center justify-between mb-2">
                   <label className="block text-xs font-bold text-slate-500 uppercase">Estimated Duration</label>
                   <button
                     onClick={handleEstimateDuration}
                     disabled={isEstimatingDuration}
                     className="text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-600 hover:text-white px-2.5 py-1 rounded-lg transition-all border border-purple-100 flex items-center gap-1.5 disabled:opacity-50"
                   >
                     {isEstimatingDuration ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-clock"></i>}
                     AI Estimate
                   </button>
                 </div>
                 <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.projectDuration || ''} onChange={e => setFormData({...formData, projectDuration: e.target.value})} placeholder="e.g. 45-60 Working Days" />
               </div>

               <div>
                 <div className="flex items-center justify-between mb-2">
                   <label className="block text-xs font-bold text-slate-500 uppercase">Project Overview / Notes</label>
                   <button
                     onClick={handleGenerateSummary}
                     disabled={isGeneratingSummary}
                     className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded-lg transition-all border border-blue-100 flex items-center gap-1.5 disabled:opacity-50"
                   >
                     {isGeneratingSummary ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                     AI Write Summary
                   </button>
                 </div>
                 <textarea
                   rows={4}
                   className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all resize-none text-sm leading-relaxed"
                   value={formData.notes || ''}
                   onChange={e => setFormData({...formData, notes: e.target.value})}
                   placeholder="Brief project overview for the client cover page..."
                 />
               </div>
             </div>
     
             <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
               <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-2">Quote Settings</h3>
               
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quote Status</label>
                 <div className="relative">
                    <select className="w-full p-3 bg-white border border-slate-300 rounded-lg appearance-none focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent to Client</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                    <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400"><i className="fa-solid fa-chevron-down text-xs"></i></div>
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Revision Number</label>
                 <input type="number" min="0" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.revision} onChange={e => setFormData({...formData, revision: parseInt(e.target.value) || 0})} />
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valid Until</label>
                 <input type="date" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all text-slate-600" value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} />
               </div>
             </div>
           </div>
        )}

        {/* --- TAB: TERMS & SPECS --- */}
        {activeTab === 'TEXT' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn h-[calc(100vh-250px)]">
                 <TextListEditor 
                    title="Specifications" 
                    icon="fa-list-ul" 
                    items={formData.specifications} 
                    onChange={(items) => setFormData({ ...formData, specifications: items })}
                    placeholder="Enter specification detail..."
                 />
                 <TextListEditor 
                    title="Terms & Conditions" 
                    icon="fa-file-contract" 
                    items={formData.terms} 
                    onChange={(items) => setFormData({ ...formData, terms: items })}
                    placeholder="Enter term or condition..."
                 />
             </div>
        )}

         {/* --- TAB: BANKING --- */}
         {activeTab === 'BANKING' && (
             <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
                    <i className="fa-solid fa-building-columns text-[#1a2e5a]"></i> Bank & Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Holder Name</label>
                        <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.bankDetails.accountName} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails, accountName: e.target.value}})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bank Name</label>
                        <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.bankDetails.bankName} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails, bankName: e.target.value}})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Number</label>
                        <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all font-mono" value={formData.bankDetails.accountNumber} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails, accountNumber: e.target.value}})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">IFSC Code</label>
                        <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all font-mono uppercase" value={formData.bankDetails.ifscCode} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails, ifscCode: e.target.value}})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Branch</label>
                        <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.bankDetails.branch} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails, branch: e.target.value}})} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">UPI ID (Optional)</label>
                        <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1a2e5a]/20 focus:border-[#1a2e5a] outline-none transition-all" value={formData.bankDetails.upiId || ''} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails, upiId: e.target.value}})} />
                    </div>
                </div>
             </div>
        )}

         {/* --- TAB: PAYMENT SCHEDULE --- */}
         {activeTab === 'PAYMENT' && (
              <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-money-bill-transfer text-[#1a2e5a]"></i> Payment Schedule
                    </h3>
                    <div className="flex gap-2">
                      <button 
                          onClick={handleGenerateSchedule}
                          disabled={isGeneratingSchedule}
                          className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-lg transition-all border border-purple-100 flex items-center gap-1.5 disabled:opacity-50"
                      >
                          {isGeneratingSchedule ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                          AI Generate
                      </button>
                      <button 
                          onClick={() => {
                              const schedule = formData.paymentSchedule || [];
                              setFormData({
                                  ...formData,
                                  paymentSchedule: [...schedule, { milestone: '', percentage: 0, amount: 0 }]
                              });
                          }}
                          className="text-xs font-bold text-[#1a2e5a] hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all border border-slate-200"
                      >
                          <i className="fa-solid fa-plus"></i> Add Milestone
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                      {(formData.paymentSchedule || []).map((p, idx) => (
                          <div key={idx} className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100 group">
                              <div className="flex-1">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Milestone Description</label>
                                  <input 
                                    type="text" 
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e5a]/10 outline-none"
                                    value={p.milestone}
                                    onChange={e => {
                                        const newSchedule = [...(formData.paymentSchedule || [])];
                                        newSchedule[idx].milestone = e.target.value;
                                        setFormData({ ...formData, paymentSchedule: newSchedule });
                                    }}
                                    placeholder="e.g. Advance Payment"
                                  />
                              </div>
                              <div className="w-24">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Percent (%)</label>
                                  <input 
                                    type="number" 
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#1a2e5a]/10 outline-none"
                                    value={p.percentage}
                                    onChange={e => {
                                        const percent = parseFloat(e.target.value) || 0;
                                        const newSchedule = [...(formData.paymentSchedule || [])];
                                        newSchedule[idx].percentage = percent;
                                        newSchedule[idx].amount = (formData.grandTotal * percent) / 100;
                                        setFormData({ ...formData, paymentSchedule: newSchedule });
                                    }}
                                  />
                              </div>
                              <div className="w-40">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (₹)</label>
                                  <input 
                                    type="number" 
                                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-right font-bold text-slate-700"
                                    value={Math.round(p.amount)}
                                    disabled
                                  />
                              </div>
                              <button 
                                onClick={() => {
                                    const newSchedule = (formData.paymentSchedule || []).filter((_, i) => i !== idx);
                                    setFormData({ ...formData, paymentSchedule: newSchedule });
                                }}
                                className="p-2.5 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                  <i className="fa-solid fa-trash-can"></i>
                              </button>
                          </div>
                      ))}

                      {(formData.paymentSchedule || []).length === 0 && (
                          <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                              <p className="text-slate-400 text-sm italic mb-4">No payment milestones defined.</p>
                              <button 
                                onClick={() => {
                                    setFormData({
                                        ...formData,
                                        paymentSchedule: [
                                            { milestone: 'Advance Payment', percentage: 50, amount: formData.grandTotal * 0.5 },
                                            { milestone: 'On Material Delivery', percentage: 40, amount: formData.grandTotal * 0.4 },
                                            { milestone: 'On Completion', percentage: 10, amount: formData.grandTotal * 0.1 }
                                        ]
                                    });
                                }}
                                className="text-xs font-bold text-[#1a2e5a] bg-[#1a2e5a]/5 px-4 py-2 rounded-full hover:bg-[#1a2e5a] hover:text-white transition-all"
                              >
                                  Load Standard 50-40-10 Schedule
                              </button>
                          </div>
                      )}

                      {(formData.paymentSchedule || []).length > 0 && (
                          <div className="flex justify-between items-center p-4 bg-[#1a2e5a] text-white rounded-xl shadow-lg">
                              <span className="text-sm font-bold uppercase tracking-wider">Total Scheduled</span>
                              <div className="flex items-center gap-6">
                                  <span className={`text-sm font-bold ${Math.round((formData.paymentSchedule || []).reduce((s, p) => s + p.percentage, 0)) === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                      {(formData.paymentSchedule || []).reduce((s, p) => s + p.percentage, 0)}%
                                  </span>
                                  <span className="text-xl font-black">
                                      ₹ {Math.round((formData.paymentSchedule || []).reduce((s, p) => s + p.amount, 0)).toLocaleString('en-IN')}
                                  </span>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
         )}

        {/* --- TAB: PARTICULARS (Main Table) --- */}
        {activeTab === 'PARTICULARS' && (
            <div className="animate-fadeIn space-y-10">
                
                {/* --- SECTIONS LOOP --- */}
                {categories.map((category, catIndex) => {
                    const sectionItems = groupedItems[category];
                    const sectionTotal = sectionItems.reduce((sum, i) => sum + (i.amount || 0), 0);
                    
                    return (
                        <div key={category} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             {/* Section Header */}
                             <div className="bg-slate-50 px-6 py-4 flex flex-col md:flex-row justify-between items-center border-b border-slate-200 gap-4">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="w-8 h-8 rounded-lg bg-[#1a2e5a] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                        {catIndex + 1}
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1a2e5a] truncate max-w-[200px] md:max-w-xs" title={category}>{category}</h3>
                                    <button 
                                        onClick={() => renameSection(category)} 
                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-[#1a2e5a] hover:border-[#1a2e5a] transition-all flex items-center justify-center shadow-sm" 
                                        title="Rename Section"
                                    >
                                        <i className="fa-solid fa-pen text-xs"></i>
                                    </button>
                                </div>
                                
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                    <button 
                                        onClick={() => handleSuggestItems(category)}
                                        disabled={isSuggesting === category}
                                        className="text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg transition-all border border-emerald-100 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSuggesting === category ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                                        SUGGEST ITEMS
                                    </button>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtotal</span>
                                        <span className="text-lg font-bold text-slate-800">₹ {sectionTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="h-8 w-[1px] bg-slate-300 mx-2 hidden md:block"></div>
                                    <button 
                                        onClick={() => deleteSection(category)} 
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all" 
                                        title="Delete Section"
                                    >
                                        <i className="fa-solid fa-trash-can text-lg"></i>
                                    </button>
                                </div>
                             </div>

                             {/* Items Table */}
                             <div className="overflow-x-auto md:overflow-visible">
                                <div className="w-full text-left md:table">
                                    <div className="hidden md:table-header-group">
                                        <div className="md:table-row bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            <div className="md:table-cell py-4 px-3 pl-6 w-[30%]">Description</div>
                                            <div className="md:table-cell py-4 px-2 text-center w-[10%]">Size</div>
                                            <div className="md:table-cell py-4 px-2 text-right w-[10%]">Sqft</div>
                                            <div className="md:table-cell py-4 px-2 text-right w-[10%]">Cost (₹)</div>
                                            <div className="md:table-cell py-4 px-2 text-right w-[10%]">Rate (₹)</div>
                                            <div className="md:table-cell py-4 px-2 text-right w-[15%]">Amount (₹)</div>
                                            <div className="md:table-cell py-4 px-2 text-center w-[10%]">Actions</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:table-row-group divide-y divide-slate-50 p-4 md:p-0">
                                        {sectionItems.map((item) => renderItemRow(item, false))}
                                    </div>
                                </div>
                             </div>
                             
                             {/* Add Item Button */}
                             <div className="bg-slate-50/50 p-3 border-t border-slate-100 flex justify-center">
                                <button onClick={() => addItem(category, false)} className="text-xs font-bold text-[#1a2e5a] hover:bg-[#1a2e5a]/5 px-4 py-2 rounded-full transition-all flex items-center gap-2 border border-transparent hover:border-[#1a2e5a]/10">
                                    <i className="fa-solid fa-circle-plus"></i> Add Item to {category}
                                </button>
                             </div>
                        </div>
                    );
                })}

                {/* Add New Section Button */}
                <button 
                    onClick={addSection} 
                    className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-[#1a2e5a] hover:text-[#1a2e5a] hover:bg-white hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-[#1a2e5a] group-hover:text-white flex items-center justify-center transition-colors">
                        <i className="fa-solid fa-layer-group"></i>
                    </div>
                    <span>Add New Section / Room</span>
                </button>


                {/* Supplementary Items Block */}
                <div className="bg-white rounded-2xl border border-dashed border-emerald-200 shadow-sm overflow-hidden mt-12">
                    <div className="bg-emerald-50/50 px-6 py-4 flex justify-between items-center border-b border-emerald-100">
                        <h3 className="font-bold text-emerald-800 flex items-center gap-2"><i className="fa-solid fa-circle-check"></i> Supplementary / Optional Items</h3>
                        <div className="flex gap-2">
                            {formData.requestedItems.length > 0 && (
                                <button 
                                    onClick={() => {
                                        setConfirmModal({
                                            isOpen: true,
                                            title: "Move All to Main",
                                            message: "Move all optional items to 'Miscellaneous' section in the main list?",
                                            variant: "info",
                                            onConfirm: () => {
                                                const newItems = [...formData.items, ...formData.requestedItems.map(i => ({ ...i, category: 'Miscellaneous' }))];
                                                const calcs = updateCalculations(newItems, formData.isGstEnabled, formData.discount, formData.gstPercentage);
                                                setFormData({ ...formData, requestedItems: [], items: newItems, ...calcs });
                                                showToast?.("All optional items moved to main list.", "success");
                                            }
                                        });
                                    }}
                                    className="bg-white border border-emerald-200 text-emerald-700 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all shadow-sm"
                                >
                                    <i className="fa-solid fa-arrow-up-from-bracket"></i> Move All to Main
                                </button>
                            )}
                            <button onClick={() => addItem('Optional', true)} className="bg-white border border-emerald-200 text-emerald-700 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><i className="fa-solid fa-plus"></i> Add Optional</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto md:overflow-visible">
                        <div className="w-full text-left md:table">
                            <div className="hidden md:table-header-group">
                                <div className="md:table-row bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <div className="md:table-cell py-4 px-3 pl-6 w-[35%]">Description</div>
                                    <div className="md:table-cell py-4 px-2 text-center w-[15%]">Size</div>
                                    <div className="md:table-cell py-4 px-2 text-right w-[10%]">Sqft</div>
                                    <div className="md:table-cell py-4 px-2 text-right w-[15%]">Rate</div>
                                    <div className="md:table-cell py-4 px-2 text-right w-[15%]">Estimate</div>
                                    <div className="md:table-cell py-4 px-2 text-center w-[10%]">Actions</div>
                                </div>
                            </div>
                            <div className="flex flex-col md:table-row-group divide-y divide-slate-50 p-4 md:p-0">
                                {formData.requestedItems.map((item) => renderItemRow(item, true))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* --- Sticky Footer for Totals --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 md:p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
          <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center gap-4 md:gap-6">
             
             {/* Totals Breakdown */}
             <div className="flex flex-wrap justify-center xl:justify-start gap-3 md:gap-8 items-center text-sm w-full xl:w-auto">
                <div className="flex flex-col text-center md:text-left">
                    <span className="text-[9px] md:text-[10px] uppercase text-slate-400 font-bold">Subtotal</span>
                    <span className="text-xs md:text-sm font-semibold text-slate-700">₹ {formData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                </div>
                
                <div className="h-6 md:h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

                {/* Discount */}
                <div className="flex flex-col w-20 md:w-28">
                    <label className="text-[9px] md:text-[10px] uppercase text-slate-400 font-bold mb-1">Discount (₹)</label>
                    <input 
                        type="number" 
                        min="0"
                        className="w-full p-1 bg-white border border-slate-300 rounded text-[10px] md:text-xs font-bold text-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all text-right"
                        value={formData.discount === 0 ? '' : formData.discount}
                        onChange={e => handleDiscountChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        placeholder="0"
                    />
                </div>

                <div className="h-6 md:h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

                {/* GST */}
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex flex-col text-center md:text-left">
                        <span className="text-[9px] md:text-[10px] uppercase text-slate-400 font-bold">GST ({formData.gstPercentage}%)</span>
                        <span className="text-xs md:text-sm font-semibold text-slate-700">₹ {formData.gst.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex flex-col w-12 md:w-16">
                        <label className="text-[8px] md:text-[9px] uppercase text-slate-400 font-bold mb-0.5">Rate %</label>
                        <input 
                            type="number" 
                            className="w-full p-1 bg-white border border-slate-300 rounded text-[9px] md:text-[10px] font-bold text-slate-600 focus:ring-1 focus:ring-[#1a2e5a] outline-none transition-all text-center"
                            value={formData.gstPercentage}
                            onChange={e => handleGstPercentChange(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer mt-2 md:mt-3">
                        <input type="checkbox" className="sr-only peer" checked={formData.isGstEnabled} onChange={e => handleGstToggle(e.target.checked)} />
                        <div className="w-7 h-4 md:w-9 md:h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 md:after:h-4 md:after:w-4 after:transition-all peer-checked:bg-[#1a2e5a]"></div>
                    </label>
                </div>

                <div className="h-6 md:h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

                <div className="flex flex-col text-center md:text-left bg-[#1a2e5a]/5 px-3 py-1 rounded-lg border border-[#1a2e5a]/10">
                    <span className="text-[9px] md:text-[10px] uppercase text-[#1a2e5a] font-black">Grand Total</span>
                    <span className="font-black text-base md:text-2xl text-[#1a2e5a]">₹ {formData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                </div>

                <div className="h-6 md:h-8 w-[1px] bg-slate-200 hidden xl:block"></div>

                {/* Profitability (Internal) */}
                <div className="flex flex-col text-center md:text-left group relative cursor-help">
                    <span className="text-[9px] md:text-[10px] uppercase text-emerald-600 font-bold flex items-center justify-center md:justify-start gap-1">
                        Profit <i className="fa-solid fa-circle-info text-[8px]"></i>
                    </span>
                    <span className="font-bold text-emerald-600 text-xs md:text-sm">
                        ₹ {(() => {
                            const calculateItemCost = (i: QuoteItem) => {
                                const qty = i.sqft > 0 ? i.sqft : 1;
                                return (i.cost || 0) * qty;
                            };
                            
                            const totalItemCost = formData.items.reduce((acc, i) => acc + calculateItemCost(i), 0) + 
                                                  formData.requestedItems.reduce((acc, i) => acc + calculateItemCost(i), 0);
                                                  
                            return (formData.subtotal - totalItemCost - formData.discount).toLocaleString('en-IN', { minimumFractionDigits: 0 });
                        })()}
                    </span>
                </div>
             </div>

             {/* Action Buttons */}
             <div className="flex gap-3 w-full xl:w-auto justify-center">
                <button onClick={onCancel} className="flex-1 xl:flex-none px-4 md:px-6 py-2 md:py-3 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm text-sm">
                    Discard
                </button>
                <button onClick={() => onSave(formData, false)} className="flex-1 xl:flex-none px-6 md:px-8 py-2 md:py-3 bg-[#1a2e5a] text-white rounded-xl font-bold hover:bg-[#2c4a8a] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform active:scale-95 text-sm">
                    <i className="fa-solid fa-floppy-disk"></i> Save Quote
                </button>
             </div>
          </div>
      </div>

      {/* Modals */}
      {promptModal && (
          <PromptModal
              isOpen={promptModal.isOpen}
              onClose={() => setPromptModal(null)}
              onConfirm={promptModal.onConfirm}
              title={promptModal.title}
              message={promptModal.message}
              defaultValue={promptModal.defaultValue}
          />
      )}

      {confirmModal && (
          <ConfirmDialog
              isOpen={confirmModal.isOpen}
              onClose={() => setConfirmModal(null)}
              onConfirm={confirmModal.onConfirm}
              title={confirmModal.title}
              message={confirmModal.message}
              variant={confirmModal.variant}
          />
      )}
    </div>
  );
};

export default QuotationForm;
