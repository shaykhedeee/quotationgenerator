
export interface QuoteItem {
  id: string;
  category?: string; // New field for grouping (e.g., "Kitchen", "Living Room")
  description: string;
  dimensions: string;
  sqft: number;
  rate: number;
  amount: number;
  image?: string; // Base64 or URL
  cost?: number; // Internal cost price for profit calculation
  isLumpSum?: boolean; // If true, ignore sqft/rate and allow direct amount entry
  unit?: string; // e.g. "Sqft", "Nos", "Rft", "LS"
  notes?: string; // Internal notes for this item
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';

export interface BankDetails {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId?: string;
}

export interface CompanyProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gstNo?: string;
  logo?: string; // Base64
  signature?: string; // Base64
  bankDetails: BankDetails;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  projectLocation: string;
  projectType: string;
  dateOfIssue: string;
  validUntil: string;
  items: QuoteItem[];
  requestedItems: QuoteItem[];
  
  // Financials
  isGstEnabled: boolean;
  gstPercentage: number; // e.g. 18, 6, etc.
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  
  // Content
  projectDuration?: string; // e.g. "45 Days", "2 Months"
  paymentSchedule?: { milestone: string; percentage: number; amount: number }[];
  specifications: string[];
  terms: string[];
  bankDetails: BankDetails;
  notes?: string; // Internal/executive notes or project summary
  
  // Metadata
  status: QuoteStatus;
  revision: number;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

export enum ViewState {
  LIST = 'LIST',
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW',
  SETTINGS = 'SETTINGS'
}
