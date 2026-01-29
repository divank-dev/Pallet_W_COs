/**
 * Pallet Application - Test Orders (20 Comprehensive Samples)
 *
 * These orders cover all 12 workflow stages and various edge cases:
 * - All decoration types (ScreenPrint, Embroidery, DTF, Other)
 * - Rush orders and standard orders
 * - Various lead sources and temperatures
 * - Art confirmation workflows with revisions
 * - Fulfillment scenarios (shipping and pickup)
 * - Invoice and payment tracking
 * - Closed orders for reopen testing
 */

import { Order, OrderStatus, LeadInfo, LineItem } from '../types';
import {
  DEFAULT_PREP_STATUS,
  DEFAULT_FULFILLMENT,
  DEFAULT_INVOICE_STATUS,
  DEFAULT_CLOSEOUT,
  DEFAULT_ART_CONFIRMATION
} from '../constants';

// Helper to generate dates relative to now
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const formatDate = (d: Date) => d.toISOString().split('T')[0];

// Generate unique IDs
let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-TEST-${String(++idCounter).padStart(4, '0')}`;

/**
 * 20 Test Orders covering all scenarios
 */
export const TEST_ORDERS: Order[] = [
  // ============================================
  // LEAD STAGE ORDERS (3 orders)
  // ============================================

  // TEST-1001: Hot Lead - Website Inquiry
  {
    id: nextId('LEAD'),
    orderNumber: 'LEAD-TEST-1001',
    customer: 'Apex Fitness Studio',
    customerEmail: 'info@apexfitness.com',
    customerPhone: '555-100-1001',
    projectName: 'Gym Staff Uniforms',
    status: 'Lead',
    createdAt: daysAgo(1),
    dueDate: '',
    lineItems: [],
    artStatus: 'Not Started',
    rushOrder: false,
    leadInfo: {
      source: 'Website',
      temperature: 'Hot',
      estimatedQuantity: 100,
      estimatedValue: 2500,
      productInterest: 'Performance tees, tank tops, shorts',
      decorationInterest: 'DTF',
      eventDate: formatDate(daysFromNow(30)),
      followUpDate: formatDate(daysFromNow(2)),
      contactedAt: daysAgo(1),
      lastContactAt: daysAgo(0),
      contactNotes: 'New gym opening. Needs full staff outfitting. Decision maker is ready to proceed.',
      competitorQuoted: false,
      decisionMaker: 'Jake Thompson (Owner)',
      budget: '$2,500 - $3,500'
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

  // TEST-1002: Warm Lead - Referral
  {
    id: nextId('LEAD'),
    orderNumber: 'LEAD-TEST-1002',
    customer: 'Greenway Landscaping',
    customerEmail: 'orders@greenwaylandscape.com',
    customerPhone: '555-100-1002',
    projectName: 'Crew Work Shirts',
    status: 'Lead',
    createdAt: daysAgo(3),
    dueDate: '',
    lineItems: [],
    artStatus: 'Not Started',
    rushOrder: false,
    leadInfo: {
      source: 'Referral',
      temperature: 'Warm',
      estimatedQuantity: 50,
      estimatedValue: 1200,
      productInterest: 'Work polos, hi-vis vests',
      decorationInterest: 'Embroidery',
      eventDate: formatDate(daysFromNow(45)),
      followUpDate: formatDate(daysFromNow(5)),
      contactedAt: daysAgo(3),
      contactNotes: 'Referred by Summit Coffee. Needs durable work wear for outdoor crew.',
      competitorQuoted: true,
      decisionMaker: 'Maria Garcia (Operations Mgr)',
      budget: '$1,000 - $1,500'
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

  // TEST-1003: Cold Lead - Trade Show
  {
    id: nextId('LEAD'),
    orderNumber: 'LEAD-TEST-1003',
    customer: 'Riverside Youth Soccer',
    customerEmail: 'coach@riversideyouthsoccer.org',
    projectName: 'Team Jerseys',
    status: 'Lead',
    createdAt: daysAgo(7),
    dueDate: '',
    lineItems: [],
    artStatus: 'Not Started',
    rushOrder: false,
    leadInfo: {
      source: 'Trade Show',
      temperature: 'Cold',
      estimatedQuantity: 200,
      estimatedValue: 3000,
      productInterest: 'Soccer jerseys, shorts, practice tees',
      decorationInterest: 'ScreenPrint',
      eventDate: formatDate(daysFromNow(90)),
      followUpDate: formatDate(daysFromNow(14)),
      contactedAt: daysAgo(7),
      contactNotes: 'Spring season order. Budget dependent on fundraising.',
      competitorQuoted: false,
      decisionMaker: 'Parent Board Vote Required'
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

  // ============================================
  // QUOTE STAGE ORDERS (2 orders)
  // ============================================

  // TEST-1004: Quote with line items - Screen Print
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1004',
    customer: 'Downtown Brewery',
    customerEmail: 'events@downtownbrewery.com',
    customerPhone: '555-100-1004',
    projectName: 'Summer Festival Merch',
    status: 'Quote',
    createdAt: daysAgo(2),
    dueDate: formatDate(daysFromNow(21)),
    lineItems: [
      {
        id: 'li-1004-1',
        itemNumber: 'GD-5000',
        name: 'Gildan 5000 Heavy Cotton Tee',
        color: 'Sand',
        size: 'M',
        qty: 100,
        decorationType: 'ScreenPrint',
        decorationPlacements: 2,
        cost: 4.50,
        price: 14.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        screenPrintColors: 3
      },
      {
        id: 'li-1004-2',
        itemNumber: 'GD-5000',
        name: 'Gildan 5000 Heavy Cotton Tee',
        color: 'Sand',
        size: 'L',
        qty: 75,
        decorationType: 'ScreenPrint',
        decorationPlacements: 2,
        cost: 4.50,
        price: 14.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        screenPrintColors: 3
      },
      {
        id: 'li-1004-3',
        itemNumber: 'GD-5000',
        name: 'Gildan 5000 Heavy Cotton Tee',
        color: 'Sand',
        size: 'XL',
        qty: 50,
        decorationType: 'ScreenPrint',
        decorationPlacements: 2,
        cost: 4.50,
        price: 14.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        screenPrintColors: 3,
        isPlusSize: false
      },
      {
        id: 'li-1004-4',
        itemNumber: 'GD-5000',
        name: 'Gildan 5000 Heavy Cotton Tee',
        color: 'Sand',
        size: '2XL',
        qty: 25,
        decorationType: 'ScreenPrint',
        decorationPlacements: 2,
        cost: 5.00,
        price: 16.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        screenPrintColors: 3,
        isPlusSize: true
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

  // TEST-1005: Quote - Embroidery Order
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1005',
    customer: 'Elite Law Partners',
    customerEmail: 'admin@elitelawpartners.com',
    customerPhone: '555-100-1005',
    projectName: 'Executive Polos',
    status: 'Quote',
    createdAt: daysAgo(1),
    dueDate: formatDate(daysFromNow(28)),
    lineItems: [
      {
        id: 'li-1005-1',
        itemNumber: 'PA-K500',
        name: 'Port Authority K500 Silk Touch Polo',
        color: 'Navy',
        size: 'L',
        qty: 20,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 12.00,
        price: 32.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        stitchCountTier: '<8k'
      },
      {
        id: 'li-1005-2',
        itemNumber: 'PA-K500',
        name: 'Port Authority K500 Silk Touch Polo',
        color: 'White',
        size: 'L',
        qty: 15,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 12.00,
        price: 32.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        stitchCountTier: '<8k'
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

  // ============================================
  // APPROVAL STAGE ORDER (1 order)
  // ============================================

  // TEST-1006: Approval - Waiting for customer approval
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1006',
    customer: 'Pacific Tech Solutions',
    customerEmail: 'purchasing@pacifictech.io',
    customerPhone: '555-100-1006',
    projectName: 'Conference Swag Bags',
    status: 'Approval',
    createdAt: daysAgo(5),
    dueDate: formatDate(daysFromNow(14)),
    lineItems: [
      {
        id: 'li-1006-1',
        itemNumber: 'BC-3001',
        name: 'Bella+Canvas 3001 Unisex Tee',
        color: 'Heather Grey',
        size: 'M',
        qty: 150,
        decorationType: 'DTF',
        decorationPlacements: 1,
        cost: 6.00,
        price: 16.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        dtfSize: 'Standard'
      },
      {
        id: 'li-1006-2',
        itemNumber: 'TOTE-100',
        name: 'Canvas Tote Bag',
        color: 'Natural',
        size: 'OS',
        qty: 150,
        decorationType: 'ScreenPrint',
        decorationPlacements: 1,
        cost: 3.00,
        price: 8.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        screenPrintColors: 2
      }
    ],
    artStatus: 'Not Started',
    rushOrder: true,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
    history: [],
    version: 1,
    isArchived: false
  },

  // ============================================
  // ART CONFIRMATION STAGE ORDERS (2 orders)
  // ============================================

  // TEST-1007: Art Confirmation - Proof sent, awaiting feedback
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1007',
    customer: 'Sunrise Bakery',
    customerEmail: 'hello@sunrisebakery.com',
    customerPhone: '555-100-1007',
    projectName: 'Staff Aprons & Caps',
    status: 'Art Confirmation',
    createdAt: daysAgo(8),
    dueDate: formatDate(daysFromNow(18)),
    lineItems: [
      {
        id: 'li-1007-1',
        itemNumber: 'APR-100',
        name: 'Bib Apron with Pockets',
        color: 'Black',
        size: 'OS',
        qty: 15,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 10.00,
        price: 28.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        stitchCountTier: '8k-12k'
      },
      {
        id: 'li-1007-2',
        itemNumber: 'CAP-500',
        name: 'Unstructured Dad Cap',
        color: 'White',
        size: 'OS',
        qty: 15,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 6.00,
        price: 18.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        stitchCountTier: '<8k'
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
          id: 'ap-1007-1',
          location: 'Front Center (Apron)',
          width: '4"',
          height: '3"',
          colorCount: 3,
          description: 'Bakery logo embroidered',
          proofs: [
            {
              id: 'proof-1007-1',
              version: 1,
              proofName: 'Apron Logo v1',
              proofUrl: 'https://canva.com/design/sunrise-apron',
              proofNotes: 'Thread colors: gold, brown, white',
              createdAt: daysAgo(6),
              sentToCustomerAt: daysAgo(5),
              status: 'Sent',
              files: [],
              markupFiles: []
            }
          ]
        },
        {
          id: 'ap-1007-2',
          location: 'Front Center (Cap)',
          width: '2.5"',
          height: '2"',
          colorCount: 2,
          description: 'Small logo on cap',
          proofs: [
            {
              id: 'proof-1007-2',
              version: 1,
              proofName: 'Cap Logo v1',
              proofUrl: 'https://canva.com/design/sunrise-cap',
              createdAt: daysAgo(6),
              sentToCustomerAt: daysAgo(5),
              status: 'Sent',
              files: [],
              markupFiles: []
            }
          ]
        }
      ],
      clientFiles: [
        {
          id: 'cf-1007-1',
          fileName: 'sunrise-bakery-logo.ai',
          fileType: 'original',
          fileUrl: 'https://drive.google.com/file/sunrise-logo',
          uploadedAt: daysAgo(8),
          uploadedBy: 'client',
          isMarkup: false
        }
      ],
      referenceFiles: [],
      revisionHistory: [
        {
          id: 'rev-1007-1',
          timestamp: daysAgo(8),
          action: 'file_uploaded',
          description: 'Client uploaded logo file',
          performedBy: 'Client'
        },
        {
          id: 'rev-1007-2',
          timestamp: daysAgo(6),
          action: 'proof_sent',
          description: 'Sent proofs for apron and cap',
          performedBy: 'Designer'
        }
      ],
      customerContactMethod: 'Email',
      lastContactedAt: daysAgo(5)
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // TEST-1008: Art Confirmation - Revision requested
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1008',
    customer: 'Metro Auto Group',
    customerEmail: 'marketing@metroautogroup.com',
    customerPhone: '555-100-1008',
    projectName: 'Sales Team Polos',
    status: 'Art Confirmation',
    createdAt: daysAgo(10),
    dueDate: formatDate(daysFromNow(12)),
    lineItems: [
      {
        id: 'li-1008-1',
        itemNumber: 'NM-1100',
        name: 'Nike Dri-FIT Micro Pique Polo',
        color: 'Black',
        size: 'L',
        qty: 30,
        decorationType: 'Embroidery',
        decorationPlacements: 2,
        cost: 28.00,
        price: 55.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false,
        stitchCountTier: '8k-12k'
      }
    ],
    artStatus: 'Revision Requested',
    rushOrder: false,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      overallStatus: 'Revision Requested',
      placements: [
        {
          id: 'ap-1008-1',
          location: 'Front Left Chest',
          width: '3.5"',
          height: '3"',
          colorCount: 2,
          proofs: [
            {
              id: 'proof-1008-1',
              version: 1,
              proofName: 'Chest Logo v1',
              proofUrl: 'https://canva.com/design/metro-v1',
              createdAt: daysAgo(8),
              sentToCustomerAt: daysAgo(7),
              customerFeedback: 'Logo looks too small. Please increase size by 20%.',
              feedbackReceivedAt: daysAgo(5),
              status: 'Revision Needed',
              files: [],
              markupFiles: []
            }
          ]
        },
        {
          id: 'ap-1008-2',
          location: 'Right Sleeve',
          width: '2"',
          height: '2"',
          colorCount: 1,
          proofs: [
            {
              id: 'proof-1008-2',
              version: 1,
              proofName: 'Sleeve Logo v1',
              proofUrl: 'https://canva.com/design/metro-sleeve-v1',
              createdAt: daysAgo(8),
              sentToCustomerAt: daysAgo(7),
              status: 'Approved',
              files: [],
              markupFiles: []
            }
          ]
        }
      ],
      clientFiles: [],
      referenceFiles: [],
      revisionHistory: [
        {
          id: 'rev-1008-1',
          timestamp: daysAgo(8),
          action: 'proof_created',
          description: 'Created initial proofs',
          performedBy: 'Designer'
        },
        {
          id: 'rev-1008-2',
          timestamp: daysAgo(5),
          action: 'feedback_received',
          description: 'Customer requested size increase on chest logo',
          performedBy: 'Client'
        }
      ],
      customerContactMethod: 'Email',
      lastContactedAt: daysAgo(5),
      designerNotes: 'Need to recreate chest logo at larger size'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // ============================================
  // INVENTORY ORDER STAGE (2 orders)
  // ============================================

  // TEST-1009: Inventory Order - Partially ordered
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1009',
    customer: 'Coastal Coffee Roasters',
    customerEmail: 'shop@coastalcoffee.com',
    customerPhone: '555-100-1009',
    projectName: 'Retail Merchandise',
    status: 'Inventory Order',
    createdAt: daysAgo(12),
    dueDate: formatDate(daysFromNow(10)),
    lineItems: [
      {
        id: 'li-1009-1',
        itemNumber: 'NL-3600',
        name: 'Next Level 3600 Cotton Tee',
        color: 'Espresso',
        size: 'M',
        qty: 50,
        decorationType: 'DTF',
        decorationPlacements: 1,
        cost: 5.00,
        price: 18.00,
        ordered: true,
        orderedAt: daysAgo(3),
        received: false,
        decorated: false,
        packed: false,
        dtfSize: 'Large'
      },
      {
        id: 'li-1009-2',
        itemNumber: 'NL-3600',
        name: 'Next Level 3600 Cotton Tee',
        color: 'Espresso',
        size: 'L',
        qty: 40,
        decorationType: 'DTF',
        decorationPlacements: 1,
        cost: 5.00,
        price: 18.00,
        ordered: true,
        orderedAt: daysAgo(3),
        received: false,
        decorated: false,
        packed: false,
        dtfSize: 'Large'
      },
      {
        id: 'li-1009-3',
        itemNumber: 'MUG-12',
        name: '12oz Ceramic Mug',
        color: 'White',
        size: 'OS',
        qty: 100,
        decorationType: 'Other',
        decorationPlacements: 1,
        decorationDescription: 'Sublimation wrap',
        cost: 2.50,
        price: 12.00,
        ordered: false,
        received: false,
        decorated: false,
        packed: false
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved',
      customerApprovalName: 'Sarah Chen',
      customerApprovalDate: daysAgo(5),
      customerApprovalMethod: 'Email'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // TEST-1010: Inventory Order - All ordered, ready for prep
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1010',
    customer: 'Velocity Sports Club',
    customerEmail: 'gear@velocitysports.com',
    customerPhone: '555-100-1010',
    projectName: 'Member Workout Gear',
    status: 'Inventory Order',
    createdAt: daysAgo(14),
    dueDate: formatDate(daysFromNow(8)),
    lineItems: [
      {
        id: 'li-1010-1',
        itemNumber: 'AA-1000',
        name: 'Augusta Athletic Tank',
        color: 'Power Red',
        size: 'M',
        qty: 60,
        decorationType: 'DTF',
        decorationPlacements: 2,
        cost: 8.00,
        price: 22.00,
        ordered: true,
        orderedAt: daysAgo(5),
        received: false,
        decorated: false,
        packed: false,
        dtfSize: 'Standard'
      },
      {
        id: 'li-1010-2',
        itemNumber: 'AA-1000',
        name: 'Augusta Athletic Tank',
        color: 'Power Red',
        size: 'L',
        qty: 40,
        decorationType: 'DTF',
        decorationPlacements: 2,
        cost: 8.00,
        price: 22.00,
        ordered: true,
        orderedAt: daysAgo(5),
        received: false,
        decorated: false,
        packed: false,
        dtfSize: 'Standard'
      }
    ],
    artStatus: 'Approved',
    rushOrder: true,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // ============================================
  // PRODUCTION PREP STAGE (1 order)
  // ============================================

  // TEST-1011: Production Prep - Mixed decoration types
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1011',
    customer: 'Urban Design Studio',
    customerEmail: 'studio@urbandesign.co',
    customerPhone: '555-100-1011',
    projectName: 'Client Gift Boxes',
    status: 'Production Prep',
    createdAt: daysAgo(15),
    dueDate: formatDate(daysFromNow(5)),
    lineItems: [
      {
        id: 'li-1011-1',
        itemNumber: 'BC-6004',
        name: 'Bella+Canvas 6004 Ladies Tee',
        color: 'White',
        size: 'M',
        qty: 25,
        decorationType: 'DTF',
        decorationPlacements: 1,
        cost: 6.00,
        price: 20.00,
        ordered: true,
        orderedAt: daysAgo(10),
        received: true,
        receivedAt: daysAgo(5),
        decorated: false,
        packed: false,
        dtfSize: 'Large'
      },
      {
        id: 'li-1011-2',
        itemNumber: 'OC-6500',
        name: 'Otto Cap Structured',
        color: 'Black',
        size: 'OS',
        qty: 25,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 7.00,
        price: 22.00,
        ordered: true,
        orderedAt: daysAgo(10),
        received: true,
        receivedAt: daysAgo(5),
        decorated: false,
        packed: false,
        stitchCountTier: '<8k'
      },
      {
        id: 'li-1011-3',
        itemNumber: 'TOTE-200',
        name: 'Cotton Canvas Tote',
        color: 'Natural',
        size: 'OS',
        qty: 25,
        decorationType: 'ScreenPrint',
        decorationPlacements: 1,
        cost: 4.00,
        price: 12.00,
        ordered: true,
        orderedAt: daysAgo(10),
        received: true,
        receivedAt: daysAgo(5),
        decorated: false,
        packed: false,
        screenPrintColors: 2
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: {
      gangSheetCreated: true,
      artworkDigitized: false,
      screensBurned: false,
      prepPending: false
    },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // ============================================
  // INVENTORY RECEIVED STAGE (1 order)
  // ============================================

  // TEST-1012: Inventory Received - Partially received
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1012',
    customer: 'Mountain View Church',
    customerEmail: 'office@mviewchurch.org',
    customerPhone: '555-100-1012',
    projectName: 'Volunteer Shirts',
    status: 'Inventory Received',
    createdAt: daysAgo(18),
    dueDate: formatDate(daysFromNow(4)),
    lineItems: [
      {
        id: 'li-1012-1',
        itemNumber: 'GD-8000',
        name: 'Gildan 8000 DryBlend Tee',
        color: 'Royal',
        size: 'M',
        qty: 40,
        decorationType: 'ScreenPrint',
        decorationPlacements: 2,
        cost: 4.00,
        price: 12.00,
        ordered: true,
        orderedAt: daysAgo(12),
        received: true,
        receivedAt: daysAgo(3),
        decorated: false,
        packed: false,
        screenPrintColors: 1
      },
      {
        id: 'li-1012-2',
        itemNumber: 'GD-8000',
        name: 'Gildan 8000 DryBlend Tee',
        color: 'Royal',
        size: 'L',
        qty: 35,
        decorationType: 'ScreenPrint',
        decorationPlacements: 2,
        cost: 4.00,
        price: 12.00,
        ordered: true,
        orderedAt: daysAgo(12),
        received: true,
        receivedAt: daysAgo(3),
        decorated: false,
        packed: false,
        screenPrintColors: 1
      },
      {
        id: 'li-1012-3',
        itemNumber: 'GD-8000',
        name: 'Gildan 8000 DryBlend Tee',
        color: 'Royal',
        size: 'XL',
        qty: 25,
        decorationType: 'ScreenPrint',
        decorationPlacements: 2,
        cost: 4.00,
        price: 12.00,
        ordered: true,
        orderedAt: daysAgo(12),
        received: false,
        decorated: false,
        packed: false,
        screenPrintColors: 1
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: {
      gangSheetCreated: null,
      artworkDigitized: null,
      screensBurned: true,
      prepPending: false
    },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // ============================================
  // PRODUCTION STAGE (2 orders)
  // ============================================

  // TEST-1013: Production - In progress (for TV display)
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1013',
    customer: 'Northside CrossFit',
    customerEmail: 'coach@northsidecf.com',
    customerPhone: '555-100-1013',
    projectName: 'Competition Tanks',
    status: 'Production',
    createdAt: daysAgo(20),
    dueDate: formatDate(daysFromNow(2)),
    lineItems: [
      {
        id: 'li-1013-1',
        itemNumber: 'NL-3633',
        name: 'Next Level 3633 Tank',
        color: 'Military Green',
        size: 'M',
        qty: 30,
        decorationType: 'DTF',
        decorationPlacements: 2,
        cost: 5.50,
        price: 18.00,
        ordered: true,
        orderedAt: daysAgo(15),
        received: true,
        receivedAt: daysAgo(8),
        decorated: true,
        decoratedAt: daysAgo(1),
        packed: true,
        packedAt: daysAgo(0),
        dtfSize: 'Standard'
      },
      {
        id: 'li-1013-2',
        itemNumber: 'NL-3633',
        name: 'Next Level 3633 Tank',
        color: 'Military Green',
        size: 'L',
        qty: 25,
        decorationType: 'DTF',
        decorationPlacements: 2,
        cost: 5.50,
        price: 18.00,
        ordered: true,
        orderedAt: daysAgo(15),
        received: true,
        receivedAt: daysAgo(8),
        decorated: true,
        decoratedAt: daysAgo(0),
        packed: false,
        dtfSize: 'Standard'
      },
      {
        id: 'li-1013-3',
        itemNumber: 'NL-3633',
        name: 'Next Level 3633 Tank',
        color: 'Military Green',
        size: 'XL',
        qty: 20,
        decorationType: 'DTF',
        decorationPlacements: 2,
        cost: 5.50,
        price: 18.00,
        ordered: true,
        orderedAt: daysAgo(15),
        received: true,
        receivedAt: daysAgo(8),
        decorated: false,
        packed: false,
        dtfSize: 'Standard'
      }
    ],
    artStatus: 'Approved',
    rushOrder: true,
    prepStatus: {
      gangSheetCreated: true,
      artworkDigitized: null,
      screensBurned: null,
      prepPending: false
    },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // TEST-1014: Production - Ready for fulfillment
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1014',
    customer: 'Lakeside Marina',
    customerEmail: 'shop@lakesidemarina.com',
    customerPhone: '555-100-1014',
    projectName: 'Summer Staff Gear',
    status: 'Production',
    createdAt: daysAgo(22),
    dueDate: formatDate(daysFromNow(1)),
    lineItems: [
      {
        id: 'li-1014-1',
        itemNumber: 'CC-1717',
        name: 'Comfort Colors 1717 Tee',
        color: 'Seafoam',
        size: 'L',
        qty: 40,
        decorationType: 'ScreenPrint',
        decorationPlacements: 2,
        cost: 7.00,
        price: 20.00,
        ordered: true,
        orderedAt: daysAgo(18),
        received: true,
        receivedAt: daysAgo(10),
        decorated: true,
        decoratedAt: daysAgo(2),
        packed: true,
        packedAt: daysAgo(1),
        screenPrintColors: 2
      },
      {
        id: 'li-1014-2',
        itemNumber: 'NB-CAP',
        name: 'New Era 9FORTY Cap',
        color: 'Navy',
        size: 'OS',
        qty: 40,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 14.00,
        price: 32.00,
        ordered: true,
        orderedAt: daysAgo(18),
        received: true,
        receivedAt: daysAgo(10),
        decorated: true,
        decoratedAt: daysAgo(2),
        packed: true,
        packedAt: daysAgo(1),
        stitchCountTier: '8k-12k'
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: {
      gangSheetCreated: null,
      artworkDigitized: true,
      screensBurned: true,
      prepPending: false
    },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // ============================================
  // FULFILLMENT STAGE (2 orders)
  // ============================================

  // TEST-1015: Fulfillment - Shipped with tracking
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1015',
    customer: 'Evergreen Pet Supplies',
    customerEmail: 'orders@evergreenpets.com',
    customerPhone: '555-100-1015',
    projectName: 'Staff Uniforms',
    status: 'Fulfillment',
    createdAt: daysAgo(25),
    dueDate: formatDate(daysAgo(1)),
    lineItems: [
      {
        id: 'li-1015-1',
        itemNumber: 'GD-3000',
        name: 'Gildan 3000 Cotton Polo',
        color: 'Forest Green',
        size: 'L',
        qty: 20,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 9.00,
        price: 28.00,
        ordered: true,
        orderedAt: daysAgo(20),
        received: true,
        receivedAt: daysAgo(14),
        decorated: true,
        decoratedAt: daysAgo(6),
        packed: true,
        packedAt: daysAgo(5),
        stitchCountTier: '<8k'
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: {
      gangSheetCreated: null,
      artworkDigitized: true,
      screensBurned: null,
      prepPending: false
    },
    fulfillment: {
      method: 'Shipped',
      shippingLabelPrinted: true,
      customerPickedUp: false,
      trackingNumber: '1Z999AA10123456784',
      fulfilledAt: daysAgo(2)
    },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // TEST-1016: Fulfillment - Customer pickup
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1016',
    customer: 'Bright Minds Tutoring',
    customerEmail: 'admin@brightminds.edu',
    customerPhone: '555-100-1016',
    projectName: 'Tutor Shirts',
    status: 'Fulfillment',
    createdAt: daysAgo(28),
    dueDate: formatDate(daysAgo(3)),
    lineItems: [
      {
        id: 'li-1016-1',
        itemNumber: 'AS-2001',
        name: 'American Apparel 2001 Tee',
        color: 'Baby Blue',
        size: 'M',
        qty: 15,
        decorationType: 'ScreenPrint',
        decorationPlacements: 1,
        cost: 8.00,
        price: 22.00,
        ordered: true,
        orderedAt: daysAgo(24),
        received: true,
        receivedAt: daysAgo(18),
        decorated: true,
        decoratedAt: daysAgo(8),
        packed: true,
        packedAt: daysAgo(7),
        screenPrintColors: 2
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: {
      gangSheetCreated: null,
      artworkDigitized: null,
      screensBurned: true,
      prepPending: false
    },
    fulfillment: {
      method: 'PickedUp',
      shippingLabelPrinted: false,
      customerPickedUp: true,
      fulfilledAt: daysAgo(1)
    },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // ============================================
  // INVOICE STAGE (1 order)
  // ============================================

  // TEST-1017: Invoice - Sent, awaiting payment
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1017',
    customer: 'Harmony Music School',
    customerEmail: 'director@harmonymusic.org',
    customerPhone: '555-100-1017',
    projectName: 'Recital Tees',
    status: 'Invoice',
    createdAt: daysAgo(30),
    dueDate: formatDate(daysAgo(5)),
    lineItems: [
      {
        id: 'li-1017-1',
        itemNumber: 'BC-3001',
        name: 'Bella+Canvas 3001 Tee',
        color: 'Black',
        size: 'S',
        qty: 30,
        decorationType: 'DTF',
        decorationPlacements: 1,
        cost: 6.00,
        price: 16.00,
        ordered: true,
        orderedAt: daysAgo(26),
        received: true,
        receivedAt: daysAgo(20),
        decorated: true,
        decoratedAt: daysAgo(12),
        packed: true,
        packedAt: daysAgo(11),
        dtfSize: 'Standard'
      },
      {
        id: 'li-1017-2',
        itemNumber: 'BC-3001',
        name: 'Bella+Canvas 3001 Tee',
        color: 'Black',
        size: 'M',
        qty: 40,
        decorationType: 'DTF',
        decorationPlacements: 1,
        cost: 6.00,
        price: 16.00,
        ordered: true,
        orderedAt: daysAgo(26),
        received: true,
        receivedAt: daysAgo(20),
        decorated: true,
        decoratedAt: daysAgo(12),
        packed: true,
        packedAt: daysAgo(11),
        dtfSize: 'Standard'
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: {
      gangSheetCreated: true,
      artworkDigitized: null,
      screensBurned: null,
      prepPending: false
    },
    fulfillment: {
      method: 'PickedUp',
      shippingLabelPrinted: false,
      customerPickedUp: true,
      fulfilledAt: daysAgo(6)
    },
    invoiceStatus: {
      invoiceNumber: 'INV-2024-0017',
      invoiceAmount: 1120.00,
      invoiceCreated: true,
      invoiceSent: true,
      invoiceSentAt: daysAgo(5),
      paymentReceived: false
    },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // ============================================
  // CLOSEOUT STAGE (1 order)
  // ============================================

  // TEST-1018: Closeout - Partially complete
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1018',
    customer: 'Sunset Dental Group',
    customerEmail: 'office@sunsetdental.com',
    customerPhone: '555-100-1018',
    projectName: 'Staff Scrub Tops',
    status: 'Closeout',
    createdAt: daysAgo(35),
    dueDate: formatDate(daysAgo(10)),
    lineItems: [
      {
        id: 'li-1018-1',
        itemNumber: 'WM-6055',
        name: 'WonderWink 6055 Medical Scrub Top',
        color: 'Ceil Blue',
        size: 'M',
        qty: 25,
        decorationType: 'Embroidery',
        decorationPlacements: 2,
        cost: 18.00,
        price: 45.00,
        ordered: true,
        orderedAt: daysAgo(30),
        received: true,
        receivedAt: daysAgo(24),
        decorated: true,
        decoratedAt: daysAgo(16),
        packed: true,
        packedAt: daysAgo(15),
        stitchCountTier: '8k-12k'
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: {
      gangSheetCreated: null,
      artworkDigitized: true,
      screensBurned: null,
      prepPending: false
    },
    fulfillment: {
      method: 'Shipped',
      shippingLabelPrinted: true,
      customerPickedUp: false,
      trackingNumber: '1Z999BB20234567895',
      fulfilledAt: daysAgo(12)
    },
    invoiceStatus: {
      invoiceNumber: 'INV-2024-0018',
      invoiceAmount: 1125.00,
      invoiceCreated: true,
      invoiceSent: true,
      invoiceSentAt: daysAgo(11),
      paymentReceived: true,
      paymentReceivedAt: daysAgo(8),
      paymentMethod: 'Credit Card'
    },
    closeoutChecklist: {
      filesSaved: true,
      canvaArchived: false,
      summaryUploaded: false
    },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false
  },

  // ============================================
  // CLOSED ORDERS (2 orders)
  // ============================================

  // TEST-1019: Closed - Completed successfully
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1019',
    customer: 'Golden Gate Realty',
    customerEmail: 'marketing@goldengatereal.com',
    customerPhone: '555-100-1019',
    projectName: 'Agent Polos',
    status: 'Closed',
    createdAt: daysAgo(45),
    dueDate: formatDate(daysAgo(20)),
    lineItems: [
      {
        id: 'li-1019-1',
        itemNumber: 'PA-K420',
        name: 'Port Authority K420 Pique Polo',
        color: 'Gold',
        size: 'L',
        qty: 35,
        decorationType: 'Embroidery',
        decorationPlacements: 1,
        cost: 14.00,
        price: 38.00,
        ordered: true,
        orderedAt: daysAgo(42),
        received: true,
        receivedAt: daysAgo(36),
        decorated: true,
        decoratedAt: daysAgo(28),
        packed: true,
        packedAt: daysAgo(27),
        stitchCountTier: '<8k'
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: {
      gangSheetCreated: null,
      artworkDigitized: true,
      screensBurned: null,
      prepPending: false
    },
    fulfillment: {
      method: 'Shipped',
      shippingLabelPrinted: true,
      customerPickedUp: false,
      trackingNumber: '1Z999CC30345678906',
      fulfilledAt: daysAgo(25)
    },
    invoiceStatus: {
      invoiceNumber: 'INV-2024-0019',
      invoiceAmount: 1330.00,
      invoiceCreated: true,
      invoiceSent: true,
      invoiceSentAt: daysAgo(24),
      paymentReceived: true,
      paymentReceivedAt: daysAgo(21),
      paymentMethod: 'ACH'
    },
    closeoutChecklist: {
      filesSaved: true,
      canvaArchived: true,
      summaryUploaded: true
    },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false,
    closedAt: daysAgo(18),
    closedReason: 'Completed',
    reopenedFrom: 'Closeout'
  },

  // TEST-1020: Closed - Cancelled order (for reopen testing)
  {
    id: nextId('TBD'),
    orderNumber: 'TBD-TEST-1020',
    customer: 'Northern Lights Yoga',
    customerEmail: 'info@northernlightsyoga.com',
    customerPhone: '555-100-1020',
    projectName: 'Instructor Tanks',
    status: 'Closed',
    createdAt: daysAgo(40),
    dueDate: formatDate(daysAgo(15)),
    lineItems: [
      {
        id: 'li-1020-1',
        itemNumber: 'BC-8800',
        name: 'Bella+Canvas 8800 Flowy Tank',
        color: 'Mauve',
        size: 'S',
        qty: 20,
        decorationType: 'DTF',
        decorationPlacements: 1,
        cost: 7.00,
        price: 22.00,
        ordered: true,
        orderedAt: daysAgo(36),
        received: false,
        decorated: false,
        packed: false,
        dtfSize: 'Standard'
      }
    ],
    artStatus: 'Approved',
    rushOrder: false,
    prepStatus: { ...DEFAULT_PREP_STATUS },
    fulfillment: { ...DEFAULT_FULFILLMENT },
    invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
    closeoutChecklist: { ...DEFAULT_CLOSEOUT },
    artConfirmation: {
      ...DEFAULT_ART_CONFIRMATION,
      overallStatus: 'Approved'
    },
    history: [],
    version: 1,
    isArchived: false,
    closedAt: daysAgo(30),
    closedReason: 'Customer Cancelled - inventory issue',
    reopenedFrom: 'Inventory Order'
  }
];

/**
 * Get orders by status for testing specific stages
 */
export function getOrdersByStatus(status: OrderStatus): Order[] {
  return TEST_ORDERS.filter(o => o.status === status);
}

/**
 * Get test order by order number
 */
export function getTestOrder(orderNumber: string): Order | undefined {
  return TEST_ORDERS.find(o => o.orderNumber === orderNumber);
}

/**
 * Get summary of test orders
 */
export function getTestOrderSummary(): Record<OrderStatus, number> {
  const summary: Record<OrderStatus, number> = {} as Record<OrderStatus, number>;
  TEST_ORDERS.forEach(order => {
    summary[order.status] = (summary[order.status] || 0) + 1;
  });
  return summary;
}

export default TEST_ORDERS;
