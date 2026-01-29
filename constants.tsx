import { OrderStatus, Order, PrepStatus, FulfillmentStatus, InvoiceStatus, CloseoutChecklist, LeadInfo, ArtConfirmation, ProductionMethod } from './types';

export const ORDER_STAGES: OrderStatus[] = [
  'Lead',
  'Quote',
  'Approval',
  'Art Confirmation',
  'Inventory Order',
  'Production Prep',
  'Inventory Received',
  'Production',
  'Fulfillment',
  'Invoice',
  'Closeout'
];

// Default values for new orders
export const DEFAULT_PREP_STATUS: PrepStatus = {
  gangSheetCreated: null,
  artworkDigitized: null,
  screensBurned: null,
  prepPending: false
};

export const DEFAULT_FULFILLMENT: FulfillmentStatus = {
  method: null,
  shippingLabelPrinted: false,
  customerPickedUp: false
};

export const DEFAULT_INVOICE_STATUS: InvoiceStatus = {
  invoiceCreated: false,
  invoiceSent: false,
  paymentReceived: false
};

export const DEFAULT_CLOSEOUT: CloseoutChecklist = {
  filesSaved: false,
  canvaArchived: false,
  summaryUploaded: false
};

export const DEFAULT_LEAD_INFO: LeadInfo = {
  source: 'Website',
  temperature: 'Warm',
  estimatedQuantity: 0,
  estimatedValue: 0,
  productInterest: '',
  decorationInterest: null,
  contactedAt: new Date()
};

export const DEFAULT_ART_CONFIRMATION: ArtConfirmation = {
  overallStatus: 'Not Started',
  placements: [],
  clientFiles: [],
  referenceFiles: [],
  revisionHistory: []
};

// Decoration/Production Method constants
export const PRODUCTION_METHODS: ProductionMethod[] = ['ScreenPrint', 'DTF', 'Embroidery', 'Other'];

export const PRODUCTION_METHOD_LABELS: Record<ProductionMethod, string> = {
  'ScreenPrint': 'Screen Print',
  'DTF': 'DTF Transfer',
  'Embroidery': 'Embroidery',
  'Other': 'Other'
};

export const PRODUCTION_METHOD_OPTIONS: { value: ProductionMethod; label: string }[] = [
  { value: 'ScreenPrint', label: 'Screen Print' },
  { value: 'DTF', label: 'DTF (Direct to Film)' },
  { value: 'Embroidery', label: 'Embroidery' },
  { value: 'Other', label: 'Other' }
];

export const PRODUCTION_METHOD_COLORS: Record<ProductionMethod, { bg: string; border: string; text: string }> = {
  'ScreenPrint': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  'DTF': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  'Embroidery': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  'Other': { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' }
};

// Size options for line items
export const SIZE_OPTIONS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'OS'];

// Art placement locations
export const PLACEMENT_LOCATIONS = [
  'Front Left Chest',
  'Front Center',
  'Full Front',
  'Back Neck',
  'Back Center',
  'Full Back',
  'Left Sleeve',
  'Right Sleeve',
  'Left Hip',
  'Right Hip',
  'Other'
];

export const DUMMY_ORDERS: Order[] = [
  // Sample Leads for sales funnel
  {
    id: 'LEAD-2024-0001',
    orderNumber: 'LEAD-2024-0001',
    customer: 'Sunrise Yoga Studio',
    customerEmail: 'hello@sunriseyoga.com',
    customerPhone: '555-789-0123',
    projectName: 'Instructor Apparel',
    status: 'Lead',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    dueDate: '',
    lineItems: [],
    artStatus: 'Not Started',
    rushOrder: false,
    leadInfo: {
      source: 'Website',
      temperature: 'Hot',
      estimatedQuantity: 75,
      estimatedValue: 1500,
      productInterest: 'Tank tops, leggings, sports bras',
      decorationInterest: 'DTF',
      eventDate: '2024-03-01',
      followUpDate: '2024-01-22',
      contactedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      contactNotes: 'Opening new studio location. Needs branded gear for 12 instructors. Very interested in DTF for full-color logo.',
      competitorQuoted: false,
      decisionMaker: 'Sarah Chen (Owner)',
      budget: '$1,500 - $2,000'
    },
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  },
  {
    id: 'LEAD-2024-0002',
    orderNumber: 'LEAD-2024-0002',
    customer: 'Harbor View Restaurant Group',
    customerEmail: 'operations@harborviewrg.com',
    projectName: 'Staff Uniforms',
    status: 'Lead',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    dueDate: '',
    lineItems: [],
    artStatus: 'Not Started',
    rushOrder: false,
    leadInfo: {
      source: 'Referral',
      temperature: 'Warm',
      estimatedQuantity: 200,
      estimatedValue: 4000,
      productInterest: 'Polo shirts, aprons, chef coats',
      decorationInterest: 'Embroidery',
      eventDate: '2024-04-15',
      followUpDate: '2024-01-25',
      contactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      contactNotes: 'Referred by Summit Coffee. Has 4 restaurant locations. Looking for consistent branding across all staff.',
      competitorQuoted: true,
      decisionMaker: 'Marcus Webb (Operations Director)',
      budget: '$4,000 - $5,000'
    },
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  },
  {
    id: 'LEAD-2024-0003',
    orderNumber: 'LEAD-2024-0003',
    customer: 'Riverside 5K Committee',
    customerEmail: 'info@riverside5k.org',
    projectName: 'Race Day Shirts',
    status: 'Lead',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    dueDate: '',
    lineItems: [],
    artStatus: 'Not Started',
    rushOrder: false,
    leadInfo: {
      source: 'Trade Show',
      temperature: 'Cold',
      estimatedQuantity: 500,
      estimatedValue: 5000,
      productInterest: 'Running shirts, performance tees',
      decorationInterest: 'ScreenPrint',
      eventDate: '2024-06-15',
      followUpDate: '2024-02-01',
      contactedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      contactNotes: 'Met at local business expo. Annual charity run. Still in early planning stages. Budget not finalized.',
      competitorQuoted: false,
      decisionMaker: 'Committee vote required'
    },
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  },
  {
    id: 'TBD-2024-0001',
    orderNumber: 'TBD-2024-0001',
    customer: 'Vertex Corp',
    customerEmail: 'orders@vertexcorp.com',
    customerPhone: '555-123-4567',
    projectName: 'Q3 Merch Drop',
    status: 'Quote',
    createdAt: new Date(Date.now() - 1000 * 60 * 130),
    dueDate: '2024-02-01',
    lineItems: [],
    artStatus: 'Not Started',
    rushOrder: false,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  },
  {
    id: 'TBD-2024-0002',
    orderNumber: 'TBD-2024-0002',
    customer: 'Nexus Athletics',
    customerEmail: 'gear@nexusathletics.com',
    projectName: 'Marathon Tees',
    status: 'Quote',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    dueDate: '2024-01-20',
    lineItems: [
      {
        id: 'li-1',
        itemNumber: 'NL6210',
        name: 'Next Level 6210 Cotton Tee',
        color: 'Navy',
        size: 'L',
        qty: 50,
        decorationType: 'ScreenPrint',
        decorationPlacements: 1,
        cost: 5,
        price: 15,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        screenPrintColors: 2,
        isPlusSize: false
      }
    ],
    artStatus: 'Not Started',
    rushOrder: false,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  },
  {
    id: 'TBD-2024-0003',
    orderNumber: 'TBD-2024-0003',
    customer: 'Summit Coffee',
    customerEmail: 'manager@summitcoffee.com',
    projectName: 'Barista Aprons',
    status: 'Art Confirmation',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    dueDate: '2024-01-25',
    lineItems: [
      {
        id: 'li-2',
        itemNumber: 'CA-PRO',
        name: 'Canvas Apron Professional',
        color: 'Black',
        size: 'OS',
        qty: 20,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 12,
        price: 34,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        stitchCountTier: '<8k',
        isPlusSize: false
      }
    ],
    artStatus: 'Sent to Customer',
    rushOrder: false,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      overallStatus: 'Sent to Customer',
      placements: [
        {
          id: 'ap-1',
          location: 'Front Left Chest',
          width: '3.5"',
          height: '3.5"',
          colorCount: 1,
          description: 'Summit Coffee logo - embroidered',
          proofs: [
            {
              id: 'proof-1',
              version: 1,
              proofName: 'Logo Placement v1',
              proofUrl: 'https://canva.com/design/example123',
              proofNotes: 'Standard logo placement, thread colors: brown, white, gold',
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
              sentToCustomerAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
              status: 'Sent',
              files: [
                {
                  id: 'file-1',
                  fileName: 'summit-logo-proof-v1.png',
                  fileType: 'proof',
                  fileUrl: 'https://canva.com/design/example123/preview.png',
                  uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
                  uploadedBy: 'designer',
                  notes: 'Embroidery mockup on black apron',
                  isMarkup: false
                }
              ],
              markupFiles: []
            }
          ]
        }
      ],
      clientFiles: [
        {
          id: 'client-file-1',
          fileName: 'summit-coffee-logo.ai',
          fileType: 'original',
          fileUrl: 'https://drive.google.com/file/summit-logo.ai',
          fileSize: 245000,
          mimeType: 'application/illustrator',
          uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
          uploadedBy: 'client',
          notes: 'Original vector logo from client',
          isMarkup: false
        },
        {
          id: 'client-file-2',
          fileName: 'brand-colors.pdf',
          fileType: 'reference',
          fileUrl: 'https://drive.google.com/file/brand-colors.pdf',
          fileSize: 128000,
          mimeType: 'application/pdf',
          uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
          uploadedBy: 'client',
          notes: 'Brand color guide - use PMS 4695 for brown',
          isMarkup: false
        }
      ],
      referenceFiles: [],
      revisionHistory: [
        {
          id: 'rev-1',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
          action: 'file_uploaded',
          description: 'Client uploaded original logo file',
          performedBy: 'Client',
          relatedFileId: 'client-file-1'
        },
        {
          id: 'rev-2',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
          action: 'placement_added',
          description: 'Added Front Left Chest placement',
          performedBy: 'Designer',
          relatedPlacementId: 'ap-1'
        },
        {
          id: 'rev-3',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
          action: 'proof_created',
          description: 'Created proof v1 for Front Left Chest',
          performedBy: 'Designer',
          relatedProofId: 'proof-1',
          relatedPlacementId: 'ap-1'
        },
        {
          id: 'rev-4',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20),
          action: 'proof_sent',
          description: 'Sent proof v1 to customer via email',
          performedBy: 'Designer',
          relatedProofId: 'proof-1'
        }
      ],
      customerContactMethod: 'Email',
      lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
      designerNotes: 'Using their existing logo file. Clean vector provided.',
      originalArtworkUrl: 'https://drive.google.com/file/summit-logo.ai',
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 36)
    },
    history: [],
    version: 1,
    isArchived: false
  },
  {
    id: 'TBD-2024-0004',
    orderNumber: 'TBD-2024-0004',
    customer: 'Blue Wave',
    customerEmail: 'team@bluewave.io',
    projectName: 'Staff Hoodies',
    status: 'Inventory Order',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    dueDate: '2024-01-15',
    lineItems: [
      {
        id: 'li-3',
        itemNumber: 'GD-1850',
        name: 'Gildan Heavy Blend Hoodie',
        color: 'Royal Blue',
        size: 'XL',
        qty: 100,
        decorationType: 'DTF',
        decorationPlacements: 2,
        cost: 18,
        price: 44,
        ordered: true,
        received: false,
        decorated: false,
        packed: false,
        dtfSize: 'Standard',
        isPlusSize: false
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  },
  {
    id: 'TBD-2024-0005',
    orderNumber: 'TBD-2024-0005',
    customer: 'TechFlow',
    customerEmail: 'events@techflow.dev',
    projectName: 'Hackathon Kit',
    status: 'Production',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
    dueDate: '2024-01-10',
    lineItems: [
      {
        id: 'li-4',
        itemNumber: 'PT-POLO',
        name: 'Port Authority Polo',
        color: 'Heather Grey',
        size: 'M',
        qty: 30,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 10,
        price: 25,
        ordered: true,
        received: true,
        decorated: false,
        packed: false,
        stitchCountTier: '8k-12k',
        isPlusSize: false
      }
    ],
    artStatus: 'Approved',
    rushOrder: true,
    prepStatus: {
      gangSheetCreated: null,
      artworkDigitized: true,
      screensBurned: null,
      prepPending: false
    },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  },
  {
    id: 'TBD-2024-0006',
    orderNumber: 'TBD-2024-0006',
    customer: 'Mountain View Brewing',
    customerEmail: 'taproom@mvbrewing.com',
    projectName: 'Taproom Merchandise',
    status: 'Quote',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    dueDate: '2024-02-15',
    lineItems: [],
    artStatus: 'Not Started',
    rushOrder: false,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  },
  {
    id: 'TBD-2024-0007',
    orderNumber: 'TBD-2024-0007',
    customer: 'Creative Agency Co',
    customerEmail: 'design@creativeagency.co',
    projectName: 'Client Gift Bags',
    status: 'Production Prep',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
    dueDate: '2024-01-18',
    lineItems: [
      {
        id: 'li-5',
        itemNumber: 'BC-3001',
        name: 'Bella+Canvas 3001 Tee',
        color: 'White',
        size: 'M',
        qty: 40,
        decorationType: 'DTF',
        decorationPlacements: 1,
        cost: 6,
        price: 18,
        ordered: true,
        received: false,
        decorated: false,
        packed: false,
        dtfSize: 'Large',
        isPlusSize: false
      },
      {
        id: 'li-6',
        itemNumber: 'OP-CAP',
        name: 'Otto Cap Snapback',
        color: 'Black',
        size: 'OS',
        qty: 40,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 8,
        price: 22,
        ordered: true,
        received: false,
        decorated: false,
        packed: false,
        stitchCountTier: '<8k',
        isPlusSize: false
      }
    ],
    artStatus: 'Not Started', // Bypassed art confirmation
    rushOrder: false,
    prepStatus: {
      gangSheetCreated: false,
      artworkDigitized: false,
      screensBurned: null,
      prepPending: false
    },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  }
];
