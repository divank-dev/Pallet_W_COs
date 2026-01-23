import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Check, AlertCircle, ShoppingCart, FileText, Package, Palette, Layers, Truck, Archive, ClipboardCheck, Printer, Settings, Users, Calendar, DollarSign, Phone, Mail, ThermometerSun, Target, Send, MessageSquare, Image, Link, Clock, Edit3, Eye, RefreshCw, CheckCircle2, XCircle, Upload, Download, File, FileImage, FilePlus, History, ChevronDown, ChevronUp, Paperclip, ArrowLeft, Building2 } from 'lucide-react';
import { Order, OrderStatus, ViewMode, LineItem, ProductionMethod, STAGE_NUMBER, LeadSource, LeadTemperature, LeadInfo, ArtPlacement, ArtProof, ArtConfirmation, ArtFile, ArtRevision, ArtFileType } from '../types';
import { calculatePrice } from '../utils/pricing';
import { DEFAULT_LEAD_INFO, DEFAULT_ART_CONFIRMATION, ORDER_STAGES, PRODUCTION_METHOD_OPTIONS, SIZE_OPTIONS, PLACEMENT_LOCATIONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface OrderSlideOverProps {
  order: Order;
  viewMode: ViewMode;
  onClose: () => void;
  onUpdate: (order: Order) => void;
  onDeleteQuote?: (orderId: string, keepAsLead: boolean) => void;
  initialShowAddItem?: boolean;
  onAddItemOpened?: () => void;
  allOrders?: Order[];
}

interface ColorRow {
  id: string;
  color: string;
  quantities: { [size: string]: number };
}

interface SkuConfig {
  itemNumber: string;
  name: string;
  cost: number;
  decorationType: ProductionMethod | '';
  decorationPlacements: number;
  decorationDescription: string;
  screenPrintColors: number;
  stitchCountTier: '<8k' | '8k-12k' | '12k+' | '';
  dtfSize: 'Standard' | 'Large' | '';
  colorRows: ColorRow[];
}

const createEmptyColorRow = (): ColorRow => ({
  id: Math.random().toString(36).substr(2, 9),
  color: '',
  quantities: SIZE_OPTIONS.reduce((acc, size) => ({ ...acc, [size]: 0 }), {})
});

const createEmptySkuConfig = (): SkuConfig => ({
  itemNumber: '',
  name: '',
  cost: 0,
  decorationType: '',
  decorationPlacements: 0,
  decorationDescription: '',
  screenPrintColors: 0,
  stitchCountTier: '',
  dtfSize: '',
  colorRows: [createEmptyColorRow()]
});

// Helper functions for new Change Order system
const separateLineItems = (items: LineItem[] | undefined): { original: LineItem[]; changeOrders: LineItem[] } => {
  if (!items || !Array.isArray(items)) {
    return { original: [], changeOrders: [] };
  }

  try {
    const original = items.filter(item => item && !item.isChangeOrder);
    const changeOrders = items.filter(item => item && item.isChangeOrder);
    return { original, changeOrders };
  } catch (error) {
    console.error('Error in separateLineItems:', error);
    return { original: [], changeOrders: [] };
  }
};

const calculateItemTotals = (items: LineItem[]): { qty: number; value: number; count: number } => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { qty: 0, value: 0, count: 0 };
  }

  try {
    return items.reduce((acc, item) => {
      if (!item) return acc;

      const qty = typeof item.qty === 'number' ? item.qty : 0;
      const price = typeof item.price === 'number' ? item.price : 0;

      return {
        qty: acc.qty + qty,
        value: acc.value + (price * qty),
        count: acc.count + 1
      };
    }, { qty: 0, value: 0, count: 0 });
  } catch (error) {
    console.error('Error in calculateItemTotals:', error);
    return { qty: 0, value: 0, count: 0 };
  }
};

const formatChangeOrderDate = (date?: Date | string | null): string => {
  if (!date) return '';

  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Art Info Panel Component - Shows art status, notes and artwork files on ALL stages
interface ArtInfoPanelProps {
  order: Order;
}

const ArtInfoPanel: React.FC<ArtInfoPanelProps> = ({ order }) => {
  // Start expanded by default so artwork info is immediately visible
  const [expanded, setExpanded] = useState(true);

  const artConfirmation = order.artConfirmation;

  // Check if artwork is approved/complete
  const isArtworkApproved = order.artStatus === 'Approved' ||
    artConfirmation?.overallStatus === 'Approved';

  const isArtworkPending = order.artStatus === 'Pending' ||
    artConfirmation?.overallStatus === 'Pending' ||
    artConfirmation?.overallStatus === 'In Progress';

  const hasNotes = artConfirmation?.designerNotes || artConfirmation?.internalNotes;

  // Collect all artwork/proof files
  const artworkFiles: { name: string; url: string; type: string; placement?: string; isApproved?: boolean }[] = [];

  // Add files from placements/proofs (prioritize approved, but show all)
  artConfirmation?.placements?.forEach(placement => {
    placement.proofs?.forEach(proof => {
      // Add proof URL if available
      if (proof.proofUrl) {
        artworkFiles.push({
          name: proof.proofName || `${placement.location} Proof v${proof.version}`,
          url: proof.proofUrl,
          type: 'Proof',
          placement: placement.location,
          isApproved: proof.status === 'Approved'
        });
      }
      // Add files from proofs
      proof.files?.forEach(file => {
        artworkFiles.push({
          name: file.fileName,
          url: file.fileUrl,
          type: file.fileType,
          placement: placement.location,
          isApproved: proof.status === 'Approved'
        });
      });
    });
  });

  // Add mockup and original artwork URLs if available
  if (artConfirmation?.mockupUrl) {
    artworkFiles.push({
      name: 'Product Mockup',
      url: artConfirmation.mockupUrl,
      type: 'Mockup',
      isApproved: isArtworkApproved
    });
  }
  if (artConfirmation?.originalArtworkUrl) {
    artworkFiles.push({
      name: 'Original Artwork',
      url: artConfirmation.originalArtworkUrl,
      type: 'Original',
      isApproved: isArtworkApproved
    });
  }

  // Add client files
  artConfirmation?.clientFiles?.forEach(file => {
    artworkFiles.push({
      name: file.fileName,
      url: file.fileUrl,
      type: 'Client File'
    });
  });

  const hasFiles = artworkFiles.length > 0;
  const hasContent = hasNotes || hasFiles || artConfirmation?.customerApprovalName;
  const hasAnyArtInfo = hasContent || isArtworkPending || artConfirmation;

  // Determine styling based on art status
  const panelStyles = isArtworkApproved
    ? { bg: 'bg-green-50', border: 'border-green-200', hoverBg: 'hover:bg-green-100', iconColor: 'text-green-600', titleColor: 'text-green-800', badgeBg: 'bg-green-200', badgeText: 'text-green-700' }
    : { bg: 'bg-amber-50', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100', iconColor: 'text-amber-600', titleColor: 'text-amber-800', badgeBg: 'bg-amber-200', badgeText: 'text-amber-700' };

  return (
    <div className={`${panelStyles.bg} border ${panelStyles.border} rounded-xl overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 flex items-center justify-between ${panelStyles.hoverBg} transition-colors`}
      >
        <div className="flex items-center gap-2">
          {isArtworkApproved ? (
            <CheckCircle2 size={18} className={panelStyles.iconColor} />
          ) : (
            <AlertCircle size={18} className={panelStyles.iconColor} />
          )}
          <span className={`font-bold ${panelStyles.titleColor}`}>
            {isArtworkApproved ? 'Artwork & Notes' : 'Artwork & Notes (Art Not Complete)'}
          </span>
          {!isArtworkApproved && (
            <span className={`px-2 py-0.5 ${panelStyles.badgeBg} ${panelStyles.badgeText} text-xs font-bold rounded-full`}>
              {order.artStatus || artConfirmation?.overallStatus || 'Pending'}
            </span>
          )}
          {artworkFiles.length > 0 && (
            <span className={`px-2 py-0.5 ${panelStyles.badgeBg} ${panelStyles.badgeText} text-xs font-bold rounded-full`}>
              {artworkFiles.length} file{artworkFiles.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={18} className={panelStyles.iconColor} /> : <ChevronDown size={18} className={panelStyles.iconColor} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Art Status Warning */}
          {!isArtworkApproved && (
            <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                Art is not complete - Status: {order.artStatus || artConfirmation?.overallStatus || 'Not Started'}
              </p>
            </div>
          )}

          {/* No Content Message */}
          {!hasContent && !isArtworkApproved && (
            <div className="text-center py-4 text-slate-400">
              <Palette size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No artwork files or notes added yet</p>
              <p className="text-xs">Artwork info will appear here once added in Art Confirmation</p>
            </div>
          )}

          {/* Notes Section */}
          {hasNotes && (
            <div className="space-y-3">
              {artConfirmation?.designerNotes && (
                <div className={`bg-white rounded-lg p-3 border ${isArtworkApproved ? 'border-green-100' : 'border-amber-100'}`}>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Designer Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{artConfirmation.designerNotes}</p>
                </div>
              )}
              {artConfirmation?.internalNotes && (
                <div className={`bg-white rounded-lg p-3 border ${isArtworkApproved ? 'border-green-100' : 'border-amber-100'}`}>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Internal Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{artConfirmation.internalNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Approval Info */}
          {artConfirmation?.customerApprovalName && (
            <div className={`bg-white rounded-lg p-3 border ${isArtworkApproved ? 'border-green-100' : 'border-amber-100'}`}>
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Approval Details</p>
              <p className="text-sm text-slate-700">
                Approved by <span className="font-bold">{artConfirmation.customerApprovalName}</span>
                {artConfirmation.customerApprovalDate && (
                  <span> on {new Date(artConfirmation.customerApprovalDate).toLocaleDateString()}</span>
                )}
                {artConfirmation.customerApprovalMethod && (
                  <span> via {artConfirmation.customerApprovalMethod}</span>
                )}
              </p>
            </div>
          )}

          {/* Artwork Files Section */}
          {hasFiles && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Artwork & Proof Files</p>
              <div className="space-y-2">
                {artworkFiles.map((file, index) => (
                  <a
                    key={index}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between p-3 bg-white rounded-lg border ${
                      isArtworkApproved ? 'border-green-100 hover:bg-green-50 hover:border-green-300' : 'border-amber-100 hover:bg-amber-50 hover:border-amber-300'
                    } transition-colors group`}
                  >
                    <div className="flex items-center gap-3">
                      <FileImage size={18} className={isArtworkApproved ? 'text-green-600' : 'text-amber-600'} />
                      <div>
                        <p className={`text-sm font-medium text-slate-800 ${isArtworkApproved ? 'group-hover:text-green-700' : 'group-hover:text-amber-700'}`}>
                          {file.name}
                          {file.isApproved && <span className="ml-2 text-xs text-green-600 font-bold">✓ Approved</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {file.type}
                          {file.placement && <span> • {file.placement}</span>}
                        </p>
                      </div>
                    </div>
                    <Download size={16} className={`text-slate-400 ${isArtworkApproved ? 'group-hover:text-green-600' : 'group-hover:text-amber-600'}`} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Art Confirmation Panel Component
interface ArtConfirmationPanelProps {
  order: Order;
  onUpdate: (order: Order) => void;
  moveNext: (status: Order['status'], updates?: Partial<Order>) => void;
}

const ArtConfirmationPanel: React.FC<ArtConfirmationPanelProps> = ({ order, onUpdate, moveNext }) => {
  const [showAddPlacement, setShowAddPlacement] = useState(false);
  const [showAddProof, setShowAddProof] = useState<string | null>(null);
  const [editingPlacement, setEditingPlacement] = useState<string | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<{ proofId: string; placementId: string; feedback: string } | null>(null);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [showClientFileUpload, setShowClientFileUpload] = useState(false);
  const [showMarkupUpload, setShowMarkupUpload] = useState<{ placementId: string; proofId: string } | null>(null);

  // New placement form state
  const [newPlacement, setNewPlacement] = useState({
    location: '',
    customLocation: '',
    width: '',
    height: '',
    colorCount: 1,
    description: ''
  });

  // New proof form state
  const [newProof, setNewProof] = useState({
    proofName: '',
    proofUrl: '',
    proofNotes: ''
  });

  // New file upload form state
  const [newFile, setNewFile] = useState({
    fileName: '',
    fileUrl: '',
    fileType: 'original' as ArtFileType,
    notes: '',
    isMarkup: false
  });

  const artConfirmation = order.artConfirmation || { ...DEFAULT_ART_CONFIRMATION };
  const clientFiles = artConfirmation.clientFiles || [];
  const revisionHistory = artConfirmation.revisionHistory || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Sent to Customer': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Revision Requested': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'In Progress': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getProofStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-500';
      case 'Sent': return 'bg-blue-500';
      case 'Revision Needed': return 'bg-orange-500';
      default: return 'bg-slate-400';
    }
  };

  // Add new placement
  const handleAddPlacement = () => {
    const location = newPlacement.location === 'Other' ? newPlacement.customLocation : newPlacement.location;
    if (!location) return;

    const placement: ArtPlacement = {
      id: Math.random().toString(36).substr(2, 9),
      location,
      width: newPlacement.width || undefined,
      height: newPlacement.height || undefined,
      colorCount: newPlacement.colorCount,
      description: newPlacement.description || undefined,
      proofs: []
    };

    const revision = addRevisionEntry(
      'placement_added',
      `Added art placement: ${location}${newPlacement.width ? ` (${newPlacement.width}x${newPlacement.height})` : ''}`,
      { relatedPlacementId: placement.id }
    );

    const updatedArtConfirmation: ArtConfirmation = {
      ...artConfirmation,
      overallStatus: artConfirmation.overallStatus === 'Not Started' ? 'In Progress' : artConfirmation.overallStatus,
      placements: [...artConfirmation.placements, placement],
      revisionHistory: [...revisionHistory, revision],
      startedAt: artConfirmation.startedAt || new Date()
    };

    onUpdate({
      ...order,
      artConfirmation: updatedArtConfirmation,
      artStatus: order.artStatus === 'Not Started' ? 'In Progress' : order.artStatus
    });

    setNewPlacement({ location: '', customLocation: '', width: '', height: '', colorCount: 1, description: '' });
    setShowAddPlacement(false);
  };

  // Helper to add revision history entry
  const addRevisionEntry = (
    action: ArtRevision['action'],
    description: string,
    extras?: Partial<ArtRevision>
  ): ArtRevision => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      action,
      description,
      performedBy: 'Designer',
      ...extras
    };
  };

  // Handle client file upload
  const handleUploadClientFile = () => {
    if (!newFile.fileName || !newFile.fileUrl) return;

    const file: ArtFile = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: newFile.fileName,
      fileType: newFile.fileType,
      fileUrl: newFile.fileUrl,
      uploadedAt: new Date(),
      uploadedBy: newFile.isMarkup ? 'client' : 'client',
      notes: newFile.notes || undefined,
      isMarkup: newFile.isMarkup
    };

    const revision = addRevisionEntry(
      'file_uploaded',
      `${newFile.isMarkup ? 'Client' : 'Client'} uploaded ${newFile.fileType} file: ${newFile.fileName}`,
      { performedBy: 'Client', relatedFileId: file.id }
    );

    onUpdate({
      ...order,
      artConfirmation: {
        ...artConfirmation,
        clientFiles: [...clientFiles, file],
        revisionHistory: [...revisionHistory, revision],
        overallStatus: artConfirmation.overallStatus === 'Not Started' ? 'In Progress' : artConfirmation.overallStatus,
        startedAt: artConfirmation.startedAt || new Date()
      },
      artStatus: order.artStatus === 'Not Started' ? 'In Progress' : order.artStatus
    });

    setNewFile({ fileName: '', fileUrl: '', fileType: 'original', notes: '', isMarkup: false });
    setShowClientFileUpload(false);
  };

  // Handle markup file upload for a proof
  const handleUploadMarkupFile = (placementId: string, proofId: string) => {
    if (!newFile.fileName || !newFile.fileUrl) return;

    const file: ArtFile = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: newFile.fileName,
      fileType: 'markup',
      fileUrl: newFile.fileUrl,
      uploadedAt: new Date(),
      uploadedBy: 'client',
      notes: newFile.notes || undefined,
      isMarkup: true,
      parentFileId: proofId
    };

    const updatedPlacements = artConfirmation.placements.map(p => {
      if (p.id === placementId) {
        return {
          ...p,
          proofs: p.proofs.map(pr =>
            pr.id === proofId
              ? { ...pr, markupFiles: [...(pr.markupFiles || []), file] }
              : pr
          )
        };
      }
      return p;
    });

    const revision = addRevisionEntry(
      'feedback_received',
      `Client uploaded marked-up proof: ${newFile.fileName}`,
      { performedBy: 'Client', relatedFileId: file.id, relatedProofId: proofId, relatedPlacementId: placementId }
    );

    onUpdate({
      ...order,
      artConfirmation: {
        ...artConfirmation,
        placements: updatedPlacements,
        revisionHistory: [...revisionHistory, revision],
        overallStatus: 'Revision Requested'
      },
      artStatus: 'Revision Requested'
    });

    setNewFile({ fileName: '', fileUrl: '', fileType: 'original', notes: '', isMarkup: false });
    setShowMarkupUpload(null);
  };

  // Delete a client file
  const handleDeleteClientFile = (fileId: string) => {
    const file = clientFiles.find(f => f.id === fileId);
    const revision = addRevisionEntry(
      'file_uploaded',
      `Deleted file: ${file?.fileName || 'Unknown'}`,
      { performedBy: 'Designer', relatedFileId: fileId }
    );

    onUpdate({
      ...order,
      artConfirmation: {
        ...artConfirmation,
        clientFiles: clientFiles.filter(f => f.id !== fileId),
        revisionHistory: [...revisionHistory, revision]
      }
    });
  };

  // Add new proof to a placement
  const handleAddProof = (placementId: string) => {
    if (!newProof.proofName) return;

    const placement = artConfirmation.placements.find(p => p.id === placementId);
    if (!placement) return;

    const proof: ArtProof = {
      id: Math.random().toString(36).substr(2, 9),
      version: placement.proofs.length + 1,
      proofName: newProof.proofName,
      proofUrl: newProof.proofUrl || undefined,
      proofNotes: newProof.proofNotes || undefined,
      createdAt: new Date(),
      status: 'Draft',
      files: [],
      markupFiles: []
    };

    const revision = addRevisionEntry(
      'proof_created',
      `Created proof v${proof.version}: ${newProof.proofName} for ${placement.location}`,
      { relatedProofId: proof.id, relatedPlacementId: placementId }
    );

    const updatedPlacements = artConfirmation.placements.map(p =>
      p.id === placementId ? { ...p, proofs: [...p.proofs, proof] } : p
    );

    onUpdate({
      ...order,
      artConfirmation: {
        ...artConfirmation,
        placements: updatedPlacements,
        revisionHistory: [...revisionHistory, revision]
      }
    });

    setNewProof({ proofName: '', proofUrl: '', proofNotes: '' });
    setShowAddProof(null);
  };

  // Send proof to customer
  const handleSendProof = (placementId: string, proofId: string) => {
    const placement = artConfirmation.placements.find(p => p.id === placementId);
    const proof = placement?.proofs.find(pr => pr.id === proofId);

    const updatedPlacements = artConfirmation.placements.map(p => {
      if (p.id === placementId) {
        return {
          ...p,
          proofs: p.proofs.map(pr =>
            pr.id === proofId ? { ...pr, status: 'Sent' as const, sentToCustomerAt: new Date() } : pr
          )
        };
      }
      return p;
    });

    const revision = addRevisionEntry(
      'proof_sent',
      `Sent proof v${proof?.version || '?'}: ${proof?.proofName || 'Unknown'} to customer`,
      { relatedProofId: proofId, relatedPlacementId: placementId }
    );

    onUpdate({
      ...order,
      artConfirmation: {
        ...artConfirmation,
        placements: updatedPlacements,
        revisionHistory: [...revisionHistory, revision],
        overallStatus: 'Sent to Customer',
        lastContactedAt: new Date()
      },
      artStatus: 'Sent to Customer'
    });
  };

  // Record customer feedback
  const handleRecordFeedback = () => {
    if (!feedbackInput) return;

    const placement = artConfirmation.placements.find(p => p.id === feedbackInput.placementId);
    const proof = placement?.proofs.find(pr => pr.id === feedbackInput.proofId);

    const updatedPlacements = artConfirmation.placements.map(p => {
      if (p.id === feedbackInput.placementId) {
        return {
          ...p,
          proofs: p.proofs.map(pr =>
            pr.id === feedbackInput.proofId
              ? { ...pr, customerFeedback: feedbackInput.feedback, feedbackReceivedAt: new Date(), status: 'Revision Needed' as const }
              : pr
          )
        };
      }
      return p;
    });

    const revision = addRevisionEntry(
      'feedback_received',
      `Customer feedback received for ${proof?.proofName || 'proof'}: revision requested`,
      { relatedProofId: feedbackInput.proofId, relatedPlacementId: feedbackInput.placementId, notes: feedbackInput.feedback, performedBy: 'Customer' }
    );

    onUpdate({
      ...order,
      artConfirmation: {
        ...artConfirmation,
        placements: updatedPlacements,
        revisionHistory: [...revisionHistory, revision],
        overallStatus: 'Revision Requested'
      },
      artStatus: 'Revision Requested'
    });

    setFeedbackInput(null);
  };

  // Approve a proof
  const handleApproveProof = (placementId: string, proofId: string) => {
    const placement = artConfirmation.placements.find(p => p.id === placementId);
    const proof = placement?.proofs.find(pr => pr.id === proofId);

    const updatedPlacements = artConfirmation.placements.map(p => {
      if (p.id === placementId) {
        return {
          ...p,
          proofs: p.proofs.map(pr =>
            pr.id === proofId ? { ...pr, status: 'Approved' as const } : pr
          )
        };
      }
      return p;
    });

    // Check if all placements have at least one approved proof
    const allApproved = updatedPlacements.every(p => p.proofs.some(pr => pr.status === 'Approved'));

    const revision = addRevisionEntry(
      'approved',
      allApproved
        ? `All art approved! Final approval on ${proof?.proofName || 'proof'} for ${placement?.location || 'placement'}`
        : `Approved proof v${proof?.version || '?'}: ${proof?.proofName || 'Unknown'} for ${placement?.location || 'placement'}`,
      { relatedProofId: proofId, relatedPlacementId: placementId, performedBy: 'Customer' }
    );

    onUpdate({
      ...order,
      artConfirmation: {
        ...artConfirmation,
        placements: updatedPlacements,
        revisionHistory: [...revisionHistory, revision],
        overallStatus: allApproved ? 'Approved' : artConfirmation.overallStatus,
        completedAt: allApproved ? new Date() : undefined
      },
      artStatus: allApproved ? 'Approved' : order.artStatus
    });
  };

  // Delete placement
  const handleDeletePlacement = (placementId: string) => {
    const placement = artConfirmation.placements.find(p => p.id === placementId);
    const updatedPlacements = artConfirmation.placements.filter(p => p.id !== placementId);

    const revision = addRevisionEntry(
      'placement_removed',
      `Removed art placement: ${placement?.location || 'Unknown'}`,
      { relatedPlacementId: placementId }
    );

    onUpdate({
      ...order,
      artConfirmation: {
        ...artConfirmation,
        placements: updatedPlacements,
        revisionHistory: [...revisionHistory, revision]
      }
    });
  };

  // Update internal notes
  const handleUpdateNotes = (field: 'designerNotes' | 'internalNotes', value: string) => {
    onUpdate({
      ...order,
      artConfirmation: { ...artConfirmation, [field]: value }
    });
  };

  // Update original artwork URL
  const handleUpdateOriginalArtwork = (url: string) => {
    onUpdate({
      ...order,
      artConfirmation: { ...artConfirmation, originalArtworkUrl: url }
    });
  };

  // Update mockup URL
  const handleUpdateMockup = (url: string) => {
    onUpdate({
      ...order,
      artConfirmation: { ...artConfirmation, mockupUrl: url }
    });
  };

  // Final approval
  const handleFinalApproval = (approvalName: string, method: 'Email' | 'Signed Proof' | 'Verbal' | 'Digital Signature') => {
    onUpdate({
      ...order,
      artConfirmation: {
        ...artConfirmation,
        overallStatus: 'Approved',
        customerApprovalName: approvalName,
        customerApprovalDate: new Date(),
        customerApprovalMethod: method,
        completedAt: new Date()
      },
      artStatus: 'Approved'
    });
  };

  const allPlacementsApproved = artConfirmation.placements.length > 0 &&
    artConfirmation.placements.every(p => p.proofs.some(pr => pr.status === 'Approved'));

  return (
    <div className="space-y-6">
      {/* Overall Status Header */}
      <div className={`p-4 rounded-xl border-2 ${getStatusColor(artConfirmation.overallStatus)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase opacity-70">Art Confirmation Status</p>
            <p className="text-xl font-black">{artConfirmation.overallStatus}</p>
          </div>
          {artConfirmation.overallStatus === 'Approved' ? (
            <CheckCircle2 size={32} />
          ) : artConfirmation.overallStatus === 'Revision Requested' ? (
            <RefreshCw size={32} />
          ) : artConfirmation.overallStatus === 'Sent to Customer' ? (
            <Send size={32} />
          ) : (
            <Palette size={32} />
          )}
        </div>
        {artConfirmation.lastContactedAt && (
          <p className="text-xs mt-2 opacity-70">
            Last contacted: {new Date(artConfirmation.lastContactedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Original Artwork & Mockup Links */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <Image size={16} /> Artwork Files
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Original Artwork URL</label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={artConfirmation.originalArtworkUrl || ''}
              onChange={(e) => handleUpdateOriginalArtwork(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Product Mockup URL</label>
            <input
              type="url"
              placeholder="https://canva.com/..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={artConfirmation.mockupUrl || ''}
              onChange={(e) => handleUpdateMockup(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {artConfirmation.originalArtworkUrl && (
            <a href={artConfirmation.originalArtworkUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Link size={12} /> View Original
            </a>
          )}
          {artConfirmation.mockupUrl && (
            <a href={artConfirmation.mockupUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Eye size={12} /> View Mockup
            </a>
          )}
        </div>
      </div>

      {/* Art Placements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-700 flex items-center gap-2">
            <Layers size={18} /> Art Placements ({artConfirmation.placements.length})
          </h4>
          <button
            onClick={() => setShowAddPlacement(true)}
            className="text-sm text-blue-600 font-bold flex items-center gap-1 hover:underline"
          >
            <Plus size={16} /> Add Placement
          </button>
        </div>

        {/* Add Placement Form */}
        {showAddPlacement && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <h5 className="font-bold text-blue-800 text-sm">New Art Placement</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Location *</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={newPlacement.location}
                  onChange={(e) => setNewPlacement({ ...newPlacement, location: e.target.value })}
                >
                  <option value="">Select location...</option>
                  {PLACEMENT_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              {newPlacement.location === 'Other' && (
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Enter custom location..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={newPlacement.customLocation}
                    onChange={(e) => setNewPlacement({ ...newPlacement, customLocation: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Width</label>
                <input
                  type="text"
                  placeholder='e.g., 3.5"'
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={newPlacement.width}
                  onChange={(e) => setNewPlacement({ ...newPlacement, width: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Height</label>
                <input
                  type="text"
                  placeholder='e.g., 4"'
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={newPlacement.height}
                  onChange={(e) => setNewPlacement({ ...newPlacement, height: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Colors/Threads</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={newPlacement.colorCount}
                  onChange={(e) => setNewPlacement({ ...newPlacement, colorCount: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                <textarea
                  placeholder="Special instructions..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                  rows={2}
                  value={newPlacement.description}
                  onChange={(e) => setNewPlacement({ ...newPlacement, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddPlacement}
                disabled={!newPlacement.location || (newPlacement.location === 'Other' && !newPlacement.customLocation)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Placement
              </button>
              <button
                onClick={() => setShowAddPlacement(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Placement Cards */}
        {artConfirmation.placements.map((placement) => (
          <div key={placement.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Placement Header */}
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <div>
                <h5 className="font-bold text-slate-800">{placement.location}</h5>
                <div className="flex gap-3 text-xs text-slate-500 mt-1">
                  {placement.width && <span>W: {placement.width}</span>}
                  {placement.height && <span>H: {placement.height}</span>}
                  {placement.colorCount && <span>{placement.colorCount} colors</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {placement.proofs.some(p => p.status === 'Approved') && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Approved</span>
                )}
                <button
                  onClick={() => handleDeletePlacement(placement.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {placement.description && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
                <strong>Notes:</strong> {placement.description}
              </div>
            )}

            {/* Proofs */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Proof Versions</span>
                <button
                  onClick={() => setShowAddProof(placement.id)}
                  className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Add Proof
                </button>
              </div>

              {/* Add Proof Form */}
              {showAddProof === placement.id && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Proof name (e.g., Logo v2)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={newProof.proofName}
                    onChange={(e) => setNewProof({ ...newProof, proofName: e.target.value })}
                  />
                  <input
                    type="url"
                    placeholder="Proof URL (Canva, Drive, etc.)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={newProof.proofUrl}
                    onChange={(e) => setNewProof({ ...newProof, proofUrl: e.target.value })}
                  />
                  <textarea
                    placeholder="Designer notes..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                    rows={2}
                    value={newProof.proofNotes}
                    onChange={(e) => setNewProof({ ...newProof, proofNotes: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddProof(placement.id)}
                      disabled={!newProof.proofName}
                      className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-purple-700 disabled:opacity-50"
                    >
                      Add Proof
                    </button>
                    <button
                      onClick={() => { setShowAddProof(null); setNewProof({ proofName: '', proofUrl: '', proofNotes: '' }); }}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Proof List */}
              {placement.proofs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No proofs yet. Add a proof to get started.</p>
              ) : (
                <div className="space-y-2">
                  {placement.proofs.map((proof) => (
                    <div key={proof.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getProofStatusColor(proof.status)}`} />
                          <div>
                            <p className="font-bold text-sm text-slate-800">
                              v{proof.version}: {proof.proofName}
                            </p>
                            <p className="text-xs text-slate-400">
                              Created: {new Date(proof.createdAt).toLocaleDateString()}
                              {proof.sentToCustomerAt && ` • Sent: ${new Date(proof.sentToCustomerAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          proof.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          proof.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                          proof.status === 'Revision Needed' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {proof.status}
                        </span>
                      </div>

                      {proof.proofNotes && (
                        <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded p-2">
                          <strong>Designer:</strong> {proof.proofNotes}
                        </p>
                      )}

                      {proof.customerFeedback && (
                        <p className="text-xs text-orange-700 mt-2 bg-orange-50 rounded p-2">
                          <strong>Customer Feedback:</strong> {proof.customerFeedback}
                        </p>
                      )}

                      {/* Proof Actions */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {proof.proofUrl && (
                          <a
                            href={proof.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 hover:bg-slate-200"
                          >
                            <Eye size={12} /> View Proof
                          </a>
                        )}
                        {proof.status === 'Draft' && (
                          <button
                            onClick={() => handleSendProof(placement.id, proof.id)}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 hover:bg-blue-700"
                          >
                            <Send size={12} /> Send to Customer
                          </button>
                        )}
                        {proof.status === 'Sent' && (
                          <>
                            <button
                              onClick={() => setFeedbackInput({ proofId: proof.id, placementId: placement.id, feedback: '' })}
                              className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 hover:bg-orange-600"
                            >
                              <MessageSquare size={12} /> Record Feedback
                            </button>
                            <button
                              onClick={() => handleApproveProof(placement.id, proof.id)}
                              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 hover:bg-green-700"
                            >
                              <Check size={12} /> Mark Approved
                            </button>
                          </>
                        )}
                        {proof.status === 'Revision Needed' && (
                          <span className="text-xs text-orange-600 font-medium">Revision requested - add new proof version</span>
                        )}
                      </div>

                      {/* Feedback Input */}
                      {feedbackInput?.proofId === proof.id && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                          <textarea
                            placeholder="Enter customer feedback..."
                            className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm resize-none"
                            rows={3}
                            value={feedbackInput.feedback}
                            onChange={(e) => setFeedbackInput({ ...feedbackInput, feedback: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleRecordFeedback}
                              disabled={!feedbackInput.feedback}
                              className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-600 disabled:opacity-50"
                            >
                              Save Feedback & Request Revision
                            </button>
                            <button
                              onClick={() => setFeedbackInput(null)}
                              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Client Markup Files */}
                      {proof.markupFiles && proof.markupFiles.length > 0 && (
                        <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1">
                            <Paperclip size={12} /> Client Markups ({proof.markupFiles.length})
                          </p>
                          <div className="space-y-1">
                            {proof.markupFiles.map(file => (
                              <a
                                key={file.id}
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-800 hover:underline"
                              >
                                <FileImage size={12} />
                                {file.fileName}
                                <span className="text-purple-400">({new Date(file.uploadedAt).toLocaleDateString()})</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upload Markup Button */}
                      {proof.status === 'Sent' && (
                        <button
                          onClick={() => setShowMarkupUpload({ placementId: placement.id, proofId: proof.id })}
                          className="mt-2 text-xs text-purple-600 font-medium flex items-center gap-1 hover:underline"
                        >
                          <Upload size={12} /> Upload Client Markup
                        </button>
                      )}

                      {/* Markup Upload Form */}
                      {showMarkupUpload?.proofId === proof.id && (
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                          <p className="text-xs font-bold text-purple-700">Upload Client Marked-up Proof</p>
                          <input
                            type="text"
                            placeholder="File name (e.g., logo-v2-markup.pdf)"
                            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm"
                            value={newFile.fileName}
                            onChange={(e) => setNewFile({ ...newFile, fileName: e.target.value })}
                          />
                          <input
                            type="url"
                            placeholder="File URL (Drive, Dropbox, etc.)"
                            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm"
                            value={newFile.fileUrl}
                            onChange={(e) => setNewFile({ ...newFile, fileUrl: e.target.value })}
                          />
                          <textarea
                            placeholder="Notes about the markup..."
                            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm resize-none"
                            rows={2}
                            value={newFile.notes}
                            onChange={(e) => setNewFile({ ...newFile, notes: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUploadMarkupFile(placement.id, proof.id)}
                              disabled={!newFile.fileName || !newFile.fileUrl}
                              className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-purple-700 disabled:opacity-50"
                            >
                              Upload Markup
                            </button>
                            <button
                              onClick={() => { setShowMarkupUpload(null); setNewFile({ fileName: '', fileUrl: '', fileType: 'original', notes: '', isMarkup: false }); }}
                              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {artConfirmation.placements.length === 0 && !showAddPlacement && (
          <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <Palette size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 text-sm">No art placements defined yet.</p>
            <button
              onClick={() => setShowAddPlacement(true)}
              className="mt-2 text-blue-600 font-bold text-sm hover:underline"
            >
              Add your first placement
            </button>
          </div>
        )}
      </div>

      {/* Designer Notes */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <Edit3 size={16} /> Designer Notes
        </h4>
        <textarea
          placeholder="Internal notes about artwork, colors, fonts, etc..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
          rows={3}
          value={artConfirmation.designerNotes || ''}
          onChange={(e) => handleUpdateNotes('designerNotes', e.target.value)}
        />
      </div>

      {/* Internal Notes */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <FileText size={16} /> Internal Notes
        </h4>
        <textarea
          placeholder="Communication notes, customer preferences, etc..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
          rows={3}
          value={artConfirmation.internalNotes || ''}
          onChange={(e) => handleUpdateNotes('internalNotes', e.target.value)}
        />
      </div>

      {/* Client Uploaded Files */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <Upload size={16} /> Client Files ({clientFiles.length})
          </h4>
          <button
            onClick={() => setShowClientFileUpload(true)}
            className="text-sm text-blue-600 font-bold flex items-center gap-1 hover:underline"
          >
            <FilePlus size={14} /> Add File
          </button>
        </div>

        {/* Client File Upload Form */}
        {showClientFileUpload && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <h5 className="font-bold text-blue-800 text-sm">Upload Client File</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">File Name *</label>
                <input
                  type="text"
                  placeholder="e.g., company-logo.ai"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={newFile.fileName}
                  onChange={(e) => setNewFile({ ...newFile, fileName: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">File URL *</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={newFile.fileUrl}
                  onChange={(e) => setNewFile({ ...newFile, fileUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">File Type</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={newFile.fileType}
                  onChange={(e) => setNewFile({ ...newFile, fileType: e.target.value as ArtFileType })}
                >
                  <option value="original">Original Artwork</option>
                  <option value="reference">Reference Image</option>
                  <option value="markup">Markup/Feedback</option>
                  <option value="final">Final Approved</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isMarkup"
                  checked={newFile.isMarkup}
                  onChange={(e) => setNewFile({ ...newFile, isMarkup: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isMarkup" className="text-sm text-slate-600">Contains Markup/Edits</label>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
                <textarea
                  placeholder="Description or notes about this file..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                  rows={2}
                  value={newFile.notes}
                  onChange={(e) => setNewFile({ ...newFile, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUploadClientFile}
                disabled={!newFile.fileName || !newFile.fileUrl}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload File
              </button>
              <button
                onClick={() => { setShowClientFileUpload(false); setNewFile({ fileName: '', fileUrl: '', fileType: 'original', notes: '', isMarkup: false }); }}
                className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Client Files List */}
        {clientFiles.length > 0 ? (
          <div className="space-y-2">
            {clientFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    file.fileType === 'original' ? 'bg-blue-100 text-blue-600' :
                    file.fileType === 'markup' ? 'bg-purple-100 text-purple-600' :
                    file.fileType === 'reference' ? 'bg-amber-100 text-amber-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {file.isMarkup ? <Paperclip size={16} /> : <File size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{file.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {file.fileType} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                      {file.notes && <span className="italic"> • {file.notes}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View file"
                  >
                    <Eye size={16} />
                  </a>
                  <button
                    onClick={() => handleDeleteClientFile(file.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <File size={24} className="mx-auto text-slate-300 mb-1" />
            <p className="text-slate-400 text-xs">No client files uploaded yet</p>
          </div>
        )}
      </div>

      {/* Revision History */}
      <div className="space-y-3">
        <button
          onClick={() => setShowRevisionHistory(!showRevisionHistory)}
          className="w-full flex items-center justify-between font-bold text-slate-700 text-sm hover:text-slate-900"
        >
          <span className="flex items-center gap-2">
            <History size={16} /> Revision History ({revisionHistory.length})
          </span>
          {showRevisionHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showRevisionHistory && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            {revisionHistory.length > 0 ? (
              <div className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
                {[...revisionHistory].reverse().map((rev, idx) => (
                  <div key={rev.id} className="p-3 flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      rev.action === 'approved' ? 'bg-green-100 text-green-600' :
                      rev.action === 'file_uploaded' ? 'bg-blue-100 text-blue-600' :
                      rev.action === 'proof_created' ? 'bg-purple-100 text-purple-600' :
                      rev.action === 'proof_sent' ? 'bg-sky-100 text-sky-600' :
                      rev.action === 'feedback_received' ? 'bg-orange-100 text-orange-600' :
                      rev.action === 'revision_requested' ? 'bg-amber-100 text-amber-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {rev.action === 'approved' ? <Check size={14} /> :
                       rev.action === 'file_uploaded' ? <Upload size={14} /> :
                       rev.action === 'proof_created' ? <FilePlus size={14} /> :
                       rev.action === 'proof_sent' ? <Send size={14} /> :
                       rev.action === 'feedback_received' ? <MessageSquare size={14} /> :
                       <Clock size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{rev.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {rev.performedBy && <span className="font-medium">{rev.performedBy}</span>}
                        {rev.performedBy && ' • '}
                        {new Date(rev.timestamp).toLocaleString()}
                      </p>
                      {rev.notes && (
                        <p className="text-xs text-slate-600 mt-1 italic">"{rev.notes}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <History size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="text-slate-400 text-xs">No revision history yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        {allPlacementsApproved ? (
          <button
            onClick={() => moveNext('Inventory Order', { artStatus: 'Approved' })}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 size={20} /> All Art Approved - Continue to Purchasing
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                handleFinalApproval(order.customer, 'Email');
                moveNext('Inventory Order', { artStatus: 'Approved' });
              }}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
            >
              <Check size={20} /> Art Approved - Continue
            </button>
            <button
              onClick={() => moveNext('Inventory Order')}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
            >
              <AlertCircle size={20} /> Skip Art (Advance with Art Pending)
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Closed Order Panel Component
interface ClosedOrderPanelProps {
  order: Order;
  onUpdate: (order: Order) => void;
}

const ClosedOrderPanel: React.FC<ClosedOrderPanelProps> = ({ order, onUpdate }) => {
  const [showReopenOptions, setShowReopenOptions] = useState(false);
  const [selectedReopenStage, setSelectedReopenStage] = useState<OrderStatus>(order.reopenedFrom || 'Quote');

  // Available stages to reopen to
  const reopenStages: OrderStatus[] = [
    'Quote', 'Approval', 'Art Confirmation', 'Inventory Order',
    'Production Prep', 'Inventory Received', 'Production', 'Fulfillment', 'Invoice', 'Closeout'
  ];

  const handleReopen = () => {
    onUpdate({
      ...order,
      status: selectedReopenStage,
      closedAt: undefined,
      closedReason: undefined,
      reopenedFrom: undefined,
      history: [
        ...order.history,
        {
          timestamp: new Date(),
          action: 'Order Reopened',
          previousValue: 'Closed',
          newValue: selectedReopenStage,
          notes: `Reopened to ${selectedReopenStage} stage`
        }
      ]
    });
  };

  // Calculate order summary
  const totalItems = order.lineItems?.reduce((sum, item) => sum + item.qty, 0) || 0;
  const totalValue = order.lineItems?.reduce((sum, item) => sum + (item.price * item.qty), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Closed Status Header */}
      <div className="bg-slate-100 rounded-xl p-6 border-2 border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-600 rounded-xl flex items-center justify-center">
            <Archive className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Order Closed</h3>
            <p className="text-slate-500 text-sm">
              Closed on {order.closedAt ? new Date(order.closedAt).toLocaleDateString() : 'Unknown date'}
              {order.closedReason && ` • Reason: ${order.closedReason}`}
            </p>
          </div>
        </div>
      </div>

      {/* Art Info Panel */}
      <ArtInfoPanel order={order} />

      {/* Order Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <h4 className="font-bold text-slate-700">Order Summary</h4>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-bold uppercase">Total Items</p>
              <p className="text-xl font-black text-slate-900">{totalItems}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-bold uppercase">Order Value</p>
              <p className="text-xl font-black text-green-600">${totalValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Created</p>
              <p className="font-bold text-slate-800">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Due Date</p>
              <p className="font-bold text-slate-800">{order.dueDate || 'Not set'}</p>
            </div>
            <div>
              <p className="text-slate-500">Art Status</p>
              <p className={`font-bold ${
                order.artStatus === 'Approved' ? 'text-green-600' : 'text-slate-800'
              }`}>{order.artStatus}</p>
            </div>
            <div>
              <p className="text-slate-500">Fulfillment</p>
              <p className="font-bold text-slate-800">
                {order.fulfillment.method || 'Not specified'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Closeout Checklist Summary */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <h4 className="font-bold text-slate-700">Closeout Checklist</h4>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              order.closeoutChecklist.filesSaved ? 'bg-green-500' : 'bg-slate-200'
            }`}>
              {order.closeoutChecklist.filesSaved && <Check size={12} className="text-white" />}
            </div>
            <span className="text-sm text-slate-700">Files Saved</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              order.closeoutChecklist.canvaArchived ? 'bg-green-500' : 'bg-slate-200'
            }`}>
              {order.closeoutChecklist.canvaArchived && <Check size={12} className="text-white" />}
            </div>
            <span className="text-sm text-slate-700">Canva Archived</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              order.closeoutChecklist.summaryUploaded ? 'bg-green-500' : 'bg-slate-200'
            }`}>
              {order.closeoutChecklist.summaryUploaded && <Check size={12} className="text-white" />}
            </div>
            <span className="text-sm text-slate-700">Summary Uploaded</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              order.closeoutChecklist.invoiceSent ? 'bg-green-500' : 'bg-slate-200'
            }`}>
              {order.closeoutChecklist.invoiceSent && <Check size={12} className="text-white" />}
            </div>
            <span className="text-sm text-slate-700">Invoice Sent</span>
          </div>
        </div>
      </div>

      {/* Reopen Order Section */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <RefreshCw size={20} className="text-amber-600" />
          <h4 className="font-bold text-amber-800">Reopen Order</h4>
        </div>

        {!showReopenOptions ? (
          <button
            onClick={() => setShowReopenOptions(true)}
            className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors"
          >
            Reopen This Order
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-amber-700">Select which stage to reopen this order to:</p>
            <select
              value={selectedReopenStage}
              onChange={(e) => setSelectedReopenStage(e.target.value as OrderStatus)}
              className="w-full border border-amber-300 rounded-xl px-4 py-3 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            >
              {reopenStages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleReopen}
                className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors"
              >
                Reopen to {selectedReopenStage}
              </button>
              <button
                onClick={() => setShowReopenOptions(false)}
                className="px-4 py-3 border border-amber-300 rounded-xl font-bold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Permanently Archive Option */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Trash2 size={20} className="text-red-600" />
          <h4 className="font-bold text-red-800">Permanent Archive</h4>
        </div>
        <p className="text-sm text-red-700 mb-3">
          Permanently archive this order. It will be removed from the closed orders list but data will be retained.
        </p>
        <button
          onClick={() => onUpdate({ ...order, isArchived: true, archivedAt: new Date() })}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
        >
          Permanently Archive
        </button>
      </div>
    </div>
  );
};

// Company settings interface (matches SettingsPage)
interface CompanySettings {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  accountNumber: string;
  taxId: string;
  notes: string;
}

const COMPANY_SETTINGS_KEY = 'pallet-company-settings';
const VENDORS_KEY = 'pallet-vendors';

// Vendor interface (must match SettingsPage)
interface Vendor {
  id: string;
  name: string;
  accountNumber: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
}

const OrderSlideOver: React.FC<OrderSlideOverProps> = ({ order, viewMode, onClose, onUpdate, onDeleteQuote, initialShowAddItem, onAddItemOpened, allOrders = [] }) => {
  const { permissions, currentUser } = useAuth();
  const isProduction = currentUser?.role === 'Production';

  // Simplified line items structure for new change order system
  const lineItemsData = useMemo(() => {
    try {
      const allItems = order?.lineItems || [];
      const { original, changeOrders } = separateLineItems(allItems);

      const originalTotals = calculateItemTotals(original);
      const changeOrderTotals = calculateItemTotals(changeOrders);
      const netTotals = {
        qty: originalTotals.qty + changeOrderTotals.qty,
        value: originalTotals.value + changeOrderTotals.value,
        count: originalTotals.count + changeOrderTotals.count
      };

      return {
        original,
        changeOrders,
        originalTotals,
        changeOrderTotals,
        netTotals,
        hasChangeOrders: changeOrders.length > 0
      };
    } catch (error) {
      console.error('Error building line items data:', error);
      return {
        original: [],
        changeOrders: [],
        originalTotals: { qty: 0, value: 0, count: 0 },
        changeOrderTotals: { qty: 0, value: 0, count: 0 },
        netTotals: { qty: 0, value: 0, count: 0 },
        hasChangeOrders: false
      };
    }
  }, [order?.lineItems]);

  const [showAddItem, setShowAddItem] = useState(initialShowAddItem || false);
  const [skuConfig, setSkuConfig] = useState<SkuConfig>(createEmptySkuConfig());
  const [showDeleteQuoteModal, setShowDeleteQuoteModal] = useState(false);
  const [showPurchaseOrder, setShowPurchaseOrder] = useState(false);

  // Load company settings from localStorage
  const getCompanySettings = (): CompanySettings => {
    const saved = localStorage.getItem(COMPANY_SETTINGS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { companyName: '', contactName: '', email: '', phone: '', address: '', city: '', state: '', zip: '', accountNumber: '', taxId: '', notes: '' };
      }
    }
    return { companyName: '', contactName: '', email: '', phone: '', address: '', city: '', state: '', zip: '', accountNumber: '', taxId: '', notes: '' };
  };

  // Load vendors from localStorage
  const getVendors = (): Vendor[] => {
    const saved = localStorage.getItem(VENDORS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Get selected vendor details
  const getSelectedVendor = (): Vendor | null => {
    if (!order.selectedVendorId) return null;
    const vendors = getVendors();
    return vendors.find(v => v.id === order.selectedVendorId) || null;
  };

  // Notify parent that Add Item was opened (to reset the flag)
  React.useEffect(() => {
    if (initialShowAddItem && onAddItemOpened) {
      onAddItemOpened();
    }
  }, [initialShowAddItem, onAddItemOpened]);

  const openAddItemModal = () => {
    setSkuConfig(createEmptySkuConfig());
    setShowAddItem(true);
  };

  // Calculate grand total
  const grandTotal = useMemo(() => {
    try {
      if (!order.lineItems || !Array.isArray(order.lineItems)) return 0;
      return order.lineItems.reduce((sum, item) => {
        if (!item) return sum;
        const price = typeof item.price === 'number' ? item.price : 0;
        const qty = typeof item.qty === 'number' ? item.qty : 0;
        return sum + (price * qty);
      }, 0);
    } catch (error) {
      console.error('Error calculating grand total:', error);
      return 0;
    }
  }, [order.lineItems]);

  // Check if size is plus size for surcharge
  const checkPlusSize = (size: string): boolean => {
    return ['2XL', '3XL', '4XL'].includes(size);
  };

  // Detect required prep tasks based on line item decoration methods
  const requiredPrepTasks = useMemo(() => {
    const methods = new Set(order.lineItems?.map(item => item.decorationType) || []);
    return {
      needsGangSheet: methods.has('DTF'),
      needsDigitizing: methods.has('Embroidery'),
      needsScreens: methods.has('ScreenPrint')
    };
  }, [order.lineItems]);

  // Check if all required prep tasks are complete
  const allPrepComplete = useMemo(() => {
    const { needsGangSheet, needsDigitizing, needsScreens } = requiredPrepTasks;
    const { prepStatus } = order;

    if (needsGangSheet && !prepStatus.gangSheetCreated) return false;
    if (needsDigitizing && !prepStatus.artworkDigitized) return false;
    if (needsScreens && !prepStatus.screensBurned) return false;
    return true;
  }, [requiredPrepTasks, order.prepStatus]);

  // Add color row
  const addColorRow = () => {
    setSkuConfig(prev => ({
      ...prev,
      colorRows: [...prev.colorRows, createEmptyColorRow()]
    }));
  };

  const removeColorRow = (rowId: string) => {
    setSkuConfig(prev => ({
      ...prev,
      colorRows: prev.colorRows.filter(row => row.id !== rowId)
    }));
  };

  const updateColorName = (rowId: string, color: string) => {
    setSkuConfig(prev => ({
      ...prev,
      colorRows: prev.colorRows.map(row =>
        row.id === rowId ? { ...row, color } : row
      )
    }));
  };

  const updateQuantity = (rowId: string, size: string, qty: number) => {
    // Allow negative quantities for change orders
    setSkuConfig(prev => ({
      ...prev,
      colorRows: prev.colorRows.map(row =>
        row.id === rowId
          ? { ...row, quantities: { ...row.quantities, [size]: qty } }
          : row
      )
    }));
  };

  // Generate line items from SKU config
  const handleAddSkuToOrder = () => {
    const newLineItems: LineItem[] = [];

    skuConfig.colorRows.forEach(colorRow => {
      if (!colorRow.color) return;

      SIZE_OPTIONS.forEach(size => {
        const qty = colorRow.quantities[size];
        if (qty !== 0 && qty !== undefined && qty !== null) { // Allow negative quantities for change orders
          const isPlusSize = checkPlusSize(size);
          const itemData = {
            decorationType: skuConfig.decorationType,
            cost: skuConfig.cost,
            decorationPlacements: skuConfig.decorationPlacements,
            screenPrintColors: skuConfig.screenPrintColors,
            isPlusSize,
            stitchCountTier: skuConfig.stitchCountTier,
            dtfSize: skuConfig.dtfSize
          };
          const unitPrice = calculatePrice(itemData);

          const item: LineItem = {
            id: Math.random().toString(36).substr(2, 9),
            itemNumber: skuConfig.itemNumber,
            name: skuConfig.name || 'Untitled Item',
            color: colorRow.color,
            size,
            qty,
            decorationType: skuConfig.decorationType,
            decorationPlacements: skuConfig.decorationPlacements,
            decorationDescription: skuConfig.decorationDescription || undefined,
            cost: skuConfig.cost,
            price: unitPrice,
            ordered: false,
            received: false,
            decorated: false,
            packed: false,
            screenPrintColors: skuConfig.screenPrintColors,
            isPlusSize,
            stitchCountTier: skuConfig.stitchCountTier,
            dtfSize: skuConfig.dtfSize
          };

          newLineItems.push(item);
        }
      });
    });

    if (newLineItems.length > 0) {
      // Mark items as change orders if order has been moved back to Quote for changes
      const isAddingChangeOrder = order.status === 'Quote' && order.hasChangeOrders;
      const itemsToAdd = newLineItems.map(item => ({
        ...item,
        isChangeOrder: isAddingChangeOrder,
        changeOrderDate: isAddingChangeOrder ? new Date() : undefined
      }));

      // Update order
      onUpdate({
        ...order,
        lineItems: [...(order.lineItems || []), ...itemsToAdd],
        hasChangeOrders: isAddingChangeOrder || order.hasChangeOrders,
        lastChangeOrderDate: isAddingChangeOrder ? new Date() : order.lastChangeOrderDate
      });
    }
    setShowAddItem(false);
  };

  const skuPreview = useMemo(() => {
    let totalQty = 0;
    let totalPrice = 0;

    skuConfig.colorRows.forEach(colorRow => {
      SIZE_OPTIONS.forEach(size => {
        const qty = colorRow.quantities[size];
        if (qty !== 0 && qty !== undefined && qty !== null) { // Allow negative quantities
          totalQty += qty;
          const isPlusSize = checkPlusSize(size);
          const itemData = {
            decorationType: skuConfig.decorationType,
            cost: skuConfig.cost,
            decorationPlacements: skuConfig.decorationPlacements,
            screenPrintColors: skuConfig.screenPrintColors,
            isPlusSize,
            stitchCountTier: skuConfig.stitchCountTier,
            dtfSize: skuConfig.dtfSize
          };
          totalPrice += calculatePrice(itemData) * qty;
        }
      });
    });

    return { totalQty, totalPrice };
  }, [skuConfig]);

  const removeItem = (id: string) => {
    onUpdate({ ...order, lineItems: order.lineItems?.filter(li => li.id !== id) || [] });
  };

  // Bulk actions
  const markAllOrdered = () => {
    const items = order.lineItems?.map(li => ({ ...li, ordered: true, orderedAt: new Date() })) || [];
    onUpdate({ ...order, lineItems: items });
  };

  const markAllReceived = () => {
    const items = order.lineItems?.map(li => ({ ...li, received: true, receivedAt: new Date() })) || [];
    onUpdate({ ...order, lineItems: items });
  };

  const markAllProductionComplete = () => {
    const items = order.lineItems?.map(li => ({
      ...li,
      decorated: true,
      packed: true,
      decoratedAt: new Date(),
      packedAt: new Date()
    })) || [];
    onUpdate({ ...order, lineItems: items });
  };

  const toggleItemOrdered = (id: string) => {
    const items = order.lineItems?.map(li =>
      li.id === id ? { ...li, ordered: !li.ordered, orderedAt: !li.ordered ? new Date() : undefined } : li
    ) || [];
    onUpdate({ ...order, lineItems: items });
  };

  const toggleItemReceived = (id: string) => {
    const items = order.lineItems?.map(li =>
      li.id === id ? { ...li, received: !li.received, receivedAt: !li.received ? new Date() : undefined } : li
    ) || [];
    onUpdate({ ...order, lineItems: items });
  };

  const toggleItemDecorated = (id: string) => {
    const items = order.lineItems?.map(li =>
      li.id === id ? { ...li, decorated: !li.decorated, decoratedAt: !li.decorated ? new Date() : undefined } : li
    ) || [];
    onUpdate({ ...order, lineItems: items });
  };

  const toggleItemPacked = (id: string) => {
    const item = order.lineItems?.find(li => li.id === id);
    if (item && !item.decorated && !item.packed) return; // Can't pack if not decorated
    const items = order.lineItems?.map(li =>
      li.id === id ? { ...li, packed: !li.packed, packedAt: !li.packed ? new Date() : undefined } : li
    ) || [];
    onUpdate({ ...order, lineItems: items });
  };

  const moveNext = (nextStatus: Order['status'], updates: Partial<Order> = {}) => {
    onUpdate({ ...order, status: nextStatus, updatedAt: new Date(), ...updates });
  };

  // Move to previous stage
  const movePrevious = () => {
    const currentIndex = ORDER_STAGES.indexOf(order.status as OrderStatus);
    if (currentIndex > 0) {
      const previousStage = ORDER_STAGES[currentIndex - 1];
      onUpdate({ ...order, status: previousStage, updatedAt: new Date() });
    }
  };

  // Get the previous stage name for display
  const getPreviousStageName = (): string | null => {
    const currentIndex = ORDER_STAGES.indexOf(order.status as OrderStatus);
    if (currentIndex > 0) {
      return ORDER_STAGES[currentIndex - 1];
    }
    return null;
  };

  const previousStage = getPreviousStageName();

  // Gatekeepers
  const allOrdered = (order.lineItems?.length || 0) > 0 && order.lineItems?.every(li => li.ordered);
  const allReceived = (order.lineItems?.length || 0) > 0 && order.lineItems?.every(li => li.received);
  const allProductionComplete = (order.lineItems?.length || 0) > 0 && order.lineItems?.every(li => li.decorated && li.packed);
  const fulfillmentReady = order.fulfillment.shippingLabelPrinted || order.fulfillment.customerPickedUp;
  const invoiceComplete = order.invoiceStatus?.invoiceCreated && order.invoiceStatus?.invoiceSent;
  const closeoutComplete = order.closeoutChecklist.filesSaved &&
                          order.closeoutChecklist.canvaArchived &&
                          order.closeoutChecklist.summaryUploaded;

  // Validation: check if at least one color is entered
  const hasValidColor = skuConfig.colorRows.some(row => row.color.trim() !== '');

  // Decoration-specific validation
  const decorationValid = (() => {
    if (!skuConfig.decorationType) return false;
    if (skuConfig.decorationType === 'ScreenPrint' && skuConfig.screenPrintColors < 1) return false;
    if (skuConfig.decorationType === 'DTF' && !skuConfig.dtfSize) return false;
    if (skuConfig.decorationType === 'Embroidery' && !skuConfig.stitchCountTier) return false;
    return true;
  })();

  const canAddSkuToOrder = skuConfig.itemNumber &&
    skuConfig.name &&
    skuConfig.decorationType &&
    skuConfig.decorationPlacements > 0 &&
    hasValidColor &&
    decorationValid &&
    skuPreview.totalQty > 0;

  // Get decoration type badge color
  const getDecorationBadgeClass = (type: ProductionMethod) => {
    switch (type) {
      case 'ScreenPrint': return 'bg-purple-100 text-purple-700';
      case 'Embroidery': return 'bg-amber-100 text-amber-700';
      case 'DTF': return 'bg-cyan-100 text-cyan-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getDecorationLabel = (type: ProductionMethod) => {
    switch (type) {
      case 'ScreenPrint': return 'Screen Print';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[700px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{order.customer}</h2>
              {order.rushOrder && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">RUSH</span>
              )}
              {STAGE_NUMBER[order.status] > 3 && order.artStatus === 'Pending' && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">ART PENDING</span>
              )}
            </div>
            <p className="text-slate-500 font-medium">{order.orderNumber} | {order.projectName}</p>

            {/* Contact Info & PO */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
              {order.customerEmail && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Mail size={14} className="text-slate-400" />
                  {order.customerEmail}
                </span>
              )}
              {order.customerPhone && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Phone size={14} className="text-slate-400" />
                  {order.customerPhone}
                </span>
              )}
              {order.poNumbers?.primary && (
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <FileText size={14} className="text-amber-500" />
                  PO: {order.poNumbers.primary}
                </span>
              )}
            </div>

            {/* Change Order Status */}
            {order.hasChangeOrders && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-bold text-orange-600 uppercase mb-1">Change Orders Included</p>
                  <p className="text-xs text-orange-700">
                    {lineItemsData.changeOrders.length} change order item{lineItemsData.changeOrders.length !== 1 ? 's' : ''} added {formatChangeOrderDate(order.lastChangeOrderDate)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* Stage 0: Lead */}
        {order.status === 'Lead' && (
          <div className="space-y-6">
            {/* Art Info Panel */}
            <ArtInfoPanel order={order} />

            <div className="flex items-center gap-3">
              <Target className="text-emerald-600" size={24} />
              <div>
                <h3 className="text-xl font-bold text-slate-900">Lead Information</h3>
                <p className="text-slate-500 text-sm">Capture initial inquiry details for sales funnel tracking.</p>
              </div>
            </div>

            {/* Lead Temperature Indicator */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200">
              <ThermometerSun size={32} className={
                order.leadInfo?.temperature === 'Hot' ? 'text-red-500' :
                order.leadInfo?.temperature === 'Warm' ? 'text-amber-500' : 'text-blue-500'
              } />
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">Lead Temperature</p>
                <div className="flex gap-2 mt-1">
                  {(['Hot', 'Warm', 'Cold'] as LeadTemperature[]).map(temp => (
                    <button
                      key={temp}
                      onClick={() => onUpdate({
                        ...order,
                        leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), temperature: temp }
                      })}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                        order.leadInfo?.temperature === temp
                          ? temp === 'Hot' ? 'bg-red-500 text-white' :
                            temp === 'Warm' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {temp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lead Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Source */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 font-bold">Lead Source</label>
                <select
                  value={order.leadInfo?.source || 'Website'}
                  onChange={(e) => onUpdate({
                    ...order,
                    leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), source: e.target.value as LeadSource }
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Trade Show">Trade Show</option>
                  <option value="Email Campaign">Email Campaign</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Estimated Quantity */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 font-bold">Est. Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={order.leadInfo?.estimatedQuantity || 0}
                  onChange={(e) => onUpdate({
                    ...order,
                    leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), estimatedQuantity: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Estimated Value */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 font-bold">Est. Value ($)</label>
                <input
                  type="number"
                  min="0"
                  value={order.leadInfo?.estimatedValue || 0}
                  onChange={(e) => onUpdate({
                    ...order,
                    leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), estimatedValue: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Event/Need-by Date */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 font-bold">Event/Need-by Date</label>
                <input
                  type="date"
                  value={order.leadInfo?.eventDate || ''}
                  onChange={(e) => onUpdate({
                    ...order,
                    leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), eventDate: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Follow-up Date */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 font-bold">Follow-up Date</label>
                <input
                  type="date"
                  value={order.leadInfo?.followUpDate || ''}
                  onChange={(e) => onUpdate({
                    ...order,
                    leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), followUpDate: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Decision Maker */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 font-bold">Decision Maker</label>
                <input
                  type="text"
                  placeholder="Who makes the decision?"
                  value={order.leadInfo?.decisionMaker || ''}
                  onChange={(e) => onUpdate({
                    ...order,
                    leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), decisionMaker: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Product Interest */}
            <div className="space-y-2">
              <label className="text-xs uppercase text-slate-500 font-bold">Product Interest</label>
              <input
                type="text"
                placeholder="What products are they interested in? (e.g., T-shirts, hoodies, hats)"
                value={order.leadInfo?.productInterest || ''}
                onChange={(e) => onUpdate({
                  ...order,
                  leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), productInterest: e.target.value }
                })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Decoration Interest */}
            <div className="space-y-2">
              <label className="text-xs uppercase text-slate-500 font-bold">Decoration Method Interest</label>
              <div className="flex gap-2">
                {(['ScreenPrint', 'Embroidery', 'DTF', 'Other', null] as (ProductionMethod | null)[]).map(method => (
                  <button
                    key={method || 'unknown'}
                    onClick={() => onUpdate({
                      ...order,
                      leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), decorationInterest: method }
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      order.leadInfo?.decorationInterest === method
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {method === 'ScreenPrint' ? 'Screen Print' : method === null ? 'Unknown' : method}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <label className="text-xs uppercase text-slate-500 font-bold">Budget Range</label>
              <input
                type="text"
                placeholder="e.g., $500 - $1,000"
                value={order.leadInfo?.budget || ''}
                onChange={(e) => onUpdate({
                  ...order,
                  leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), budget: e.target.value }
                })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Competitor Quoted */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="competitorQuoted"
                checked={order.leadInfo?.competitorQuoted || false}
                onChange={(e) => onUpdate({
                  ...order,
                  leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), competitorQuoted: e.target.checked }
                })}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="competitorQuoted" className="text-sm text-slate-700">Competitor has also quoted this customer</label>
            </div>

            {/* Contact Notes */}
            <div className="space-y-2">
              <label className="text-xs uppercase text-slate-500 font-bold">Contact Notes</label>
              <textarea
                placeholder="Notes from conversations, special requirements, concerns..."
                rows={4}
                value={order.leadInfo?.contactNotes || ''}
                onChange={(e) => onUpdate({
                  ...order,
                  leadInfo: { ...(order.leadInfo || DEFAULT_LEAD_INFO), contactNotes: e.target.value }
                })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Lead Summary Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-emerald-800 mb-3">Lead Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-emerald-700">{order.leadInfo?.estimatedQuantity || 0}</p>
                  <p className="text-xs text-emerald-600">Est. Units</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-700">${(order.leadInfo?.estimatedValue || 0).toLocaleString()}</p>
                  <p className="text-xs text-emerald-600">Est. Value</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-700">
                    {order.leadInfo?.contactedAt ? Math.floor((Date.now() - new Date(order.leadInfo.contactedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                  </p>
                  <p className="text-xs text-emerald-600">Days in Pipeline</p>
                </div>
              </div>
            </div>

            {/* Convert to Quote Action */}
            <button
              onClick={() => moveNext('Quote', {
                dueDate: order.leadInfo?.eventDate || ''
              })}
              className="w-full py-4 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Convert to Quote →
            </button>
            <p className="text-xs text-slate-400 text-center">
              Lead info will be preserved and available throughout the order process
            </p>

            {/* Mark Lead as Dead Opportunity Button */}
            {onDeleteQuote && (
              <button
                onClick={() => setShowDeleteQuoteModal(true)}
                className="w-full mt-4 py-3 text-slate-600 border-2 border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Mark as Dead Opportunity
              </button>
            )}

            {/* Dead Opportunity Confirmation Modal for Leads */}
            {showDeleteQuoteModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900">Move Lead to Dead Opportunities</h3>
                    <p className="text-slate-500 text-sm mt-1">This lead will be archived but the full record will be kept</p>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-700 text-sm">
                        <span className="font-bold">Lead:</span> {order.orderNumber}
                      </p>
                      <p className="text-slate-600 text-sm mt-1">
                        <span className="font-bold">Customer:</span> {order.customer}
                        {order.customerEmail && <span className="block text-xs mt-1">{order.customerEmail}</span>}
                        {order.customerPhone && <span className="block text-xs">{order.customerPhone}</span>}
                      </p>
                      {order.leadInfo?.estimatedValue && (
                        <p className="text-slate-500 text-xs mt-2">
                          Est. Value: ${order.leadInfo.estimatedValue.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onDeleteQuote(order.id, false);
                        setShowDeleteQuoteModal(false);
                        onClose();
                      }}
                      className="w-full p-4 border-2 border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-left"
                    >
                      <p className="font-bold text-red-800">Move to Dead Opportunities</p>
                      <p className="text-red-600 text-sm">Archive this lead - can be recovered later if needed</p>
                    </button>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <button
                      onClick={() => setShowDeleteQuoteModal(false)}
                      className="w-full py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 1: Quote */}
        {order.status === 'Quote' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-600" size={24} />
              <div>
                <h3 className="text-xl font-bold text-slate-900">Quote Builder</h3>
                <p className="text-slate-500 text-sm">Add line items with complete product and decoration details.</p>
              </div>
            </div>

            {/* Art Info Panel */}
            <ArtInfoPanel order={order} />

            {/* Artwork Input Section for Quote Stage */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Image className="text-purple-600" size={20} />
                <h4 className="font-bold text-purple-900">Artwork Information</h4>
                <span className="text-xs text-purple-500 ml-auto">Optional - can be added later</span>
              </div>

              <div className="space-y-4">
                {/* Artwork Location URL */}
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    <Link size={14} className="inline mr-1" />
                    Artwork Location URL
                  </label>
                  <input
                    type="url"
                    value={order.artConfirmation?.originalArtworkUrl || ''}
                    onChange={(e) => onUpdate({
                      ...order,
                      artConfirmation: {
                        ...order.artConfirmation,
                        originalArtworkUrl: e.target.value
                      }
                    })}
                    placeholder="https://drive.google.com/... or Dropbox link"
                    className="w-full px-4 py-2.5 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white placeholder:text-purple-300"
                  />
                  <p className="text-xs text-purple-400 mt-1">Link to customer's artwork files (Google Drive, Dropbox, etc.)</p>
                </div>

                {/* Art Notes */}
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    <MessageSquare size={14} className="inline mr-1" />
                    Art Notes
                  </label>
                  <textarea
                    value={order.artConfirmation?.designerNotes || ''}
                    onChange={(e) => onUpdate({
                      ...order,
                      artConfirmation: {
                        ...order.artConfirmation,
                        designerNotes: e.target.value
                      }
                    })}
                    placeholder="Notes about the artwork, special instructions, color requirements..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white placeholder:text-purple-300 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[650px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="px-3 py-3">Item #</th>
                      <th className="px-3 py-3">Description</th>
                      <th className="px-3 py-3">Color</th>
                      <th className="px-3 py-3">Size</th>
                      <th className="px-3 py-3 text-center">Qty</th>
                      <th className="px-3 py-3">Decoration</th>
                      {!isProduction && <th className="px-3 py-3 text-right">Price</th>}
                      {!isProduction && <th className="px-3 py-3 text-right">Total</th>}
                      <th className="px-3 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Original Order Items */}
                    {lineItemsData.original.length > 0 && (
                      <>
                        {lineItemsData.hasChangeOrders && (
                          <tr className="bg-blue-50">
                            <td colSpan={9} className="px-3 py-2">
                              <span className="text-xs font-bold text-blue-900 uppercase">
                                Original Order Items
                              </span>
                            </td>
                          </tr>
                        )}
                        {lineItemsData.original.map(item => (
                          <tr key={item.id} className="text-sm hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.itemNumber || '-'}</td>
                            <td className="px-3 py-3 font-medium text-slate-900">{item.name}</td>
                            <td className="px-3 py-3 text-slate-600">{item.color || '-'}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                                checkPlusSize(item.size) ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.size || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-slate-900">{item.qty}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold w-fit ${getDecorationBadgeClass(item.decorationType)}`}>
                                  {getDecorationLabel(item.decorationType)}
                                </span>
                                <span className="text-xs text-slate-400">{item.decorationPlacements} placement(s)</span>
                              </div>
                            </td>
                            {!isProduction && <td className="px-3 py-3 text-right text-slate-600">${item.price.toFixed(2)}</td>}
                            {!isProduction && (
                              <td className="px-3 py-3 text-right font-bold text-slate-900">
                                ${(item.price * item.qty).toFixed(2)}
                              </td>
                            )}
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Change Order Items */}
                    {lineItemsData.changeOrders.length > 0 && (
                      <>
                        <tr className="bg-orange-50 border-t-2 border-orange-200">
                          <td colSpan={9} className="px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-orange-900 uppercase flex items-center gap-2">
                                <span className="inline-flex px-2 py-1 bg-orange-600 text-white rounded text-xs font-bold">
                                  CHANGE ORDER
                                </span>
                                Items Added {formatChangeOrderDate(order.lastChangeOrderDate)}
                              </span>
                              <span className="text-xs text-orange-700">
                                {lineItemsData.changeOrders.length} item{lineItemsData.changeOrders.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {lineItemsData.changeOrders.map(item => (
                          <tr key={item.id} className="text-sm bg-orange-50 hover:bg-orange-100 transition-colors">
                            <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.itemNumber || '-'}</td>
                            <td className="px-3 py-3 font-medium text-slate-900">{item.name}</td>
                            <td className="px-3 py-3 text-slate-600">{item.color || '-'}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                                checkPlusSize(item.size) ? 'bg-orange-200 text-orange-800' : 'bg-orange-200 text-orange-700'
                              }`}>
                                {item.size || '-'}
                              </span>
                            </td>
                            <td className={`px-3 py-3 text-center font-bold ${
                              item.qty < 0 ? 'text-red-600' : 'text-slate-900'
                            }`}>
                              {item.qty > 0 ? '+' : ''}{item.qty}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold w-fit ${getDecorationBadgeClass(item.decorationType)}`}>
                                  {getDecorationLabel(item.decorationType)}
                                </span>
                                <span className="text-xs text-slate-400">{item.decorationPlacements} placement(s)</span>
                              </div>
                            </td>
                            {!isProduction && <td className="px-3 py-3 text-right text-slate-600">${item.price.toFixed(2)}</td>}
                            {!isProduction && (
                              <td className={`px-3 py-3 text-right font-bold ${
                                item.qty < 0 ? 'text-red-600' : 'text-slate-900'
                              }`}>
                                {item.qty > 0 ? '+' : ''}${(item.price * item.qty).toFixed(2)}
                              </td>
                            )}
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-orange-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Empty State */}
                    {(!order.lineItems || order.lineItems.length === 0) && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                          No items added yet. Click below to add your first item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Section - Hide for Production users */}
              {!isProduction && (order.lineItems?.length || 0) > 0 && (
                <div className="bg-slate-50 border-t border-slate-200">
                  {/* Breakdown if has change orders */}
                  {lineItemsData.hasChangeOrders && (
                    <div className="px-4 py-3 space-y-2 border-b border-slate-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Original Order:</span>
                        <span className="font-bold text-slate-900">
                          {lineItemsData.originalTotals.qty} items • ${lineItemsData.originalTotals.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-600">Change Order:</span>
                        <span className={`font-bold ${
                          lineItemsData.changeOrderTotals.value < 0 ? 'text-red-600' : 'text-orange-700'
                        }`}>
                          {lineItemsData.changeOrderTotals.qty > 0 ? '+' : ''}
                          {lineItemsData.changeOrderTotals.qty} items •
                          {lineItemsData.changeOrderTotals.value > 0 ? '+' : ''}
                          ${lineItemsData.changeOrderTotals.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                        <span className="font-bold text-slate-700">Net Total:</span>
                        <span className="font-bold text-blue-700">
                          {lineItemsData.netTotals.qty} items • ${lineItemsData.netTotals.value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="px-4 py-4 flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold text-slate-500 uppercase">Grand Total</span>
                      <span className="text-xs text-slate-400 ml-2">
                        ({lineItemsData.netTotals.count} line item{lineItemsData.netTotals.count !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="text-2xl font-black text-slate-900">
                      ${lineItemsData.netTotals.value.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={openAddItemModal}
              className="w-full border-2 border-dashed border-slate-300 text-slate-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <Plus size={20} /> Add Line Item
            </button>

            <div className="flex gap-3">
              {previousStage && (
                <button
                  onClick={movePrevious}
                  className="flex items-center gap-2 px-4 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={18} /> Move Back One Stage
                </button>
              )}
              <button
                disabled={(order.lineItems?.length || 0) === 0}
                onClick={() => moveNext('Approval')}
                className="flex-1 bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
              >
                Convert Quote to Order
              </button>
            </div>

            {/* Mark as Dead Opportunity Button */}
            {onDeleteQuote && (
              <button
                onClick={() => setShowDeleteQuoteModal(true)}
                className="w-full mt-4 py-3 text-slate-600 border-2 border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Mark as Dead Opportunity
              </button>
            )}

            {/* Dead Opportunity Confirmation Modal */}
            {showDeleteQuoteModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900">Move to Dead Opportunities</h3>
                    <p className="text-slate-500 text-sm mt-1">This quote will be archived but the full record will be kept</p>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-700 text-sm">
                        <span className="font-bold">Quote:</span> {order.orderNumber}
                      </p>
                      <p className="text-slate-600 text-sm mt-1">
                        <span className="font-bold">Customer:</span> {order.customer}
                        {order.customerEmail && <span className="block text-xs mt-1">{order.customerEmail}</span>}
                        {order.customerPhone && <span className="block text-xs">{order.customerPhone}</span>}
                      </p>
                      {order.lineItems && order.lineItems.length > 0 && (
                        <p className="text-slate-500 text-xs mt-2">
                          {order.lineItems.length} line item{order.lineItems.length !== 1 ? 's' : ''} • ${grandTotal.toFixed(2)} total
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onDeleteQuote(order.id, true);
                        setShowDeleteQuoteModal(false);
                        onClose();
                      }}
                      className="w-full p-4 border-2 border-emerald-200 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors text-left"
                    >
                      <p className="font-bold text-emerald-800">Archive & Create New Lead</p>
                      <p className="text-emerald-600 text-sm">Move to Dead Opportunities and create a new Lead with customer info for future follow-up</p>
                    </button>

                    <button
                      onClick={() => {
                        onDeleteQuote(order.id, false);
                        setShowDeleteQuoteModal(false);
                        onClose();
                      }}
                      className="w-full p-4 border-2 border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-colors text-left"
                    >
                      <p className="font-bold text-slate-800">Archive Only</p>
                      <p className="text-slate-600 text-sm">Move to Dead Opportunities and keep the full quote record</p>
                    </button>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <button
                      onClick={() => setShowDeleteQuoteModal(false)}
                      className="w-full py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 2: Approval */}
        {order.status === 'Approval' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl text-center">
              <h3 className="text-blue-900 font-bold text-lg mb-2">Quote Pending Approval</h3>
              {!isProduction && <p className="text-blue-700 mb-2">Grand Total: <span className="font-bold">${grandTotal.toFixed(2)}</span></p>}
              <p className="text-blue-600 text-sm mb-6">{order.lineItems?.length || 0} line items</p>
              <div className="flex gap-3 justify-center">
                {previousStage && (
                  <button
                    onClick={movePrevious}
                    className="flex items-center gap-2 px-4 py-3 border-2 border-blue-200 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                  >
                    <ArrowLeft size={18} /> Move Back One Stage
                  </button>
                )}
                <button
                  onClick={() => moveNext('Art Confirmation')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
                >
                  Quote Approved - Continue
                </button>
              </div>
            </div>

            {/* Art Info Panel */}
            <ArtInfoPanel order={order} />
          </div>
        )}

        {/* Stage 3: Art Confirmation */}
        {order.status === 'Art Confirmation' && (
          <ArtConfirmationPanel order={order} onUpdate={onUpdate} moveNext={moveNext} />
        )}

        {/* Stage 4: Inventory Order */}
        {order.status === 'Inventory Order' && (
          <div className="space-y-6">
            {/* Approved Artwork Panel */}
            <ArtInfoPanel order={order} />

            {/* Change Order Notice */}
            {lineItemsData.hasChangeOrders && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-orange-900">Change Order Items Included</p>
                    <p className="text-sm text-orange-700 mt-1">
                      This order includes {lineItemsData.changeOrders.length} change order item{lineItemsData.changeOrders.length !== 1 ? 's' : ''}.
                      All items must be ordered and confirmed before advancing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Vendor Selection Section */}
            {(() => {
              const vendors = getVendors();
              const selectedVendor = getSelectedVendor();
              return (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck size={18} className="text-purple-600" />
                    <h4 className="font-bold text-purple-800">Select Vendor</h4>
                  </div>
                  {vendors.length === 0 ? (
                    <p className="text-purple-600 text-sm">
                      No vendors configured. Add vendors in Settings → Company Info.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={order.selectedVendorId || ''}
                        onChange={(e) => onUpdate({
                          ...order,
                          selectedVendorId: e.target.value || undefined
                        })}
                        className="w-full border border-purple-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                      >
                        <option value="">-- Select a vendor --</option>
                        {vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name} (Acct: {vendor.accountNumber})
                          </option>
                        ))}
                      </select>
                      {selectedVendor && (
                        <div className="bg-white rounded-lg p-3 border border-purple-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-purple-900">{selectedVendor.name}</p>
                              <p className="text-sm text-purple-700">Account: <span className="font-mono font-bold">{selectedVendor.accountNumber}</span></p>
                            </div>
                          </div>
                          {(selectedVendor.contactName || selectedVendor.phone || selectedVendor.email) && (
                            <div className="mt-2 pt-2 border-t border-purple-100 text-sm text-purple-600">
                              {selectedVendor.contactName && <span>{selectedVendor.contactName}</span>}
                              {selectedVendor.phone && <span> • {selectedVendor.phone}</span>}
                              {selectedVendor.email && <span> • {selectedVendor.email}</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* PO Numbers Section */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={18} className="text-amber-600" />
                <h4 className="font-bold text-amber-800">Purchase Order Numbers</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Primary PO *</label>
                  <input
                    type="text"
                    placeholder="PO-12345"
                    value={order.poNumbers?.primary || ''}
                    onChange={(e) => onUpdate({
                      ...order,
                      poNumbers: { ...order.poNumbers, primary: e.target.value }
                    })}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  />
                  <p className="text-xs text-amber-600 mt-1">Travels with order</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Secondary PO</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={order.poNumbers?.secondary || ''}
                    onChange={(e) => onUpdate({
                      ...order,
                      poNumbers: { ...order.poNumbers, secondary: e.target.value }
                    })}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Tertiary PO</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={order.poNumbers?.tertiary || ''}
                    onChange={(e) => onUpdate({
                      ...order,
                      poNumbers: { ...order.poNumbers, tertiary: e.target.value }
                    })}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} className="text-slate-400" />
                Purchasing Checklist
              </h3>
              <button onClick={markAllOrdered} className="text-blue-600 text-sm font-bold hover:underline">
                Mark All as Ordered
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-3 py-3">Item # / Description</th>
                    <th className="px-3 py-3">Color / Size</th>
                    <th className="px-3 py-3 text-center">Qty</th>
                    <th className="px-3 py-3 text-center">Ordered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Original Items */}
                  {lineItemsData.original.map(item => (
                    <tr key={item.id} className="text-sm hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <p className="font-bold text-slate-900">{item.itemNumber}</p>
                        <p className="text-xs text-slate-600">{item.name}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-slate-700">{item.color}</p>
                        <p className="text-xs text-slate-500">{item.size}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-bold text-slate-900">{item.qty}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleItemOrdered(item.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors mx-auto ${
                            item.ordered ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                          }`}
                        >
                          {item.ordered && <Check size={14} strokeWidth={4} />}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Change Order Items */}
                  {lineItemsData.changeOrders.length > 0 && (
                    <>
                      <tr className="bg-orange-50">
                        <td colSpan={4} className="px-3 py-2">
                          <span className="text-xs font-bold text-orange-900 uppercase">Change Order Items</span>
                        </td>
                      </tr>
                      {lineItemsData.changeOrders.map(item => (
                        <tr key={item.id} className="text-sm bg-orange-50 hover:bg-orange-100">
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-900">{item.itemNumber}</p>
                            <p className="text-xs text-slate-600">{item.name}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-slate-700">{item.color}</p>
                            <p className="text-xs text-slate-500">{item.size}</p>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-bold ${item.qty < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                              {item.qty > 0 ? '+' : ''}{item.qty}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => toggleItemOrdered(item.id)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors mx-auto ${
                                item.ordered ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                              }`}
                            >
                              {item.ordered && <Check size={14} strokeWidth={4} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Totals Row */}
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <td colSpan={2} className="px-3 py-3 text-right">TOTAL:</td>
                    <td className="px-3 py-3 text-center text-blue-700">
                      {lineItemsData.netTotals.qty}
                    </td>
                    <td className="px-3 py-3 text-center text-green-700">
                      {order.lineItems?.filter(i => i.ordered).length || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Generate Purchase Order Button */}
            <button
              onClick={() => setShowPurchaseOrder(true)}
              className="w-full py-3 border-2 border-blue-200 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Printer size={18} /> Generate Vendor Purchase Order
            </button>

            <div className="flex gap-3">
              {previousStage && (
                <button
                  onClick={movePrevious}
                  className="flex items-center gap-2 px-4 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={18} /> Move Back One Stage
                </button>
              )}
              <button
                disabled={!allOrdered}
                onClick={() => moveNext('Production Prep')}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                  allOrdered ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Move to Prep
              </button>
            </div>
          </div>
        )}

        {/* Stage 5: Production Prep */}
        {order.status === 'Production Prep' && (
          <div className="space-y-6">
            {/* Approved Artwork Panel */}
            <ArtInfoPanel order={order} />

            <div className="flex items-center gap-3">
              <Settings className="text-blue-600" size={24} />
              <div>
                <h3 className="text-xl font-bold text-slate-900">Production Prep</h3>
                <p className="text-slate-500 text-sm">Complete all preparation tasks before production begins.</p>
              </div>
            </div>

            <div className="space-y-3">
              {requiredPrepTasks.needsGangSheet && (
                <div
                  onClick={() => onUpdate({
                    ...order,
                    prepStatus: { ...order.prepStatus, gangSheetCreated: !order.prepStatus.gangSheetCreated }
                  })}
                  className="flex items-center justify-between p-4 bg-cyan-50 rounded-xl border border-cyan-100 cursor-pointer hover:bg-cyan-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Printer size={20} className="text-cyan-600" />
                    <div>
                      <p className="font-bold text-slate-900">Gang Sheet Created</p>
                      <p className="text-xs text-slate-500">Required for DTF items</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                    order.prepStatus.gangSheetCreated ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                  }`}>
                    {order.prepStatus.gangSheetCreated && <Check size={14} strokeWidth={4} />}
                  </div>
                </div>
              )}

              {requiredPrepTasks.needsDigitizing && (
                <div
                  onClick={() => onUpdate({
                    ...order,
                    prepStatus: { ...order.prepStatus, artworkDigitized: !order.prepStatus.artworkDigitized }
                  })}
                  className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Layers size={20} className="text-amber-600" />
                    <div>
                      <p className="font-bold text-slate-900">Artwork Digitized</p>
                      <p className="text-xs text-slate-500">Required for Embroidery items</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                    order.prepStatus.artworkDigitized ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                  }`}>
                    {order.prepStatus.artworkDigitized && <Check size={14} strokeWidth={4} />}
                  </div>
                </div>
              )}

              {requiredPrepTasks.needsScreens && (
                <div
                  onClick={() => onUpdate({
                    ...order,
                    prepStatus: { ...order.prepStatus, screensBurned: !order.prepStatus.screensBurned }
                  })}
                  className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package size={20} className="text-purple-600" />
                    <div>
                      <p className="font-bold text-slate-900">Screens Burned</p>
                      <p className="text-xs text-slate-500">Required for Screen Print items</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                    order.prepStatus.screensBurned ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                  }`}>
                    {order.prepStatus.screensBurned && <Check size={14} strokeWidth={4} />}
                  </div>
                </div>
              )}

              {!requiredPrepTasks.needsGangSheet && !requiredPrepTasks.needsDigitizing && !requiredPrepTasks.needsScreens && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-slate-500">
                  No preparation tasks required for this order.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {previousStage && (
                <button
                  onClick={movePrevious}
                  className="flex items-center gap-2 px-4 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={18} /> Move Back One Stage
                </button>
              )}
              <button
                disabled={!allPrepComplete}
                onClick={() => moveNext('Inventory Received')}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                  allPrepComplete ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Prep Complete
              </button>
            </div>
          </div>
        )}

        {/* Stage 6: Inventory Received */}
        {order.status === 'Inventory Received' && (
          <div className="space-y-6">
            {/* Approved Artwork Panel */}
            <ArtInfoPanel order={order} />

            {/* Change Order Notice */}
            {lineItemsData.hasChangeOrders && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-orange-900">Change Order Items Included</p>
                    <p className="text-sm text-orange-700 mt-1">
                      This order includes {lineItemsData.changeOrders.length} change order item{lineItemsData.changeOrders.length !== 1 ? 's' : ''}.
                      All items must be received and confirmed before advancing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Package size={20} className="text-slate-400" />
                Receiving Checklist
              </h3>
              <button onClick={markAllReceived} className="text-blue-600 text-sm font-bold hover:underline">
                Mark All Received
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-3 py-3">Item # / Description</th>
                    <th className="px-3 py-3">Color / Size</th>
                    <th className="px-3 py-3 text-center">Qty</th>
                    <th className="px-3 py-3 text-center">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Original Items */}
                  {lineItemsData.original.map(item => (
                    <tr key={item.id} className="text-sm hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <p className="font-bold text-slate-900">{item.itemNumber}</p>
                        <p className="text-xs text-slate-600">{item.name}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-slate-700">{item.color}</p>
                        <p className="text-xs text-slate-500">{item.size}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-bold text-slate-900">{item.qty}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleItemReceived(item.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors mx-auto ${
                            item.received ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                          }`}
                        >
                          {item.received && <Check size={14} strokeWidth={4} />}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Change Order Items */}
                  {lineItemsData.changeOrders.length > 0 && (
                    <>
                      <tr className="bg-orange-50">
                        <td colSpan={4} className="px-3 py-2">
                          <span className="text-xs font-bold text-orange-900 uppercase">Change Order Items</span>
                        </td>
                      </tr>
                      {lineItemsData.changeOrders.map(item => (
                        <tr key={item.id} className="text-sm bg-orange-50 hover:bg-orange-100">
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-900">{item.itemNumber}</p>
                            <p className="text-xs text-slate-600">{item.name}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-slate-700">{item.color}</p>
                            <p className="text-xs text-slate-500">{item.size}</p>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-bold ${item.qty < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                              {item.qty > 0 ? '+' : ''}{item.qty}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => toggleItemReceived(item.id)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors mx-auto ${
                                item.received ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                              }`}
                            >
                              {item.received && <Check size={14} strokeWidth={4} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Totals Row */}
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <td colSpan={2} className="px-3 py-3 text-right">TOTAL:</td>
                    <td className="px-3 py-3 text-center text-blue-700">
                      {lineItemsData.netTotals.qty}
                    </td>
                    <td className="px-3 py-3 text-center text-green-700">
                      {order.lineItems?.filter(i => i.received).length || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              {previousStage && (
                <button
                  onClick={movePrevious}
                  className="flex items-center gap-2 px-4 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={18} /> Move Back One Stage
                </button>
              )}
              <button
                disabled={!allReceived}
                onClick={() => moveNext('Production')}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                  allReceived ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Goods Verified - Start Production
              </button>
            </div>
          </div>
        )}

        {/* Stage 7: Production (Run Sheet) */}
        {order.status === 'Production' && (() => {
          const hasChangeOrders = lineItemsData.hasChangeOrders;
          const isChangeOrderInProduction = false; // No longer using separate change order entities

          return (
            <div className="space-y-6">
              {/* Approved Artwork Panel */}
              <ArtInfoPanel order={order} />

              {/* Change Order Items Notice */}
              {lineItemsData.hasChangeOrders && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-orange-900">Change Order Items Included</p>
                      <p className="text-sm text-orange-700 mt-1">
                        This order includes {lineItemsData.changeOrders.length} change order item{lineItemsData.changeOrders.length !== 1 ? 's' : ''} added {formatChangeOrderDate(order.lastChangeOrderDate)}.
                        All items must be decorated and packed before advancing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ClipboardCheck size={20} className="text-slate-400" />
                  Run Sheet {lineItemsData.hasChangeOrders && '(Includes Change Orders)'}
                </h3>
                <button onClick={markAllProductionComplete} className="text-blue-600 text-sm font-bold hover:underline">
                  Mark All Complete
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="px-4 py-3">Item # / Description</th>
                      <th className="px-4 py-3">Color / Size</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-center">Decorated</th>
                      <th className="px-4 py-3 text-center">Packed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Original Items */}
                    {lineItemsData.original.map(item => (
                      <tr key={item.id} className="text-sm hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{item.itemNumber}</p>
                          <p className="text-xs text-slate-600">{item.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700">{item.color}</p>
                          <p className="text-xs text-slate-500">{item.size}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-slate-900">{item.qty}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleItemDecorated(item.id)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors mx-auto ${
                              item.decorated ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                            }`}
                          >
                            {item.decorated && <Check size={16} strokeWidth={4} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleItemPacked(item.id)}
                            disabled={!item.decorated}
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors mx-auto ${
                              item.packed ? 'bg-green-500 border-green-500 text-white' :
                              item.decorated ? 'border-slate-300 hover:border-green-400' : 'border-slate-200 cursor-not-allowed opacity-50'
                            }`}
                          >
                            {item.packed && <Check size={16} strokeWidth={4} />}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Change Order Items */}
                    {lineItemsData.changeOrders.length > 0 && (
                      <>
                        <tr className="bg-orange-50">
                          <td colSpan={5} className="px-4 py-2">
                            <span className="text-xs font-bold text-orange-900 uppercase">Change Order Items</span>
                          </td>
                        </tr>
                        {lineItemsData.changeOrders.map(item => (
                          <tr key={item.id} className="text-sm bg-orange-50 hover:bg-orange-100">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{item.itemNumber}</p>
                              <p className="text-xs text-slate-600">{item.name}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-slate-700">{item.color}</p>
                              <p className="text-xs text-slate-500">{item.size}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-bold ${item.qty < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                {item.qty > 0 ? '+' : ''}{item.qty}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleItemDecorated(item.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors mx-auto ${
                                  item.decorated ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                                }`}
                              >
                                {item.decorated && <Check size={16} strokeWidth={4} />}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleItemPacked(item.id)}
                                disabled={!item.decorated}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors mx-auto ${
                                  item.packed ? 'bg-green-500 border-green-500 text-white' :
                                  item.decorated ? 'border-slate-300 hover:border-green-400' : 'border-slate-200 cursor-not-allowed opacity-50'
                                }`}
                              >
                                {item.packed && <Check size={16} strokeWidth={4} />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Totals Row */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={2} className="px-4 py-3 text-right">TOTAL:</td>
                      <td className="px-4 py-3 text-center text-blue-900 text-lg">
                        {lineItemsData.netTotals.qty}
                      </td>
                      <td className="px-4 py-3 text-center text-green-700">
                        {order.lineItems?.filter(i => i.decorated).length || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-green-700">
                        {order.lineItems?.filter(i => i.packed).length || 0}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-sm text-slate-500 text-center">
                {order.lineItems?.filter(i => i.decorated).length || 0} of {lineItemsData.netTotals.count} items decorated ({lineItemsData.netTotals.qty} total units) | {' '}
                {order.lineItems?.filter(i => i.packed).length || 0} of {lineItemsData.netTotals.count} items packed
              </div>

              <div className="flex gap-3">
                {previousStage && (
                  <button
                    onClick={movePrevious}
                    className="flex items-center gap-2 px-4 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                  >
                    <ArrowLeft size={18} /> Move Back One Stage
                  </button>
                )}
                <button
                  disabled={!allProductionComplete}
                  onClick={() => moveNext('Fulfillment')}
                  className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                    allProductionComplete ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Job Complete
                </button>
              </div>
            </div>
          );
        })()}

        {/* Stage 8: Fulfillment */}
        {order.status === 'Fulfillment' && (
          <div className="space-y-6">
            {/* Approved Artwork Panel */}
            <ArtInfoPanel order={order} />

            <div className="flex items-center gap-3">
              <Truck className="text-blue-600" size={24} />
              <div>
                <h3 className="text-xl font-bold text-slate-900">Fulfillment</h3>
                <p className="text-slate-500 text-sm">Complete shipping or customer pickup.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => onUpdate({
                  ...order,
                  fulfillment: {
                    ...order.fulfillment,
                    shippingLabelPrinted: !order.fulfillment.shippingLabelPrinted,
                    method: !order.fulfillment.shippingLabelPrinted ? 'Shipped' : order.fulfillment.method
                  }
                })}
                className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Printer size={20} className="text-blue-600" />
                  <div>
                    <p className="font-bold text-slate-900">Shipping Label Printed</p>
                    <p className="text-xs text-slate-500">Order will be shipped to customer</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  order.fulfillment.shippingLabelPrinted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                }`}>
                  {order.fulfillment.shippingLabelPrinted && <Check size={14} strokeWidth={4} />}
                </div>
              </div>

              <div className="text-center text-slate-400 text-sm">- OR -</div>

              <div
                onClick={() => onUpdate({
                  ...order,
                  fulfillment: {
                    ...order.fulfillment,
                    customerPickedUp: !order.fulfillment.customerPickedUp,
                    method: !order.fulfillment.customerPickedUp ? 'PickedUp' : order.fulfillment.method
                  }
                })}
                className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100 cursor-pointer hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Package size={20} className="text-green-600" />
                  <div>
                    <p className="font-bold text-slate-900">Customer Picked Up</p>
                    <p className="text-xs text-slate-500">Customer collected order in person</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  order.fulfillment.customerPickedUp ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                }`}>
                  {order.fulfillment.customerPickedUp && <Check size={14} strokeWidth={4} />}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {previousStage && (
                <button
                  onClick={movePrevious}
                  className="flex items-center gap-2 px-4 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={18} /> Move Back One Stage
                </button>
              )}
              <button
                disabled={!fulfillmentReady}
                onClick={() => moveNext('Invoice', { fulfillment: { ...order.fulfillment, fulfilledAt: new Date() } })}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                  fulfillmentReady ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Order Fulfilled
              </button>
            </div>
          </div>
        )}

        {/* Stage 9: Invoice */}
        {order.status === 'Invoice' && (
          <div className="space-y-6">
            {/* Approved Artwork Panel */}
            <ArtInfoPanel order={order} />

            <div className="flex items-center gap-3">
              <DollarSign className="text-green-600" size={24} />
              <div>
                <h3 className="text-xl font-bold text-slate-900">Invoice</h3>
                <p className="text-slate-500 text-sm">Create and send invoice to customer, track payment.</p>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invoice Number</label>
                  <input
                    type="text"
                    placeholder="INV-2024-001"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    value={order.invoiceStatus?.invoiceNumber || ''}
                    onChange={(e) => onUpdate({
                      ...order,
                      invoiceStatus: { ...order.invoiceStatus, invoiceNumber: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invoice Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={grandTotal.toFixed(2)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 pl-7 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      value={order.invoiceStatus?.invoiceAmount || ''}
                      onChange={(e) => onUpdate({
                        ...order,
                        invoiceStatus: { ...order.invoiceStatus, invoiceAmount: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Checklist */}
            <div className="space-y-3">
              <div
                onClick={() => onUpdate({
                  ...order,
                  invoiceStatus: { ...order.invoiceStatus, invoiceCreated: !order.invoiceStatus?.invoiceCreated }
                })}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <p className="font-bold text-slate-900">Invoice Created</p>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  order.invoiceStatus?.invoiceCreated ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                }`}>
                  {order.invoiceStatus?.invoiceCreated && <Check size={14} strokeWidth={4} />}
                </div>
              </div>

              <div
                onClick={() => onUpdate({
                  ...order,
                  invoiceStatus: {
                    ...order.invoiceStatus,
                    invoiceSent: !order.invoiceStatus?.invoiceSent,
                    invoiceSentAt: !order.invoiceStatus?.invoiceSent ? new Date() : order.invoiceStatus?.invoiceSentAt
                  }
                })}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div>
                  <p className="font-bold text-slate-900">Invoice Sent to Customer</p>
                  {order.invoiceStatus?.invoiceSentAt && (
                    <p className="text-xs text-slate-500">Sent: {new Date(order.invoiceStatus.invoiceSentAt).toLocaleString()}</p>
                  )}
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  order.invoiceStatus?.invoiceSent ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                }`}>
                  {order.invoiceStatus?.invoiceSent && <Check size={14} strokeWidth={4} />}
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <DollarSign size={16} /> Payment Tracking
              </h4>
              <div
                onClick={() => onUpdate({
                  ...order,
                  invoiceStatus: {
                    ...order.invoiceStatus,
                    paymentReceived: !order.invoiceStatus?.paymentReceived,
                    paymentReceivedAt: !order.invoiceStatus?.paymentReceived ? new Date() : order.invoiceStatus?.paymentReceivedAt
                  }
                })}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  order.invoiceStatus?.paymentReceived
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div>
                  <p className={`font-bold ${order.invoiceStatus?.paymentReceived ? 'text-green-800' : 'text-amber-800'}`}>
                    {order.invoiceStatus?.paymentReceived ? 'Payment Received' : 'Awaiting Payment'}
                  </p>
                  {order.invoiceStatus?.paymentReceivedAt && (
                    <p className="text-xs text-green-600">Received: {new Date(order.invoiceStatus.paymentReceivedAt).toLocaleString()}</p>
                  )}
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  order.invoiceStatus?.paymentReceived ? 'bg-green-500 border-green-500 text-white' : 'border-amber-400'
                }`}>
                  {order.invoiceStatus?.paymentReceived && <Check size={14} strokeWidth={4} />}
                </div>
              </div>

              {order.invoiceStatus?.paymentReceived && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                      value={order.invoiceStatus?.paymentMethod || ''}
                      onChange={(e) => onUpdate({
                        ...order,
                        invoiceStatus: { ...order.invoiceStatus, paymentMethod: e.target.value as any }
                      })}
                    >
                      <option value="">Select...</option>
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="ACH">ACH/Bank Transfer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Notes</label>
                    <input
                      type="text"
                      placeholder="Check #, confirmation, etc."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={order.invoiceStatus?.paymentNotes || ''}
                      onChange={(e) => onUpdate({
                        ...order,
                        invoiceStatus: { ...order.invoiceStatus, paymentNotes: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {previousStage && (
                <button
                  onClick={movePrevious}
                  className="flex items-center gap-2 px-4 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={18} /> Move Back One Stage
                </button>
              )}
              <button
                disabled={!invoiceComplete}
                onClick={() => onUpdate({ ...order, status: 'Closeout' })}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                  invoiceComplete ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Continue to Closeout
              </button>
            </div>
          </div>
        )}

        {/* Stage 10: Closeout */}
        {order.status === 'Closeout' && (
          <div className="space-y-6">
            {/* Approved Artwork Panel */}
            <ArtInfoPanel order={order} />

            <div className="flex items-center gap-3">
              <Archive className="text-purple-600" size={24} />
              <div>
                <h3 className="text-xl font-bold text-slate-900">Project Closeout</h3>
                <p className="text-slate-500 text-sm">Archive project files and complete administrative tasks.</p>
              </div>
            </div>

            {/* Payment Status Summary */}
            <div className={`p-4 rounded-xl border-2 ${
              order.invoiceStatus?.paymentReceived
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign size={20} className={order.invoiceStatus?.paymentReceived ? 'text-green-600' : 'text-amber-600'} />
                  <div>
                    <p className={`font-bold ${order.invoiceStatus?.paymentReceived ? 'text-green-800' : 'text-amber-800'}`}>
                      {order.invoiceStatus?.paymentReceived ? 'Payment Received' : 'Payment Pending'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Invoice: {order.invoiceStatus?.invoiceNumber || 'N/A'} •
                      ${(order.invoiceStatus?.invoiceAmount || grandTotal).toFixed(2)}
                    </p>
                  </div>
                </div>
                {order.invoiceStatus?.paymentReceived && (
                  <Check size={20} className="text-green-600" />
                )}
              </div>
            </div>

            {/* Closeout Checklist */}
            <div className="space-y-3">
              <div
                onClick={() => onUpdate({
                  ...order,
                  closeoutChecklist: { ...order.closeoutChecklist, filesSaved: !order.closeoutChecklist.filesSaved }
                })}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <p className="font-bold text-slate-900">Project Files Saved to Customer Folder</p>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  order.closeoutChecklist.filesSaved ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                }`}>
                  {order.closeoutChecklist.filesSaved && <Check size={14} strokeWidth={4} />}
                </div>
              </div>

              <div
                onClick={() => onUpdate({
                  ...order,
                  closeoutChecklist: { ...order.closeoutChecklist, canvaArchived: !order.closeoutChecklist.canvaArchived }
                })}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <p className="font-bold text-slate-900">Canva Proof Archived</p>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  order.closeoutChecklist.canvaArchived ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                }`}>
                  {order.closeoutChecklist.canvaArchived && <Check size={14} strokeWidth={4} />}
                </div>
              </div>

              <div
                onClick={() => onUpdate({
                  ...order,
                  closeoutChecklist: { ...order.closeoutChecklist, summaryUploaded: !order.closeoutChecklist.summaryUploaded }
                })}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <p className="font-bold text-slate-900">Order Summary Uploaded</p>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  order.closeoutChecklist.summaryUploaded ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                }`}>
                  {order.closeoutChecklist.summaryUploaded && <Check size={14} strokeWidth={4} />}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {previousStage && (
                <button
                  onClick={movePrevious}
                  className="flex items-center gap-2 px-4 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={18} /> Move Back One Stage
                </button>
              )}
              <button
                disabled={!closeoutComplete}
                onClick={() => onUpdate({
                  ...order,
                  status: 'Closed',
                  closedAt: new Date(),
                  closedReason: 'Completed',
                  reopenedFrom: 'Closeout'
                })}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                  closeoutComplete ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Close & Archive Order
              </button>
            </div>
          </div>
        )}

        {/* Closed Order View */}
        {order.status === 'Closed' && (
          <ClosedOrderPanel order={order} onUpdate={onUpdate} />
        )}
      </div>

      {/* Purchase Order Modal */}
      {showPurchaseOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Vendor Purchase Order</h3>
                <p className="text-slate-500 text-sm">Order #{order.orderNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  onClick={() => setShowPurchaseOrder(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8" id="purchase-order-content">
              {(() => {
                const company = getCompanySettings();
                const selectedVendor = getSelectedVendor();
                // Use selected vendor's account number, fallback to company account number
                const accountNumber = selectedVendor?.accountNumber || company.accountNumber;
                return (
                  <div className="space-y-6 max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="text-center border-b-2 border-slate-900 pb-4">
                      <h1 className="text-2xl font-black text-slate-900">{company.companyName || 'Your Company Name'}</h1>
                      <p className="text-slate-600">PURCHASE ORDER</p>
                    </div>

                    {/* Vendor Info Banner */}
                    {selectedVendor && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-xs font-bold text-purple-600 uppercase">Ordering From</p>
                        <p className="font-bold text-purple-900">{selectedVendor.name}</p>
                        {selectedVendor.contactName && <p className="text-sm text-purple-700">Contact: {selectedVendor.contactName}</p>}
                        {selectedVendor.phone && <p className="text-sm text-purple-700">Phone: {selectedVendor.phone}</p>}
                        {selectedVendor.email && <p className="text-sm text-purple-700">Email: {selectedVendor.email}</p>}
                      </div>
                    )}

                    {/* Company & Order Info */}
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Ship To:</h4>
                        <div className="text-sm text-slate-700">
                          {/* Company Name */}
                          <p className="font-bold text-lg">{company.companyName || 'Company Name'}</p>

                          {/* Vendor Account Number */}
                          {accountNumber && (
                            <p className="font-bold text-slate-900 mt-1">
                              Account #: <span className="font-mono">{accountNumber}</span>
                            </p>
                          )}

                          {/* Shipping Address */}
                          <div className="mt-2">
                            {company.address && <p>{company.address}</p>}
                            {(company.city || company.state || company.zip) && (
                              <p>{company.city}{company.city && company.state && ', '}{company.state} {company.zip}</p>
                            )}
                          </div>

                          {/* Contact Info */}
                          {(company.phone || company.email) && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              {company.phone && <p>Phone: {company.phone}</p>}
                              {company.email && <p>Email: {company.email}</p>}
                              {company.contactName && <p>Attn: {company.contactName}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-slate-100 rounded-lg p-4 inline-block text-left">
                          <p className="text-xs font-bold text-slate-500 uppercase">PO Number</p>
                          <p className="text-lg font-bold text-slate-900">{order.poNumbers?.primary || order.orderNumber}</p>
                          <p className="text-xs font-bold text-slate-500 uppercase mt-2">Date</p>
                          <p className="text-sm text-slate-700">{new Date().toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-xs font-bold text-blue-600 uppercase">Project</p>
                      <p className="font-bold text-blue-900">{order.projectName}</p>
                      <p className="text-sm text-blue-700">Customer: {order.customer}</p>
                    </div>

                    {/* Line Items Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800 text-white">
                          <tr>
                            <th className="text-left px-4 py-3 font-bold">Item #</th>
                            <th className="text-left px-4 py-3 font-bold">Description</th>
                            <th className="text-left px-4 py-3 font-bold">Color</th>
                            <th className="text-left px-4 py-3 font-bold">Size</th>
                            <th className="text-right px-4 py-3 font-bold">Qty</th>
                            {!isProduction && <th className="text-right px-4 py-3 font-bold">Unit Cost</th>}
                            {!isProduction && <th className="text-right px-4 py-3 font-bold">Total</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {order.lineItems?.map((item, idx) => (
                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-4 py-3 font-mono">{item.itemNumber}</td>
                              <td className="px-4 py-3">{item.name}</td>
                              <td className="px-4 py-3">{item.color}</td>
                              <td className="px-4 py-3">{item.size}</td>
                              <td className="px-4 py-3 text-right font-bold">{item.qty}</td>
                              {!isProduction && <td className="px-4 py-3 text-right">${item.cost?.toFixed(2) || '0.00'}</td>}
                              {!isProduction && <td className="px-4 py-3 text-right font-bold">${((item.cost || 0) * item.qty).toFixed(2)}</td>}
                            </tr>
                          ))}
                        </tbody>
                        {!isProduction && (
                          <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-right font-bold">Total Items:</td>
                              <td className="px-4 py-3 text-right font-bold">
                                {order.lineItems?.reduce((sum, item) => sum + item.qty, 0) || 0}
                              </td>
                              <td className="px-4 py-3 text-right font-bold">Subtotal:</td>
                              <td className="px-4 py-3 text-right font-bold">
                                ${order.lineItems?.reduce((sum, item) => sum + ((item.cost || 0) * item.qty), 0).toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {/* Notes */}
                    {company.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-xs font-bold text-amber-600 uppercase mb-1">Special Instructions</p>
                        <p className="text-sm text-amber-800">{company.notes}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="border-t-2 border-slate-200 pt-4 text-center text-xs text-slate-500">
                      <p>Generated by Pallet Production Management System</p>
                      <p>Generated on {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-xl font-bold">Add Item to Quote</h3>
            <button
              onClick={() => setShowAddItem(false)}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase">
                  <Package size={16} />
                  Product & Decoration Setup
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Item Number / SKU *
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. NL6210"
                      value={skuConfig.itemNumber}
                      onChange={e => setSkuConfig({...skuConfig, itemNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Garment Name *
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Next Level 6210 Tee"
                      value={skuConfig.name}
                      onChange={e => setSkuConfig({...skuConfig, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Wholesale Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full border border-slate-200 p-3 pl-7 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                        value={skuConfig.cost || ''}
                        onChange={e => setSkuConfig({...skuConfig, cost: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Decoration Type *
                    </label>
                    <select
                      required
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={skuConfig.decorationType}
                      onChange={e => setSkuConfig({...skuConfig, decorationType: e.target.value as ProductionMethod})}
                    >
                      <option value="">-- Select Type --</option>
                      {PRODUCTION_METHOD_OPTIONS.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Placements *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0"
                      value={skuConfig.decorationPlacements || ''}
                      onChange={e => setSkuConfig({...skuConfig, decorationPlacements: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                {skuConfig.decorationType === 'ScreenPrint' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Number of Ink Colors *
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        placeholder="0"
                        value={skuConfig.screenPrintColors || ''}
                        onChange={e => setSkuConfig({...skuConfig, screenPrintColors: parseInt(e.target.value) || 0})}
                      />
                      <p className="text-xs text-slate-400 mt-1">+$1.00 per color | +$2.00 per placement | +$2.00 for 2XL+</p>
                    </div>
                  </div>
                )}

                {skuConfig.decorationType === 'DTF' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Transfer Size *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSkuConfig({...skuConfig, dtfSize: 'Standard'})}
                        className={`p-3 rounded-xl border-2 font-medium transition-all ${
                          skuConfig.dtfSize === 'Standard'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        Standard (+$5.00)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSkuConfig({...skuConfig, dtfSize: 'Large'})}
                        className={`p-3 rounded-xl border-2 font-medium transition-all ${
                          skuConfig.dtfSize === 'Large'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        Large (+$8.00)
                      </button>
                    </div>
                  </div>
                )}

                {skuConfig.decorationType === 'Embroidery' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Stitch Count *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['<8k', '8k-12k', '12k+'] as const).map(tier => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setSkuConfig({...skuConfig, stitchCountTier: tier})}
                          className={`p-3 rounded-xl border-2 font-medium transition-all text-center ${
                            skuConfig.stitchCountTier === tier
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold">{tier}</div>
                          <div className="text-xs opacity-70">
                            +${tier === '<8k' ? '0' : tier === '8k-12k' ? '10' : '20'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {skuConfig.decorationType === 'Other' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Description of Decoration
                    </label>
                    <textarea
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      rows={2}
                      placeholder="Describe the decoration method..."
                      value={skuConfig.decorationDescription}
                      onChange={e => setSkuConfig({...skuConfig, decorationDescription: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 space-y-4 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm uppercase">
                    <Palette size={16} />
                    Colors & Quantities
                  </div>
                  <button
                    type="button"
                    onClick={addColorRow}
                    className="flex items-center gap-1 text-blue-600 text-sm font-bold hover:text-blue-700 transition-colors"
                  >
                    <Plus size={16} /> Add Color
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase">
                        <th className="text-left py-2 px-2 w-32">Color *</th>
                        {SIZE_OPTIONS.map(size => (
                          <th key={size} className={`text-center py-2 px-1 min-w-[50px] ${
                            checkPlusSize(size) ? 'text-orange-600' : ''
                          }`}>
                            {size}
                            {checkPlusSize(size) && <span className="block text-[10px]">+$2</span>}
                          </th>
                        ))}
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {skuConfig.colorRows.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 px-2">
                            <input
                              required
                              type="text"
                              className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="e.g. Navy"
                              value={row.color}
                              onChange={e => updateColorName(row.id, e.target.value)}
                            />
                          </td>
                          {SIZE_OPTIONS.map(size => (
                            <td key={size} className="py-2 px-1">
                              <input
                                type="number"
                                min="0"
                                className="w-full border border-slate-200 p-2 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                value={row.quantities[size] || ''}
                                placeholder="0"
                                onChange={e => updateQuantity(row.id, size, parseInt(e.target.value) || 0)}
                              />
                            </td>
                          ))}
                          <td className="py-2 px-1">
                            {skuConfig.colorRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeColorRow(row.id)}
                                className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-bold text-green-700">Order Preview</span>
                    <p className="text-xs text-green-600">{skuPreview.totalQty} items across all colors/sizes</p>
                  </div>
                  <span className="text-2xl font-black text-green-700">${skuPreview.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-white space-y-3">
            <button
              onClick={handleAddSkuToOrder}
              disabled={!canAddSkuToOrder}
              className="w-full bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors"
            >
              Add to Order
            </button>
            <button
              onClick={() => {
                handleAddSkuToOrder();
                setSkuConfig(createEmptySkuConfig());
                setShowAddItem(true);
              }}
              disabled={!canAddSkuToOrder}
              className="w-full bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Add to Order & Add Another SKU
            </button>
            <p className="text-xs text-slate-400 text-center">Fields marked with * are required</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSlideOver;
