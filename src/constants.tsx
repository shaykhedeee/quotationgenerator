
import { Quotation, QuoteItem, BankDetails, CompanyProfile } from './types';

export const INITIAL_ITEM: QuoteItem = {
  id: '',
  category: 'General',
  description: '',
  dimensions: '-',
  sqft: 0,
  rate: 0,
  amount: 0,
  cost: 0,
  image: undefined,
  isLumpSum: false
};

export const PROJECT_TYPES = [
  "Studio Apartment",
  "1 BHK Apartment",
  "2 BHK Apartment",
  "3 BHK Apartment",
  "4 BHK+ Apartment",
  "Penthouse",
  "Villa",
  "Row House",
  "Commercial Office",
  "Retail Store",
  "Other"
];

export const CATEGORY_SUGGESTIONS = [
  "Foyer",
  "Living Room",
  "Dining Area",
  "Master Bedroom",
  "Kids Bedroom",
  "Guest Bedroom",
  "Kitchen",
  "Utility",
  "Balcony",
  "Bathrooms",
  "False Ceiling",
  "Electrical",
  "Civil Work"
];

export const DEFAULT_BANK_DETAILS: BankDetails = {
  accountName: "SPACES 360 INTERIORS",
  bankName: "HDFC Bank",
  accountNumber: "50200012345678",
  ifscCode: "HDFC0001234",
  branch: "Indiranagar, Bangalore",
  upiId: "spaces360@hdfcbank"
};

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: "SPACES 360",
  tagline: "Interior Architecture",
  address: "Bangalore • Karnataka • India",
  phone: "+91 98765 43210",
  email: "contact@spaces360.in",
  website: "www.spaces360.in",
  bankDetails: DEFAULT_BANK_DETAILS
};

export const DEFAULT_TERMS = [
  "Payment Terms: 65% advance required to commence work; Balance 35% due upon project completion.",
  "Validity: Quotation valid for 30 days from date of issue. Rates subject to change thereafter.",
  "Inclusions: Materials as per specs, Labor, Professional workmanship, Installation & finishing.",
  "Exclusions: Site preparation, Demolition, Civil works, Electrical/Plumbing outside scope.",
  "General: All dimensions are approximate and subject to on-site verification. Additional work charged separately."
];

export const DEFAULT_SPECS = [
  "Plywood: Century Sainik Plywood (ISI certified, BWP Grade, 16mm thickness) for all fixtures.",
  "Laminates: Century Laminates (1mm thickness, SF Grade). Upgrades to high gloss available.",
  "Hardware: Premium hinges by HAFELE, Locks by EBCO.",
  "Quality Assurance: All materials certified with complete inspection before handover.",
  "Plywood Guarantee: 10 years from manufacturers.",
  "Workmanship Guarantee: 5 years from completion date."
];

export const STANDARD_TEMPLATE: Partial<Quotation> = {
  items: [
    { id: 't1', category: 'Foyer', description: 'Shoe Rack with Seating', dimensions: '4 x 2.5', sqft: 10, rate: 1450, amount: 14500 },
    { id: 't2', category: 'Living Room', description: 'TV Unit (Base + Panel)', dimensions: '6 x 7', sqft: 42, rate: 1650, amount: 69300 },
    { id: 't3', category: 'Living Room', description: 'False Ceiling (Peripheral)', dimensions: '12 x 16', sqft: 192, rate: 125, amount: 24000 },
    { id: 't4', category: 'Dining Area', description: 'Crockery Unit', dimensions: '5 x 7', sqft: 35, rate: 1550, amount: 54250 },
    { id: 't5', category: 'Master Bedroom', description: 'Sliding Wardrobe', dimensions: '8 x 7', sqft: 56, rate: 1650, amount: 92400 },
    { id: 't6', category: 'Master Bedroom', description: 'Loft', dimensions: '8 x 2', sqft: 16, rate: 650, amount: 10400 },
    { id: 't7', category: 'Master Bedroom', description: 'Cot (King Size) with Storage', dimensions: '6 x 6.5', sqft: 39, rate: 1350, amount: 52650 },
    { id: 't8', category: 'Kitchen', description: 'Base Units (Tandem Drawers)', dimensions: '10 x 2.8', sqft: 28, rate: 1850, amount: 51800 },
    { id: 't9', category: 'Kitchen', description: 'Wall Units', dimensions: '10 x 2', sqft: 20, rate: 1450, amount: 29000 },
    { id: 't10', category: 'Kitchen', description: 'Tall Unit', dimensions: '2 x 7', sqft: 14, rate: 1850, amount: 25900 }
  ],
  requestedItems: [
    { id: 't11', category: 'Services', description: 'Electrical Point Shifting', dimensions: '-', sqft: 0, rate: 0, amount: 15000 },
    { id: 't12', category: 'Services', description: 'Deep Cleaning', dimensions: '-', sqft: 0, rate: 0, amount: 8000 }
  ]
};

export const TEMPLATE_1BHK: Partial<Quotation> = {
  items: [
    { id: 't1', category: 'Foyer', description: 'Shoe Rack', dimensions: '3 x 2.5', sqft: 7.5, rate: 1450, amount: 10875 },
    { id: 't2', category: 'Living Room', description: 'TV Unit', dimensions: '5 x 6', sqft: 30, rate: 1650, amount: 49500 },
    { id: 't3', category: 'Kitchen', description: 'Base Units', dimensions: '8 x 2.8', sqft: 22.4, rate: 1850, amount: 41440 },
    { id: 't4', category: 'Kitchen', description: 'Wall Units', dimensions: '8 x 2', sqft: 16, rate: 1450, amount: 23200 },
    { id: 't5', category: 'Master Bedroom', description: 'Wardrobe', dimensions: '6 x 7', sqft: 42, rate: 1650, amount: 69300 },
    { id: 't6', category: 'Master Bedroom', description: 'Cot (Queen)', dimensions: '5 x 6.5', sqft: 32.5, rate: 1350, amount: 43875 }
  ],
  requestedItems: []
};

export const TEMPLATE_2BHK: Partial<Quotation> = {
  items: [
    ...STANDARD_TEMPLATE.items!,
    { id: 't20', category: 'Guest Bedroom', description: 'Wardrobe', dimensions: '6 x 7', sqft: 42, rate: 1650, amount: 69300 },
    { id: 't21', category: 'Guest Bedroom', description: 'Cot (Queen)', dimensions: '5 x 6.5', sqft: 32.5, rate: 1350, amount: 43875 }
  ],
  requestedItems: STANDARD_TEMPLATE.requestedItems
};

export const TEMPLATE_3BHK: Partial<Quotation> = {
  items: [
    ...TEMPLATE_2BHK.items!,
    { id: 't30', category: 'Kids Bedroom', description: 'Wardrobe', dimensions: '5 x 7', sqft: 35, rate: 1650, amount: 57750 },
    { id: 't31', category: 'Kids Bedroom', description: 'Study Table', dimensions: '4 x 2.5', sqft: 10, rate: 1450, amount: 14500 }
  ],
  requestedItems: STANDARD_TEMPLATE.requestedItems
};

export const TEMPLATE_VILLA: Partial<Quotation> = {
  items: [
    ...TEMPLATE_3BHK.items!,
    { id: 'v1', category: 'Living Room', description: 'Wall Paneling', dimensions: '10 x 10', sqft: 100, rate: 650, amount: 65000 },
    { id: 'v2', category: 'Dining Area', description: 'Crockery Unit (Large)', dimensions: '6 x 7', sqft: 42, rate: 1850, amount: 77700 },
    { id: 'v3', category: 'Staircase', description: 'Storage Under Stairs', dimensions: '8 x 4', sqft: 32, rate: 1450, amount: 46400 }
  ],
  requestedItems: [
    ...STANDARD_TEMPLATE.requestedItems!,
    { id: 'v10', category: 'Services', description: 'False Ceiling (Entire House)', dimensions: '1200 sqft', sqft: 1200, rate: 110, amount: 132000 }
  ]
};

export const NIRANVELENDRA_QUOTATION: Quotation = {
  id: 'niranvelendra-2026',
  quoteNumber: 'Q-NVS-2026-001',
  clientName: 'Niranvelendra Singh',
  projectLocation: '',
  projectType: '2 BHK Apartment',
  dateOfIssue: '2026-03-23',
  validUntil: '2026-04-22',
  isGstEnabled: true,
  gstPercentage: 18,
  status: 'DRAFT',
  revision: 0,
  items: [
    // Kitchen  (section total ≈ 97,325 as per sheet)
    { id: 'n1',  category: 'Kitchen', description: 'Base Unit',        dimensions: '10.5 x 2.75', sqft: 28.75, rate: 1425, amount: 40950 },
    { id: 'n2',  category: 'Kitchen', description: 'Tall Unit',        dimensions: '1.75 x 6.75', sqft: 11.75, rate: 1425, amount: 16750 },
    { id: 'n3',  category: 'Kitchen', description: 'Wall Unit',        dimensions: '10.5 x 2',    sqft: 21,    rate: 1150, amount: 24150 },
    { id: 'n4',  category: 'Kitchen', description: 'Loft',             dimensions: '12 x 2.25',   sqft: 27,    rate: 575,  amount: 15525 },
    // Wardrobe – Master Bedroom
    { id: 'n5',  category: 'Wardrobe - Master Bedroom', description: 'Wardrobe', dimensions: '4.5 x 7',    sqft: 31.5,  rate: 1275, amount: 40162.50 },
    { id: 'n6',  category: 'Wardrobe - Master Bedroom', description: 'Loft',     dimensions: '11.5 x 2.25',sqft: 25.75, rate: 575,  amount: 14806.25 },
    // Wardrobe – Guest Bedroom
    { id: 'n7',  category: 'Wardrobe - Guest Bedroom',  description: 'Wardrobe', dimensions: '7 x 7',      sqft: 49,    rate: 1275, amount: 62475 },
    { id: 'n8',  category: 'Wardrobe - Guest Bedroom',  description: 'Loft',     dimensions: '10 x 2.25',  sqft: 22.5,  rate: 575,  amount: 12937.50 },
    // TV Unit
    { id: 'n9',  category: 'TV Unit', description: 'Base Unit',  dimensions: '5.5 x 2', sqft: 11,   rate: 1150, amount: 12650 },
    { id: 'n10', category: 'TV Unit', description: 'Box Panel',  dimensions: '5.5 x 5', sqft: 27.5, rate: 500,  amount: 13750 },
    // Pooja Unit
    { id: 'n11', category: 'Pooja Unit',      description: 'Pooja Unit',      dimensions: '1.5 x 7', sqft: 10.5, rate: 1150, amount: 12075 },
    // Utility Cabinet
    { id: 'n12', category: 'Utility Cabinet', description: 'Utility Cabinet', dimensions: '2.5 x 2', sqft: 5,    rate: 1150, amount: 5750 },
  ],
  requestedItems: [
    // Kitchen shelf rack noted at bottom of sheet – rate TBD
    { id: 'nr1', category: 'Kitchen', description: 'Shelf Rack (rate TBD)', dimensions: '2.75 x 2', sqft: 5.5, rate: 0, amount: 0, isLumpSum: true },
  ],
  subtotal: 271981.25,     // exact sum of all line items
  discount: 13599.06,      // 5% of subtotal
  gst: 46508.79,           // 18% of (subtotal − discount)
  grandTotal: 304891.0,    // (subtotal − discount) + gst
  specifications: DEFAULT_SPECS,
  terms: DEFAULT_TERMS,
  bankDetails: DEFAULT_BANK_DETAILS,
  paymentSchedule: [],
  projectDuration: '',
};

export const RIYA_YADAV_QUOTATION: Quotation = {
  id: 'riya-yadav-2026',
  quoteNumber: 'QT-2026-003',
  clientName: 'Ms. Riya Yadav',
  projectLocation: 'E-2208, Godrej Ananda',
  projectType: '3 BHK Apartment',
  dateOfIssue: '2026-03-23',
  validUntil: '2026-04-23',
  isGstEnabled: false,
  gstPercentage: 18,
  status: 'DRAFT',
  revision: 1,
  items: [
    // Kitchen  (section total: 1,16,200)
    { id: 'ry-k1',  category: 'Kitchen', description: 'Base Unit (L-Shape Segment 1)', dimensions: '14 x 2.75',   sqft: 33.5,  rate: 1425, amount: 47700 },
    { id: 'ry-k2',  category: 'Kitchen', description: 'Base Unit (L-Shape Segment 2)', dimensions: '12.25 x 2.75', sqft: 11.75, rate: 1425, amount: 16700 },
    { id: 'ry-k3',  category: 'Kitchen', description: 'Wall Unit',                      dimensions: '14 x 2',       sqft: 28,    rate: 1150, amount: 32200 },
    { id: 'ry-k4',  category: 'Kitchen', description: 'Loft',                           dimensions: '15.5 x 2.25',  sqft: 31.2,  rate: 575,  amount: 17950 },
    { id: 'ry-k5',  category: 'Kitchen', description: 'Chimney Panel',                  dimensions: '2.75 x 2',     sqft: 5.5,   rate: 300,  amount: 1650  },
    // Wardrobe – Master Bedroom  (section total: 75,375)
    { id: 'ry-m1',  category: 'Wardrobe - Master Bedroom', description: 'Wardrobe', dimensions: '7 x 7',     sqft: 49,   rate: 1275, amount: 62475 },
    { id: 'ry-m2',  category: 'Wardrobe - Master Bedroom', description: 'Loft',     dimensions: '10 x 2.25', sqft: 22.5, rate: 575,  amount: 12900 },
    // Wardrobe – Guest Bedroom 1  (section total: 75,375)
    { id: 'ry-g1',  category: 'Wardrobe - Guest Bedroom 1', description: 'Wardrobe', dimensions: '7 x 7',     sqft: 49,   rate: 1275, amount: 62475 },
    { id: 'ry-g2',  category: 'Wardrobe - Guest Bedroom 1', description: 'Loft',     dimensions: '10 x 2.25', sqft: 22.5, rate: 575,  amount: 12900 },
    // Wardrobe – Guest Bedroom 2  (section total: 99,900)
    { id: 'ry-g3',  category: 'Wardrobe - Guest Bedroom 2', description: 'Wardrobe', dimensions: '9.75 x 7',  sqft: 68.25, rate: 1275, amount: 87000 },
    { id: 'ry-g4',  category: 'Wardrobe - Guest Bedroom 2', description: 'Loft',     dimensions: '10 x 2.25', sqft: 22.5,  rate: 575,  amount: 12900 },
    // TV Unit  (section total: 37,000)
    { id: 'ry-tv1', category: 'TV Unit', description: 'Base Unit',   dimensions: '7 x 2', sqft: 14, rate: 1150, amount: 16100 },
    { id: 'ry-tv2', category: 'TV Unit', description: 'Box Panel',   dimensions: '5 x 5', sqft: 25, rate: 500,  amount: 12500 },
    { id: 'ry-tv3', category: 'TV Unit', description: 'Shelf Rack',  dimensions: '2 x 7', sqft: 14, rate: 600,  amount: 8400  },
    // Bathroom
    { id: 'ry-b1',  category: 'Bathroom', description: 'Bathroom Cabinet (Bottom)', dimensions: '2 x 2.5', sqft: 5, rate: 1150, amount: 5750 },
    // Extra Works
    { id: 'ry-e1',  category: 'Extra Works', description: 'Curtain Sliding Channel', dimensions: '47 ft', sqft: 0, rate: 180, amount: 8460, isLumpSum: true },
    { id: 'ry-e2',  category: 'Extra Works', description: 'Labour',                  dimensions: '-',     sqft: 0, rate: 0,   amount: 800,  isLumpSum: true },
  ],
  requestedItems: [],
  subtotal: 418860,
  discount: 0,
  gst: 0,
  grandTotal: 418860,
  specifications: DEFAULT_SPECS,
  terms: DEFAULT_TERMS,
  bankDetails: DEFAULT_BANK_DETAILS,
  paymentSchedule: [],
  projectDuration: '45-60 Working Days',
};

export const SAMPLE_QUOTATION: Quotation = {
  id: '1',
  quoteNumber: 'Q-UDHAV-BRIGADE-001',
  clientName: 'Mr. Udhav',
  projectLocation: '2144, Brigade Cornerstone Utopia, Varthur',
  projectType: '2 BHK Apartment',
  dateOfIssue: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  isGstEnabled: true,
  gstPercentage: 18,
  status: 'DRAFT',
  revision: 0,
  items: [
    { id: 'i1', category: 'Master Bedroom', description: 'Wardrobe', dimensions: '5 x 7', sqft: 35, rate: 1275, amount: 44625 },
    { id: 'i2', category: 'Master Bedroom', description: 'Loft', dimensions: '10.5 x 1.5', sqft: 15.75, rate: 575, amount: 9056.25 },
    { id: 'i3', category: 'Master Bedroom', description: 'Corner Table', dimensions: '3 x 2.5', sqft: 7.5, rate: 1100, amount: 8250 },
    { id: 'i4', category: 'Master Bedroom', description: 'Cot (with Hydraulic Lift & Storage)', dimensions: '5 x 6.5', sqft: 32.5, rate: 1200, amount: 39000 },
    { id: 'i5', category: 'Kitchen', description: 'Kitchen Base Unit', dimensions: '6 x 2.75', sqft: 16.5, rate: 1450, amount: 23925 },
    { id: 'i6', category: 'Kitchen', description: 'Wall Cabinets (Glass Doors)', dimensions: '4 x 2', sqft: 8, rate: 1100, amount: 8800 },
    { id: 'i7', category: 'Kitchen', description: 'Loft (Kitchen)', dimensions: '6 x 1.5', sqft: 9, rate: 575, amount: 5175 },
    { id: 'i8', category: 'Kitchen', description: 'Sink Cabinet (Base Unit)', dimensions: '3 x 4', sqft: 12, rate: 700, amount: 8400 },
    { id: 'i9', category: 'Kitchen', description: 'Wall Cabinets', dimensions: '4 x 2', sqft: 8, rate: 1100, amount: 8800 },
    { id: 'i10', category: 'Living Room', description: 'Loft', dimensions: '4 x 1.5', sqft: 6, rate: 575, amount: 3450 }
  ],
  requestedItems: [
    { id: 'i11', category: 'Civil Work', description: 'POP Work (St. Gobain Material)', dimensions: '-', sqft: 0, rate: 0, amount: 26500 },
    { id: 'i12', category: 'Civil Work', description: 'POP Work (Regular)', dimensions: '-', sqft: 0, rate: 0, amount: 19000 }
  ],
  subtotal: 159481.25,
  discount: 0,
  gst: 28706.62,
  grandTotal: 188187.87,
  specifications: DEFAULT_SPECS,
  terms: DEFAULT_TERMS,
  bankDetails: DEFAULT_BANK_DETAILS
};
