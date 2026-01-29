// 11-Stage Workflow Status (Lead + 10 Production Stages) + Closed
export type OrderStatus =
  | 'Lead'               // Stage 0 - Initial inquiry / sales funnel
  | 'Quote'              // Stage 1
  | 'Approval'           // Stage 2
  | 'Art Confirmation'   // Stage 3
  | 'Inventory Order'    // Stage 4
  | 'Production Prep'    // Stage 5
  | 'Inventory Received' // Stage 6
  | 'Production'         // Stage 7
  | 'Fulfillment'        // Stage 8
  | 'Invoice'            // Stage 9 - Send invoice to customer
  | 'Closeout'           // Stage 10 - Project closeout checklist
  | 'Closed';            // Stage 11 - Completed/Archived

// Lead source tracking
export type LeadSource = 'Website' | 'Referral' | 'Social Media' | 'Cold Call' | 'Trade Show' | 'Email Campaign' | 'Other';

// Lead interest/temperature level
export type LeadTemperature = 'Hot' | 'Warm' | 'Cold';

// Lead-specific information for sales funnel
export interface LeadInfo {
  source: LeadSource;
  temperature: LeadTemperature;
  estimatedQuantity: number;
  estimatedValue: number;
  productInterest: string;           // What products they're interested in
  decorationInterest: ProductionMethod | null;
  eventDate?: string;                // Target event/need-by date
  followUpDate?: string;             // When to follow up
  contactedAt: Date;                 // When lead was first captured
  lastContactAt?: Date;              // Most recent contact
  contactNotes?: string;             // Notes from conversations
  competitorQuoted?: boolean;        // Are they shopping around?
  decisionMaker?: string;            // Who makes the purchasing decision
  budget?: string;                   // Budget range if known
}

export type ProductionMethod = 'ScreenPrint' | 'Embroidery' | 'DTF' | 'Other';

export type ArtStatus = 'Not Started' | 'In Progress' | 'Sent to Customer' | 'Revision Requested' | 'Approved';

// File type for art uploads
export type ArtFileType = 'original' | 'proof' | 'markup' | 'reference' | 'final';
export type ArtFileSource = 'client' | 'designer' | 'system';

// Art file attachment
export interface ArtFile {
  id: string;
  fileName: string;               // Original file name
  fileType: ArtFileType;          // Type of file
  fileUrl: string;                // URL or data URI
  fileSize?: number;              // Size in bytes
  mimeType?: string;              // MIME type (image/png, application/pdf, etc.)
  thumbnailUrl?: string;          // Thumbnail for preview
  uploadedAt: Date;
  uploadedBy: ArtFileSource;      // Who uploaded it
  notes?: string;                 // Notes about this file
  isMarkup: boolean;              // Is this a marked-up version from client?
  parentFileId?: string;          // Reference to original file if this is a markup
}

// Art revision history entry
export interface ArtRevision {
  id: string;
  timestamp: Date;
  action: 'file_uploaded' | 'proof_created' | 'proof_sent' | 'feedback_received' | 'revision_requested' | 'approved' | 'note_added' | 'placement_added' | 'placement_removed';
  description: string;
  performedBy?: string;           // User or "Client" or "System"
  relatedFileId?: string;         // Related file if applicable
  relatedProofId?: string;        // Related proof if applicable
  relatedPlacementId?: string;    // Related placement if applicable
  previousValue?: string;         // For tracking changes
  newValue?: string;              // For tracking changes
  notes?: string;
}

// Art proof version tracking
export interface ArtProof {
  id: string;
  version: number;
  proofName: string;              // e.g., "Front Logo v2"
  proofUrl?: string;              // Link to proof file (Canva, Google Drive, etc.)
  proofNotes?: string;            // Designer notes about this version
  createdAt: Date;
  sentToCustomerAt?: Date;
  customerFeedback?: string;      // Customer's response/feedback
  feedbackReceivedAt?: Date;
  status: 'Draft' | 'Sent' | 'Approved' | 'Revision Needed';
  // File attachments for this proof
  files: ArtFile[];               // Proof files (designer uploads)
  markupFiles: ArtFile[];         // Client markup files (client feedback with annotations)
}

// Art placement/location configuration
export interface ArtPlacement {
  id: string;
  location: string;               // e.g., "Front Left Chest", "Full Back", "Left Sleeve"
  width?: string;                 // e.g., "3.5 inches"
  height?: string;                // e.g., "4 inches"
  colorCount?: number;            // For screen print
  description?: string;           // Special instructions
  proofs: ArtProof[];             // Version history for this placement
}

// Complete art confirmation workflow data
export interface ArtConfirmation {
  // Overall status
  overallStatus: ArtStatus;

  // Art placements with their proofs
  placements: ArtPlacement[];

  // Original artwork files from client
  clientFiles: ArtFile[];         // Files uploaded by/from client

  // Reference files (inspiration, brand guides, etc.)
  referenceFiles: ArtFile[];

  // Revision history - complete audit trail
  revisionHistory: ArtRevision[];

  // Communication log
  customerContactMethod?: 'Email' | 'Phone' | 'Text' | 'In Person';
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;

  // Internal notes
  designerNotes?: string;
  internalNotes?: string;

  // Customer info for this order
  customerApprovalName?: string;  // Who approved the art
  customerApprovalDate?: Date;
  customerApprovalMethod?: 'Email' | 'Signed Proof' | 'Verbal' | 'Digital Signature';

  // Legacy URL fields (for backwards compatibility)
  originalArtworkUrl?: string;    // Customer's original artwork/logo
  mockupUrl?: string;             // Product mockup with art applied

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
}

export type FulfillmentMethod = 'Shipped' | 'PickedUp' | null;

export interface LineItem {
  id: string;

  // Product Identification
  itemNumber: string;
  name: string;

  // Garment Details
  color: string;
  size: string;
  qty: number;

  // Decoration Details
  decorationType: ProductionMethod;
  decorationPlacements: number;
  decorationDescription?: string;

  // Pricing
  cost: number;
  price: number;

  // Change Order Tracking
  isChangeOrder?: boolean;       // True if this is a change order item
  changeOrderDate?: Date;        // When this change order item was added
  originalQuantity?: number;     // Original qty before change (for tracking reductions)

  // Stage-specific tracking flags
  ordered: boolean;              // Stage 4: Inventory Order
  received: boolean;             // Stage 6: Inventory Received
  decorated: boolean;            // Stage 7: Production - decoration complete
  packed: boolean;               // Stage 7: Production - packing complete

  // Timestamps for tracking
  orderedAt?: Date;
  receivedAt?: Date;
  decoratedAt?: Date;
  packedAt?: Date;

  // Method-specific pricing fields
  screenPrintColors?: number;
  isPlusSize?: boolean;
  stitchCountTier?: '<8k' | '8k-12k' | '12k+';
  dtfSize?: 'Standard' | 'Large';
}

// Stage 5: Production Prep status
export interface PrepStatus {
  gangSheetCreated: boolean | null;    // Required if DTF present
  artworkDigitized: boolean | null;    // Required if Embroidery present
  screensBurned: boolean | null;       // Required if ScreenPrint present
  prepPending: boolean;                // True if inventory was received before prep completed
}

// Stage 9: Invoice status
export interface InvoiceStatus {
  invoiceNumber?: string;
  invoiceAmount?: number;
  invoiceCreated: boolean;
  invoiceSent: boolean;
  invoiceSentAt?: Date;
  paymentReceived: boolean;
  paymentReceivedAt?: Date;
  paymentMethod?: 'Cash' | 'Check' | 'Credit Card' | 'ACH' | 'Other';
  paymentNotes?: string;
}

// Stage 10: Closeout checklist
export interface CloseoutChecklist {
  filesSaved: boolean;
  canvaArchived: boolean;
  summaryUploaded: boolean;
}

// Stage 8: Fulfillment status
export interface FulfillmentStatus {
  method: FulfillmentMethod;
  shippingLabelPrinted: boolean;
  customerPickedUp: boolean;
  trackingNumber?: string;
  fulfilledAt?: Date;
}

// Audit trail entry
export interface StatusChangeLog {
  timestamp: Date;
  userId?: string;
  userName?: string;
  action: string;
  previousValue: any;
  newValue: any;
  notes?: string;
}

// ============================================
// USER & AUTHENTICATION TYPES
// ============================================

export type UserRole = 'Admin' | 'Manager' | 'Sales' | 'Production' | 'Fulfillment' | 'ReadOnly';

export interface User {
  id: string;
  username: string;
  password: string;              // In production, this would be hashed
  displayName: string;
  email?: string;
  role: UserRole;
  department?: string;
  reportsTo?: string;            // User ID of manager
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface OrgHierarchy {
  users: User[];
  departments: string[];
  lastUpdatedAt: Date;
  lastUpdatedBy?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  loginError?: string;
}

// Production Floor - Hourly Productivity Entry
export interface ProductivityEntry {
  id: string;
  date: string;                    // YYYY-MM-DD format
  hour: number;                    // 0-23 (hour of the day)
  operatorName: string;
  orderNumber: string;
  orderId: string;
  decorationType: ProductionMethod;
  itemsDecorated: number;
  itemsPacked: number;
  notes?: string;
  createdAt: Date;
}

// Daily Productivity Summary
export interface DailyProductivitySummary {
  date: string;
  totalItemsDecorated: number;
  totalItemsPacked: number;
  entriesByHour: { hour: number; decorated: number; packed: number }[];
  entriesByOperator: { operator: string; decorated: number; packed: number }[];
  entriesByMethod: { method: ProductionMethod; decorated: number; packed: number }[];
}

export interface Order {
  id: string;
  orderNumber: string;           // Human-readable (e.g., "TBD-2024-0001")

  // Customer Info
  customer: string;
  customerEmail?: string;
  customerPhone?: string;

  projectName: string;
  status: OrderStatus;
  artStatus: ArtStatus;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  dueDate: string;

  // Flags
  rushOrder: boolean;
  notes?: string;

  // Purchase Order Numbers (entered during Inventory Order stage)
  poNumbers?: {
    primary?: string;      // Primary PO - travels with the order
    secondary?: string;    // Secondary PO
    tertiary?: string;     // Tertiary PO
  };

  // Selected vendor for inventory orders
  selectedVendorId?: string;

  // Line items
  lineItems: LineItem[];

  // Lead-specific data (populated when status is 'Lead')
  leadInfo?: LeadInfo;

  // Art confirmation workflow data
  artConfirmation: ArtConfirmation;

  // Stage-specific data
  prepStatus: PrepStatus;
  fulfillment: FulfillmentStatus;
  invoiceStatus: InvoiceStatus;
  closeoutChecklist: CloseoutChecklist;

  // Audit trail
  history: StatusChangeLog[];

  // Concurrency control
  version: number;
  archivedAt?: Date | null;
  isArchived: boolean;

  // Closed order tracking
  closedAt?: Date | null;
  closedReason?: string | null;           // Reason for closing (Completed, Cancelled, etc.)
  reopenedFrom?: OrderStatus | null;      // Track what status to return to if reopened

  // Change Order tracking (line items are marked as change orders, not separate order entities)
  hasChangeOrders?: boolean;       // True if this order has change order items
  lastChangeOrderDate?: Date;      // When the most recent change order was added
}

export type ViewMode = 'Sales' | 'Production';

// Stage number mapping for validation
export const STAGE_NUMBER: Record<OrderStatus, number> = {
  'Lead': 0,
  'Quote': 1,
  'Approval': 2,
  'Art Confirmation': 3,
  'Inventory Order': 4,
  'Production Prep': 5,
  'Inventory Received': 6,
  'Production': 7,
  'Fulfillment': 8,
  'Invoice': 9,
  'Closeout': 10,
  'Closed': 11
};

// Allowed transitions
export const ALLOWED_TRANSITIONS: Record<number, number[]> = {
  0: [1],      // Lead → Quote only
  1: [2],      // Quote → Approval only
  2: [3],      // Approval → Art Confirmation only
  3: [4],      // Art Confirmation → Inventory Order only
  4: [5],      // Inventory Order → Production Prep only
  5: [6],      // Production Prep → Inventory Received only
  6: [7],      // Inventory Received → Production only
  7: [8],      // Production → Fulfillment only
  8: [9],      // Fulfillment → Invoice only
  9: [10],     // Invoice → Closeout
  10: [11],    // Closeout → Closed
  11: []       // Closed - can be reopened to any stage
};

// ============================================
// DATABASE SCHEMA DEFINITION
// ============================================

// Customer Entity - extracted from orders for CRM functionality
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  notes?: string;
  tags?: string[];
  totalOrders: number;
  totalRevenue: number;
  lastOrderAt?: Date;
}

// Product Catalog Entry
export interface Product {
  id: string;
  itemNumber: string;           // SKU
  name: string;
  description?: string;
  category?: string;
  baseCost: number;
  basePrice: number;
  availableSizes: string[];
  availableColors: string[];
  supplier?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Database Metadata
export interface DatabaseMetadata {
  version: string;
  schemaVersion: string;
  createdAt: Date;
  lastModifiedAt: Date;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalLineItems: number;
}

// Complete Database Schema
export interface DatabaseSchema {
  metadata: DatabaseMetadata;
  orders: Order[];
  customers: Customer[];
  products: Product[];
}

// Schema Definition for Documentation
export const SCHEMA_DEFINITION = {
  version: '2.0.0',
  entities: {
    Order: {
      description: 'Primary order/job tracking entity',
      fields: {
        id: { type: 'string', required: true, description: 'Unique identifier' },
        orderNumber: { type: 'string', required: true, description: 'Human-readable order number (e.g., TBD-2024-0001)' },
        customer: { type: 'string', required: true, description: 'Customer/business name' },
        customerEmail: { type: 'string', required: false, description: 'Customer email address' },
        customerPhone: { type: 'string', required: false, description: 'Customer phone number' },
        projectName: { type: 'string', required: true, description: 'Project or job name' },
        status: { type: 'OrderStatus', required: true, description: 'Current workflow stage (Lead through Invoice)' },
        artStatus: { type: 'ArtStatus', required: true, description: 'Artwork approval status' },
        createdAt: { type: 'Date', required: true, description: 'Order creation timestamp' },
        updatedAt: { type: 'Date', required: false, description: 'Last modification timestamp' },
        dueDate: { type: 'string', required: true, description: 'Target completion date' },
        rushOrder: { type: 'boolean', required: true, description: 'Rush order flag' },
        notes: { type: 'string', required: false, description: 'Order notes' },
        lineItems: { type: 'LineItem[]', required: true, description: 'Array of line items' },
        leadInfo: { type: 'LeadInfo', required: false, description: 'Lead-specific data (when status is Lead)' },
        artConfirmation: { type: 'ArtConfirmation', required: true, description: 'Art confirmation workflow data' },
        prepStatus: { type: 'PrepStatus', required: true, description: 'Production prep checklist status' },
        fulfillment: { type: 'FulfillmentStatus', required: true, description: 'Fulfillment/shipping status' },
        invoiceStatus: { type: 'InvoiceStatus', required: true, description: 'Invoice stage status' },
        closeoutChecklist: { type: 'CloseoutChecklist', required: true, description: 'Project closeout checklist' },
        history: { type: 'StatusChangeLog[]', required: true, description: 'Audit trail of changes' },
        version: { type: 'number', required: true, description: 'Optimistic concurrency version' },
        isArchived: { type: 'boolean', required: true, description: 'Soft delete flag' },
        archivedAt: { type: 'Date', required: false, description: 'Archive timestamp' },
        closedAt: { type: 'Date', required: false, description: 'Order closure timestamp' },
        closedReason: { type: 'string', required: false, description: 'Reason for closing (Completed, Cancelled, etc.)' },
        reopenedFrom: { type: 'OrderStatus', required: false, description: 'Previous status before closing (for reopening)' },
        isChangeOrder: { type: 'boolean', required: false, description: 'Flag indicating this is a change order' },
        parentOrderId: { type: 'string', required: false, description: 'Reference to parent order (for change orders)' },
        changeOrderIds: { type: 'string[]', required: false, description: 'Array of child change order IDs (for parent orders)' }
      },
      relationships: {
        lineItems: { type: 'one-to-many', target: 'LineItem', description: 'Order contains multiple line items' },
        leadInfo: { type: 'one-to-one', target: 'LeadInfo', description: 'Optional lead information' },
        artConfirmation: { type: 'one-to-one', target: 'ArtConfirmation', description: 'Art confirmation workflow' },
        history: { type: 'one-to-many', target: 'StatusChangeLog', description: 'Audit trail entries' }
      }
    },
    LineItem: {
      description: 'Individual product line within an order',
      fields: {
        id: { type: 'string', required: true, description: 'Unique identifier' },
        itemNumber: { type: 'string', required: true, description: 'Product SKU' },
        name: { type: 'string', required: true, description: 'Product name' },
        color: { type: 'string', required: true, description: 'Product color' },
        size: { type: 'string', required: true, description: 'Product size' },
        qty: { type: 'number', required: true, description: 'Quantity ordered' },
        decorationType: { type: 'ProductionMethod', required: true, description: 'Decoration method' },
        decorationPlacements: { type: 'number', required: true, description: 'Number of print/embroidery locations' },
        decorationDescription: { type: 'string', required: false, description: 'Decoration details' },
        cost: { type: 'number', required: true, description: 'Unit cost (wholesale)' },
        price: { type: 'number', required: true, description: 'Unit price (selling)' },
        ordered: { type: 'boolean', required: true, description: 'Inventory ordered flag' },
        received: { type: 'boolean', required: true, description: 'Inventory received flag' },
        decorated: { type: 'boolean', required: true, description: 'Decoration complete flag' },
        packed: { type: 'boolean', required: true, description: 'Packing complete flag' },
        orderedAt: { type: 'Date', required: false, description: 'Inventory order timestamp' },
        receivedAt: { type: 'Date', required: false, description: 'Inventory receipt timestamp' },
        decoratedAt: { type: 'Date', required: false, description: 'Decoration completion timestamp' },
        packedAt: { type: 'Date', required: false, description: 'Packing completion timestamp' },
        screenPrintColors: { type: 'number', required: false, description: 'Number of ink colors (screen print)' },
        isPlusSize: { type: 'boolean', required: false, description: 'Plus size surcharge flag' },
        stitchCountTier: { type: 'string', required: false, description: 'Embroidery stitch count tier' },
        dtfSize: { type: 'string', required: false, description: 'DTF transfer size' }
      }
    },
    LeadInfo: {
      description: 'Sales lead tracking information',
      fields: {
        source: { type: 'LeadSource', required: true, description: 'How the lead was acquired' },
        temperature: { type: 'LeadTemperature', required: true, description: 'Lead qualification level' },
        estimatedQuantity: { type: 'number', required: true, description: 'Estimated unit quantity' },
        estimatedValue: { type: 'number', required: true, description: 'Estimated order value' },
        productInterest: { type: 'string', required: true, description: 'Products of interest' },
        decorationInterest: { type: 'ProductionMethod', required: false, description: 'Decoration method interest' },
        eventDate: { type: 'string', required: false, description: 'Target event date' },
        followUpDate: { type: 'string', required: false, description: 'Next follow-up date' },
        contactedAt: { type: 'Date', required: true, description: 'Initial contact timestamp' },
        lastContactAt: { type: 'Date', required: false, description: 'Most recent contact' },
        contactNotes: { type: 'string', required: false, description: 'Contact notes' },
        competitorQuoted: { type: 'boolean', required: false, description: 'Competitor involvement flag' },
        decisionMaker: { type: 'string', required: false, description: 'Decision maker name' },
        budget: { type: 'string', required: false, description: 'Budget range' }
      }
    },
    PrepStatus: {
      description: 'Production preparation checklist',
      fields: {
        gangSheetCreated: { type: 'boolean|null', required: true, description: 'DTF gang sheet created' },
        artworkDigitized: { type: 'boolean|null', required: true, description: 'Embroidery artwork digitized' },
        screensBurned: { type: 'boolean|null', required: true, description: 'Screen print screens burned' }
      }
    },
    FulfillmentStatus: {
      description: 'Order fulfillment tracking',
      fields: {
        method: { type: 'FulfillmentMethod', required: true, description: 'Shipped or PickedUp' },
        shippingLabelPrinted: { type: 'boolean', required: true, description: 'Shipping label printed' },
        customerPickedUp: { type: 'boolean', required: true, description: 'Customer pickup confirmed' },
        trackingNumber: { type: 'string', required: false, description: 'Shipping tracking number' },
        fulfilledAt: { type: 'Date', required: false, description: 'Fulfillment timestamp' }
      }
    },
    InvoiceStatus: {
      description: 'Invoice stage tracking',
      fields: {
        invoiceNumber: { type: 'string', required: false, description: 'Invoice number/ID' },
        invoiceAmount: { type: 'number', required: false, description: 'Invoice total amount' },
        invoiceCreated: { type: 'boolean', required: true, description: 'Invoice has been created' },
        invoiceSent: { type: 'boolean', required: true, description: 'Invoice sent to customer' },
        invoiceSentAt: { type: 'Date', required: false, description: 'When invoice was sent' },
        paymentReceived: { type: 'boolean', required: true, description: 'Payment has been received' },
        paymentReceivedAt: { type: 'Date', required: false, description: 'When payment was received' },
        paymentMethod: { type: 'string', required: false, description: 'Payment method used' },
        paymentNotes: { type: 'string', required: false, description: 'Notes about payment' }
      }
    },
    CloseoutChecklist: {
      description: 'Project closeout checklist',
      fields: {
        filesSaved: { type: 'boolean', required: true, description: 'Project files saved to customer folder' },
        canvaArchived: { type: 'boolean', required: true, description: 'Canva proof archived' },
        summaryUploaded: { type: 'boolean', required: true, description: 'Order summary uploaded' }
      }
    },
    StatusChangeLog: {
      description: 'Audit trail entry for order changes',
      fields: {
        timestamp: { type: 'Date', required: true, description: 'Change timestamp' },
        userId: { type: 'string', required: false, description: 'User who made the change' },
        action: { type: 'string', required: true, description: 'Action description' },
        previousValue: { type: 'any', required: true, description: 'Value before change' },
        newValue: { type: 'any', required: true, description: 'Value after change' },
        notes: { type: 'string', required: false, description: 'Change notes' }
      }
    },
    ArtConfirmation: {
      description: 'Art confirmation workflow data',
      fields: {
        overallStatus: { type: 'ArtStatus', required: true, description: 'Overall art confirmation status' },
        placements: { type: 'ArtPlacement[]', required: true, description: 'Art placement locations with proofs' },
        customerContactMethod: { type: 'string', required: false, description: 'How customer was contacted' },
        lastContactedAt: { type: 'Date', required: false, description: 'Last customer contact timestamp' },
        nextFollowUpAt: { type: 'Date', required: false, description: 'Next follow-up date' },
        designerNotes: { type: 'string', required: false, description: 'Internal designer notes' },
        internalNotes: { type: 'string', required: false, description: 'General internal notes' },
        customerApprovalName: { type: 'string', required: false, description: 'Name of approver' },
        customerApprovalDate: { type: 'Date', required: false, description: 'Approval timestamp' },
        customerApprovalMethod: { type: 'string', required: false, description: 'How approval was received' },
        originalArtworkUrl: { type: 'string', required: false, description: 'URL to original artwork' },
        mockupUrl: { type: 'string', required: false, description: 'URL to product mockup' },
        startedAt: { type: 'Date', required: false, description: 'When art work started' },
        completedAt: { type: 'Date', required: false, description: 'When art was approved' }
      }
    },
    ArtPlacement: {
      description: 'Individual art placement location',
      fields: {
        id: { type: 'string', required: true, description: 'Unique identifier' },
        location: { type: 'string', required: true, description: 'Placement location (e.g., Front Left Chest)' },
        width: { type: 'string', required: false, description: 'Art width dimension' },
        height: { type: 'string', required: false, description: 'Art height dimension' },
        colorCount: { type: 'number', required: false, description: 'Number of colors/threads' },
        description: { type: 'string', required: false, description: 'Special instructions' },
        proofs: { type: 'ArtProof[]', required: true, description: 'Proof versions for this placement' }
      }
    },
    ArtProof: {
      description: 'Individual proof version',
      fields: {
        id: { type: 'string', required: true, description: 'Unique identifier' },
        version: { type: 'number', required: true, description: 'Version number' },
        proofName: { type: 'string', required: true, description: 'Proof name/title' },
        proofUrl: { type: 'string', required: false, description: 'URL to proof file' },
        proofNotes: { type: 'string', required: false, description: 'Designer notes' },
        createdAt: { type: 'Date', required: true, description: 'Creation timestamp' },
        sentToCustomerAt: { type: 'Date', required: false, description: 'When sent to customer' },
        customerFeedback: { type: 'string', required: false, description: 'Customer feedback' },
        feedbackReceivedAt: { type: 'Date', required: false, description: 'When feedback received' },
        status: { type: 'ProofStatus', required: true, description: 'Proof status' }
      }
    },
    User: {
      description: 'System user account for authentication and access control',
      fields: {
        id: { type: 'string', required: true, description: 'Unique identifier' },
        username: { type: 'string', required: true, description: 'Login username' },
        password: { type: 'string', required: true, description: 'User password (hashed in production)' },
        displayName: { type: 'string', required: true, description: 'Display name shown in UI' },
        email: { type: 'string', required: false, description: 'User email address' },
        role: { type: 'UserRole', required: true, description: 'User role for access control' },
        department: { type: 'string', required: false, description: 'Department assignment' },
        reportsTo: { type: 'string', required: false, description: 'Manager user ID' },
        isActive: { type: 'boolean', required: true, description: 'Account active status' },
        createdAt: { type: 'Date', required: true, description: 'Account creation timestamp' },
        lastLoginAt: { type: 'Date', required: false, description: 'Last login timestamp' }
      }
    },
    OrgHierarchy: {
      description: 'Organization hierarchy and user management',
      fields: {
        users: { type: 'User[]', required: true, description: 'All system users' },
        departments: { type: 'string[]', required: true, description: 'Department list' },
        lastUpdatedAt: { type: 'Date', required: true, description: 'Last hierarchy update' },
        lastUpdatedBy: { type: 'string', required: false, description: 'User who last updated' }
      }
    },
    ProductivityEntry: {
      description: 'Hourly production floor productivity tracking',
      fields: {
        id: { type: 'string', required: true, description: 'Unique identifier' },
        date: { type: 'string', required: true, description: 'Date in YYYY-MM-DD format' },
        hour: { type: 'number', required: true, description: 'Hour of day (0-23)' },
        operatorName: { type: 'string', required: true, description: 'Operator name' },
        orderNumber: { type: 'string', required: true, description: 'Associated order number' },
        orderId: { type: 'string', required: true, description: 'Associated order ID' },
        decorationType: { type: 'ProductionMethod', required: true, description: 'Decoration method used' },
        itemsDecorated: { type: 'number', required: true, description: 'Items decorated this hour' },
        itemsPacked: { type: 'number', required: true, description: 'Items packed this hour' },
        notes: { type: 'string', required: false, description: 'Production notes' },
        createdAt: { type: 'Date', required: true, description: 'Entry creation timestamp' }
      }
    }
  },
  enums: {
    OrderStatus: ['Lead', 'Quote', 'Approval', 'Art Confirmation', 'Inventory Order', 'Production Prep', 'Inventory Received', 'Production', 'Fulfillment', 'Invoice', 'Closeout', 'Closed'],
    ProductionMethod: ['ScreenPrint', 'Embroidery', 'DTF', 'Other'],
    ArtStatus: ['Not Started', 'In Progress', 'Sent to Customer', 'Revision Requested', 'Approved'],
    ProofStatus: ['Draft', 'Sent', 'Approved', 'Revision Needed'],
    CustomerApprovalMethod: ['Email', 'Signed Proof', 'Verbal', 'Digital Signature'],
    FulfillmentMethod: ['Shipped', 'PickedUp', null],
    LeadSource: ['Website', 'Referral', 'Social Media', 'Cold Call', 'Trade Show', 'Email Campaign', 'Other'],
    LeadTemperature: ['Hot', 'Warm', 'Cold'],
    StitchCountTier: ['<8k', '8k-12k', '12k+'],
    DTFSize: ['Standard', 'Large'],
    UserRole: ['Admin', 'Manager', 'Sales', 'Production', 'Fulfillment', 'ReadOnly'],
    PaymentMethod: ['Cash', 'Check', 'Credit Card', 'ACH', 'Other']
  },
  workflow: {
    stages: [
      { number: 0, name: 'Lead', description: 'Initial sales inquiry', gateCondition: 'Customer info captured' },
      { number: 1, name: 'Quote', description: 'Building quote with line items', gateCondition: 'Line items added with pricing' },
      { number: 2, name: 'Approval', description: 'Quote sent for customer approval', gateCondition: 'Customer approves quote' },
      { number: 3, name: 'Art Confirmation', description: 'Artwork proof approval', gateCondition: 'Art status = Approved' },
      { number: 4, name: 'Inventory Order', description: 'Ordering blank goods', gateCondition: 'All line items marked as ordered' },
      { number: 5, name: 'Production Prep', description: 'Preparing for production', gateCondition: 'All required prep tasks complete' },
      { number: 6, name: 'Inventory Received', description: 'Receiving blank goods', gateCondition: 'All line items marked as received' },
      { number: 7, name: 'Production', description: 'Decoration and packing', gateCondition: 'All items decorated and packed' },
      { number: 8, name: 'Fulfillment', description: 'Shipping or pickup', gateCondition: 'Shipping label printed or customer picked up' },
      { number: 9, name: 'Invoice', description: 'Send invoice to customer', gateCondition: 'Invoice created and sent' },
      { number: 10, name: 'Closeout', description: 'Project file archival and closeout', gateCondition: 'All closeout checklist items complete' },
      { number: 11, name: 'Closed', description: 'Order completed and archived', gateCondition: 'Order closed from Closeout stage' }
    ]
  }
};
