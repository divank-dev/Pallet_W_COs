import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X, Download, FileText, Shield, Book, Database,
  ChevronRight, Lock, Key, Users, Server, AlertTriangle,
  CheckCircle, Clock, Settings, HardDrive, FileDown, Layers,
  ArrowRight, GitBranch, Box, Upload, UserPlus, Trash2, Edit2,
  LogOut, Building2, FileSpreadsheet, Truck, Printer, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Order, SCHEMA_DEFINITION, User, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../src/lib/supabase';
import { findUsersWithMissingAuthLink, repairAllMissingAuthLinks, runAuthDiagnostics, checkSetupStatus } from '../src/lib/authService';
import {
  loadCompanySettings, saveCompanySettings as saveCompanySettingsDb,
  loadVendors, createVendor, updateVendor as updateVendorDb, deleteVendor as deleteVendorDb,
  type CompanySettings, type Vendor
} from '../src/lib/settingsService';

interface SettingsPageProps {
  orders: Order[];
  onClose: () => void;
  onDeleteOrders?: (orderIds: string[]) => void;
}

type SettingsTab = 'data' | 'schema' | 'sop' | 'specification' | 'security' | 'company';

// Re-export Vendor type for other components
export type { Vendor };

const MAX_VENDORS = 20;

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  accountNumber: '',
  taxId: '',
  notes: ''
};

const SettingsPage: React.FC<SettingsPageProps> = ({ orders, onClose, onDeleteOrders }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('data');
  const { currentUser, orgHierarchy, addUser, updateUser, deleteUser, permanentlyDeleteUser, importUsersFromCSV, logout, permissions } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Order deletion state (Admin only)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // User management state
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showUserDeleteConfirm, setShowUserDeleteConfirm] = useState(false);
  const [userDeleteConfirmText, setUserDeleteConfirmText] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    displayName: '',
    email: '',
    role: 'Sales' as UserRole,
    department: '',
    reportsTo: ''
  });
  const [isUserActionLoading, setIsUserActionLoading] = useState(false);
  const [userActionError, setUserActionError] = useState<string | null>(null);

  // Password change state (for admin resetting any user)
  const [passwordChangeUser, setPasswordChangeUser] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');

  // Self-service password change state (for changing own password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [myPasswordSuccess, setMyPasswordSuccess] = useState(false);
  const [myPasswordError, setMyPasswordError] = useState('');

  // Auth repair state (Admin only - for fixing multi-terminal login issues)
  const [authRepairLoading, setAuthRepairLoading] = useState(false);
  const [authRepairResult, setAuthRepairResult] = useState<{
    repaired: string[];
    failed: string[];
    errors: string[];
  } | null>(null);
  const [usersWithMissingAuth, setUsersWithMissingAuth] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [authDiagnostics, setAuthDiagnostics] = useState<any>(null);

  // Company settings state (Supabase-backed with localStorage cache)
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [companySaveSuccess, setCompanySaveSuccess] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(true);

  // Vendor management state (Supabase-backed with localStorage cache)
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Load company settings and vendors from Supabase on mount
  useEffect(() => {
    loadCompanySettings()
      .then(settings => setCompanySettings(settings))
      .catch(err => console.error('Failed to load company settings:', err))
      .finally(() => setCompanyLoading(false));

    loadVendors()
      .then(v => setVendors(v))
      .catch(err => console.error('Failed to load vendors:', err))
      .finally(() => setVendorsLoading(false));
  }, []);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendor, setNewVendor] = useState<Omit<Vendor, 'id'>>({
    name: '',
    accountNumber: '',
    contactName: '',
    phone: '',
    email: '',
    website: '',
    notes: ''
  });
  const [vendorSaveSuccess, setVendorSaveSuccess] = useState(false);

  // Save company settings to Supabase
  const saveCompanySettings = async () => {
    try {
      await saveCompanySettingsDb(companySettings);
      setCompanySaveSuccess(true);
      setTimeout(() => setCompanySaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save company settings:', err);
    }
  };

  // Vendor management functions
  const addVendor = async () => {
    if (!newVendor.name || !newVendor.accountNumber) return;
    if (vendors.length >= MAX_VENDORS) return;

    try {
      const created = await createVendor(newVendor);
      setVendors(prev => [...prev, created]);
      setVendorSaveSuccess(true);
      setTimeout(() => setVendorSaveSuccess(false), 3000);
      setNewVendor({ name: '', accountNumber: '', contactName: '', phone: '', email: '', website: '', notes: '' });
      setShowAddVendor(false);
    } catch (err) {
      console.error('Failed to add vendor:', err);
    }
  };

  const updateVendor = async () => {
    if (!editingVendor) return;
    try {
      const updated = await updateVendorDb(editingVendor);
      setVendors(prev => prev.map(v => v.id === updated.id ? updated : v));
      setVendorSaveSuccess(true);
      setTimeout(() => setVendorSaveSuccess(false), 3000);
      setEditingVendor(null);
    } catch (err) {
      console.error('Failed to update vendor:', err);
    }
  };

  const deleteVendor = async (vendorId: string) => {
    try {
      await deleteVendorDb(vendorId);
      setVendors(prev => prev.filter(v => v.id !== vendorId));
      setVendorSaveSuccess(true);
      setTimeout(() => setVendorSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to delete vendor:', err);
    }
  };

  // Handle admin sending password reset email to a user
  const handlePasswordChange = async () => {
    setPasswordChangeError('');
    setPasswordChangeSuccess(false);

    if (!passwordChangeUser) {
      setPasswordChangeError('Please select a user');
      return;
    }

    const user = orgHierarchy.users.find(u => u.id === passwordChangeUser);
    if (!user || !user.email) {
      setPasswordChangeError('User does not have an email address');
      return;
    }

    setIsUserActionLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        setPasswordChangeError(error.message);
        return;
      }

      setPasswordChangeSuccess(true);
      setPasswordChangeUser('');

      // Clear success message after 5 seconds
      setTimeout(() => setPasswordChangeSuccess(false), 5000);
    } catch (error) {
      setPasswordChangeError('Failed to send password reset email');
    } finally {
      setIsUserActionLoading(false);
    }
  };

  // Handle user changing their own password
  const handleMyPasswordChange = async () => {
    setMyPasswordError('');
    setMyPasswordSuccess(false);

    if (!myNewPassword) {
      setMyPasswordError('Please enter a new password');
      return;
    }
    if (myNewPassword.length < 8) {
      setMyPasswordError('Password must be at least 8 characters');
      return;
    }
    if (myNewPassword !== myConfirmPassword) {
      setMyPasswordError('New passwords do not match');
      return;
    }

    setIsUserActionLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: myNewPassword
      });

      if (error) {
        setMyPasswordError(error.message);
        return;
      }

      setMyPasswordSuccess(true);
      setCurrentPassword('');
      setMyNewPassword('');
      setMyConfirmPassword('');

      // Clear success message after 3 seconds
      setTimeout(() => setMyPasswordSuccess(false), 3000);
    } catch (error) {
      setMyPasswordError('Failed to update password');
    } finally {
      setIsUserActionLoading(false);
    }
  };

  const handleAddUser = async () => {
    setUserActionError(null);

    if (!newUser.username || !newUser.password || !newUser.displayName || !newUser.email) {
      setUserActionError('Username, password, display name, and email are required');
      return;
    }

    if (newUser.password.length < 8) {
      setUserActionError('Password must be at least 8 characters');
      return;
    }

    setIsUserActionLoading(true);
    try {
      await addUser(
        {
          username: newUser.username,
          displayName: newUser.displayName,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department || undefined,
          reportsTo: newUser.reportsTo || undefined,
          isActive: true
        },
        newUser.password
      );
      setNewUser({ username: '', password: '', displayName: '', email: '', role: 'Sales', department: '', reportsTo: '' });
      setShowAddUser(false);
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsUserActionLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setIsUserActionLoading(true);
      try {
        const results = await importUsersFromCSV(content);
        setImportResults(results);
      } catch (error) {
        setUserActionError(error instanceof Error ? error.message : 'Failed to import users');
      } finally {
        setIsUserActionLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadCSVTemplate = () => {
    const template = 'username,password,displayName,email,role,department,reportsTo\njsmith,Password123!,John Smith,john@company.com,Sales,Sales Team,\nmjones,Password456!,Mary Jones,mary@company.com,Production,Production Floor,jsmith';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'company' as SettingsTab, label: 'Company Info', icon: Building2 },
    { id: 'data' as SettingsTab, label: 'Data & Backups', icon: Database },
    { id: 'schema' as SettingsTab, label: 'Data Schema', icon: GitBranch },
    { id: 'sop' as SettingsTab, label: 'SOP & Training', icon: Book },
    { id: 'specification' as SettingsTab, label: 'Specification', icon: FileText },
    { id: 'security' as SettingsTab, label: 'Security', icon: Shield },
  ];

  // Database Statistics
  const dbStats = useMemo(() => {
    const activeOrders = orders.filter(o => !o.isArchived);
    const archivedOrders = orders.filter(o => o.isArchived);
    const totalLineItems = orders.reduce((sum, o) => sum + o.lineItems.length, 0);
    const uniqueCustomers = new Set(orders.map(o => o.customer)).size;
    const totalRevenue = orders.reduce((sum, o) =>
      sum + o.lineItems.reduce((s, li) => s + (li.price * li.qty), 0), 0
    );
    const totalCost = orders.reduce((sum, o) =>
      sum + o.lineItems.reduce((s, li) => s + (li.cost * li.qty), 0), 0
    );

    return {
      totalOrders: orders.length,
      activeOrders: activeOrders.length,
      archivedOrders: archivedOrders.length,
      totalLineItems,
      uniqueCustomers,
      totalRevenue,
      totalCost,
      leadsCount: orders.filter(o => o.status === 'Lead').length,
      quotesCount: orders.filter(o => o.status === 'Quote').length,
      inProductionCount: orders.filter(o => ['Production Prep', 'Inventory Received', 'Production'].includes(o.status)).length
    };
  }, [orders]);

  // Filtered orders for deletion table
  const filteredOrdersForDeletion = useMemo(() => {
    if (!orderSearchQuery.trim()) return orders;
    const query = orderSearchQuery.toLowerCase();
    return orders.filter(o =>
      o.orderNumber.toLowerCase().includes(query) ||
      o.customer.toLowerCase().includes(query) ||
      o.projectName.toLowerCase().includes(query) ||
      o.status.toLowerCase().includes(query)
    );
  }, [orders, orderSearchQuery]);

  // Handle order selection for deletion
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrdersForDeletion.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrdersForDeletion.map(o => o.id)));
    }
  };

  // Handle delete confirmation
  const handleDeleteOrders = () => {
    if (deleteConfirmText !== 'DELETE' || selectedOrderIds.size === 0) return;
    if (onDeleteOrders) {
      onDeleteOrders(Array.from(selectedOrderIds));
    }
    setSelectedOrderIds(new Set());
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  };

  // Data Export Functions
  const exportFullDatabase = () => {
    const exportData = {
      metadata: {
        version: '2.0.0',
        schemaVersion: SCHEMA_DEFINITION.version,
        exportedAt: new Date().toISOString(),
        totalOrders: orders.length,
        totalLineItems: dbStats.totalLineItems,
        totalCustomers: dbStats.uniqueCustomers
      },
      orders: orders,
      schema: SCHEMA_DEFINITION
    };

    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pallet-database-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportOrdersJSON = () => {
    const data = JSON.stringify(orders, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pallet-orders-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAnalyticsCSV = () => {
    const headers = ['Order Number', 'Customer', 'Email', 'Phone', 'Project', 'Status', 'Created', 'Due Date', 'Items', 'Units', 'Total Cost', 'Total Revenue', 'Profit', 'Rush', 'Art Status', 'Is Lead', 'Lead Source', 'Lead Temperature'];
    const rows = orders.map(order => {
      const totalUnits = order.lineItems.reduce((sum, li) => sum + li.qty, 0);
      const totalCost = order.lineItems.reduce((sum, li) => sum + (li.cost * li.qty), 0);
      const totalRevenue = order.lineItems.reduce((sum, li) => sum + (li.price * li.qty), 0);
      return [
        order.orderNumber,
        `"${order.customer}"`,
        order.customerEmail || '',
        order.customerPhone || '',
        `"${order.projectName}"`,
        order.status,
        new Date(order.createdAt).toISOString(),
        order.dueDate,
        order.lineItems.length,
        totalUnits,
        totalCost.toFixed(2),
        totalRevenue.toFixed(2),
        (totalRevenue - totalCost).toFixed(2),
        order.rushOrder ? 'Yes' : 'No',
        order.artStatus,
        order.status === 'Lead' ? 'Yes' : 'No',
        order.leadInfo?.source || '',
        order.leadInfo?.temperature || ''
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pallet-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLineItemsCSV = () => {
    const headers = ['Order Number', 'Customer', 'Status', 'Item Number', 'Name', 'Color', 'Size', 'Qty', 'Decoration', 'Placements', 'Cost', 'Price', 'Line Total', 'Ordered', 'Ordered At', 'Received', 'Received At', 'Decorated', 'Decorated At', 'Packed', 'Packed At'];
    const rows: string[] = [];

    orders.forEach(order => {
      order.lineItems.forEach(li => {
        rows.push([
          order.orderNumber,
          `"${order.customer}"`,
          order.status,
          li.itemNumber,
          `"${li.name}"`,
          li.color,
          li.size,
          li.qty,
          li.decorationType,
          li.decorationPlacements,
          li.cost.toFixed(2),
          li.price.toFixed(2),
          (li.price * li.qty).toFixed(2),
          li.ordered ? 'Yes' : 'No',
          li.orderedAt ? new Date(li.orderedAt).toISOString() : '',
          li.received ? 'Yes' : 'No',
          li.receivedAt ? new Date(li.receivedAt).toISOString() : '',
          li.decorated ? 'Yes' : 'No',
          li.decoratedAt ? new Date(li.decoratedAt).toISOString() : '',
          li.packed ? 'Yes' : 'No',
          li.packedAt ? new Date(li.packedAt).toISOString() : ''
        ].join(','));
      });
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pallet-line-items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSchemaJSON = () => {
    const data = JSON.stringify(SCHEMA_DEFINITION, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pallet-schema-v${SCHEMA_DEFINITION.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Comprehensive Excel Export for System Rebuild
  const exportSystemExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. README / Instructions Sheet
    const readmeData = [
      ['PALLET SYSTEM BACKUP - RESTORE INSTRUCTIONS'],
      [''],
      ['Export Date:', new Date().toISOString()],
      ['Schema Version:', SCHEMA_DEFINITION.version],
      ['Total Orders:', orders.length],
      ['Total Users:', orgHierarchy.users.length],
      [''],
      ['RESTORATION PROCEDURE:'],
      ['1. Import Users sheet first to restore org hierarchy'],
      ['2. Import Orders sheet to restore all order data'],
      ['3. Import LineItems sheet to restore line item details'],
      ['4. Import History sheet to restore audit trail'],
      ['5. Import ArtPlacements sheet to restore art confirmation data'],
      [''],
      ['SHEET DESCRIPTIONS:'],
      ['- Users: All user accounts with roles and departments'],
      ['- Orders: Core order data (one row per order)'],
      ['- LineItems: All line items with order references'],
      ['- History: Audit trail of all status changes'],
      ['- ArtPlacements: Art placement and proof data'],
      ['- Fulfillment: Shipping and delivery information'],
      [''],
      ['NOTES:'],
      ['- Passwords are included for user restoration'],
      ['- Dates are in ISO 8601 format'],
      ['- Boolean values are TRUE/FALSE'],
      ['- Empty cells indicate null/undefined values'],
    ];
    const wsReadme = XLSX.utils.aoa_to_sheet(readmeData);
    wsReadme['!cols'] = [{ wch: 50 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsReadme, 'README');

    // 2. Users Sheet
    const usersData = orgHierarchy.users.map(user => ({
      id: user.id,
      username: user.username,
      password: user.password,
      displayName: user.displayName,
      email: user.email || '',
      role: user.role,
      department: user.department || '',
      reportsTo: user.reportsTo || '',
      isActive: user.isActive,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : '',
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : ''
    }));
    const wsUsers = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Users');

    // 3. Departments Sheet
    const deptData = orgHierarchy.departments.map(dept => ({
      department: dept,
      userCount: orgHierarchy.users.filter(u => u.department === dept && u.isActive).length
    }));
    const wsDepts = XLSX.utils.json_to_sheet(deptData);
    XLSX.utils.book_append_sheet(wb, wsDepts, 'Departments');

    // 4. Orders Sheet (flattened core order data)
    const ordersData = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      customerEmail: order.customerEmail || '',
      customerPhone: order.customerPhone || '',
      projectName: order.projectName,
      status: order.status,
      artStatus: order.artStatus,
      rushOrder: order.rushOrder,
      isArchived: order.isArchived,
      dueDate: order.dueDate,
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : '',
      updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : '',
      // Lead Info
      leadSource: order.leadInfo?.source || '',
      leadTemperature: order.leadInfo?.temperature || '',
      leadNotes: order.leadInfo?.notes || '',
      leadFollowUpDate: order.leadInfo?.followUpDate || '',
      // Prep Status
      gangSheetCreated: order.prepStatus?.gangSheetCreated || false,
      artworkDigitized: order.prepStatus?.artworkDigitized || false,
      screensBurned: order.prepStatus?.screensBurned || false,
      // Invoice Status
      invoiceCreated: order.invoiceStatus?.invoiceCreated || false,
      invoiceSent: order.invoiceStatus?.invoiceSent || false,
      invoicePaid: order.invoiceStatus?.invoicePaid || false,
      invoiceNumber: order.invoiceStatus?.invoiceNumber || '',
      // Closeout
      closeoutFilesSaved: order.closeoutChecklist?.filesSaved || false,
      closeoutCanvaArchived: order.closeoutChecklist?.canvaArchived || false,
      closeoutSummaryUploaded: order.closeoutChecklist?.summaryUploaded || false,
      closedAt: order.closedAt ? new Date(order.closedAt).toISOString() : ''
    }));
    const wsOrders = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');

    // 5. Line Items Sheet
    const lineItemsData: any[] = [];
    orders.forEach(order => {
      order.lineItems.forEach(li => {
        lineItemsData.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customer: order.customer,
          lineItemId: li.id,
          itemNumber: li.itemNumber,
          name: li.name,
          color: li.color,
          size: li.size,
          qty: li.qty,
          cost: li.cost,
          price: li.price,
          decorationType: li.decorationType,
          decorationPlacements: li.decorationPlacements,
          decorationDescription: li.decorationDescription || '',
          screenPrintColors: li.screenPrintColors || 0,
          stitchCountTier: li.stitchCountTier || '',
          dtfSize: li.dtfSize || '',
          ordered: li.ordered || false,
          orderedAt: li.orderedAt ? new Date(li.orderedAt).toISOString() : '',
          received: li.received || false,
          receivedAt: li.receivedAt ? new Date(li.receivedAt).toISOString() : '',
          decorated: li.decorated || false,
          decoratedAt: li.decoratedAt ? new Date(li.decoratedAt).toISOString() : '',
          packed: li.packed || false,
          packedAt: li.packedAt ? new Date(li.packedAt).toISOString() : ''
        });
      });
    });
    const wsLineItems = XLSX.utils.json_to_sheet(lineItemsData);
    XLSX.utils.book_append_sheet(wb, wsLineItems, 'LineItems');

    // 6. History/Audit Trail Sheet
    const historyData: any[] = [];
    orders.forEach(order => {
      order.history.forEach((entry, index) => {
        historyData.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customer: order.customer,
          entryIndex: index,
          timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : '',
          userId: entry.userId || '',
          userName: entry.userName || '',
          action: entry.action,
          previousValue: typeof entry.previousValue === 'object' ? JSON.stringify(entry.previousValue) : String(entry.previousValue || ''),
          newValue: typeof entry.newValue === 'object' ? JSON.stringify(entry.newValue) : String(entry.newValue || ''),
          notes: entry.notes || ''
        });
      });
    });
    const wsHistory = XLSX.utils.json_to_sheet(historyData);
    XLSX.utils.book_append_sheet(wb, wsHistory, 'History');

    // 7. Art Placements Sheet
    const artData: any[] = [];
    orders.forEach(order => {
      if (order.artConfirmation?.placements) {
        order.artConfirmation.placements.forEach(placement => {
          artData.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            customer: order.customer,
            placementId: placement.id,
            location: placement.location,
            width: placement.width,
            height: placement.height,
            colorCount: placement.colorCount,
            description: placement.description || '',
            status: placement.status,
            currentProofVersion: placement.currentProofVersion,
            approvedAt: placement.approvedAt ? new Date(placement.approvedAt).toISOString() : '',
            approvedBy: placement.approvedBy || ''
          });
        });
      }
    });
    const wsArt = XLSX.utils.json_to_sheet(artData.length > 0 ? artData : [{ note: 'No art placements found' }]);
    XLSX.utils.book_append_sheet(wb, wsArt, 'ArtPlacements');

    // 8. Fulfillment Sheet
    const fulfillmentData = orders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      status: order.status,
      shippingMethod: order.fulfillment?.shippingMethod || '',
      trackingNumber: order.fulfillment?.trackingNumber || '',
      shippingLabelPrinted: order.fulfillment?.shippingLabelPrinted || false,
      customerPickedUp: order.fulfillment?.customerPickedUp || false,
      fulfilledAt: order.fulfillment?.fulfilledAt ? new Date(order.fulfillment.fulfilledAt).toISOString() : '',
      deliveryAddress: order.fulfillment?.deliveryAddress || '',
      deliveryNotes: order.fulfillment?.notes || ''
    }));
    const wsFulfillment = XLSX.utils.json_to_sheet(fulfillmentData);
    XLSX.utils.book_append_sheet(wb, wsFulfillment, 'Fulfillment');

    // Generate and download
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pallet-full-backup-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="h-16 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-8 flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <Settings className="text-blue-600 flex-shrink-0" size={24} />
          <h2 className="text-base md:text-xl font-bold text-slate-900 truncate">Settings</h2>
        </div>
        <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 ml-2">
          <X size={24} />
        </button>
      </header>

      {/* Mobile Tab Selector */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium bg-white"
        >
          {tabs.map(tab => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation - Hidden on mobile */}
        <div className="hidden md:block w-56 bg-white border-r border-slate-200 p-4 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={18} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Company Info Tab */}
          {activeTab === 'company' && (
            <div className="space-y-8 max-w-3xl">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Company Information</h3>
                <p className="text-slate-500">Enter your company details for vendor purchase orders and inventory order sheets.</p>
              </div>

              {companySaveSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={20} />
                  <p className="text-green-800 font-medium">Company settings saved successfully!</p>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <Building2 className="text-blue-600" size={24} />
                  <h4 className="text-lg font-bold text-slate-900">Company Details</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Company Name *</label>
                    <input
                      type="text"
                      value={companySettings.companyName}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Your Company Name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Contact Name</label>
                    <input
                      type="text"
                      value={companySettings.contactName}
                      onChange={(e) => setCompanySettings({ ...companySettings, contactName: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Primary Contact"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone</label>
                    <input
                      type="tel"
                      value={companySettings.phone}
                      onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="555-123-4567"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                    <input
                      type="email"
                      value={companySettings.email}
                      onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="orders@yourcompany.com"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <Truck className="text-amber-600" size={24} />
                  <h4 className="text-lg font-bold text-slate-900">Shipping Address</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Street Address</label>
                    <input
                      type="text"
                      value={companySettings.address}
                      onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">City</label>
                    <input
                      type="text"
                      value={companySettings.city}
                      onChange={(e) => setCompanySettings({ ...companySettings, city: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="City"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">State</label>
                      <input
                        type="text"
                        value={companySettings.state}
                        onChange={(e) => setCompanySettings({ ...companySettings, state: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="ST"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ZIP</label>
                      <input
                        type="text"
                        value={companySettings.zip}
                        onChange={(e) => setCompanySettings({ ...companySettings, zip: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <FileSpreadsheet className="text-green-600" size={24} />
                  <h4 className="text-lg font-bold text-slate-900">Vendor Account Information</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Number</label>
                    <input
                      type="text"
                      value={companySettings.accountNumber}
                      onChange={(e) => setCompanySettings({ ...companySettings, accountNumber: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Vendor account number"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tax ID / EIN</label>
                    <input
                      type="text"
                      value={companySettings.taxId}
                      onChange={(e) => setCompanySettings({ ...companySettings, taxId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="XX-XXXXXXX"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Additional Notes for Orders</label>
                    <textarea
                      rows={3}
                      value={companySettings.notes}
                      onChange={(e) => setCompanySettings({ ...companySettings, notes: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Special instructions, preferred shipping method, etc."
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={saveCompanySettings}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
              >
                Save Company Settings
              </button>

              {/* Vendor Management Section */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 mt-8">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Truck className="text-purple-600" size={24} />
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Vendor Management</h4>
                      <p className="text-slate-500 text-sm">Add vendors with account numbers for purchase orders ({vendors.length}/{MAX_VENDORS})</p>
                    </div>
                  </div>
                  {vendors.length < MAX_VENDORS && (
                    <button
                      onClick={() => setShowAddVendor(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2"
                    >
                      <UserPlus size={16} /> Add Vendor
                    </button>
                  )}
                </div>

                {vendorSaveSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={16} />
                    <p className="text-green-800 font-medium text-sm">Vendor saved successfully!</p>
                  </div>
                )}

                {/* Vendor List */}
                {vendors.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Truck size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No vendors added yet</p>
                    <p className="text-sm">Add vendors to use them on purchase orders</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vendors.map(vendor => (
                      <div key={vendor.id} className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h5 className="font-bold text-slate-900">{vendor.name}</h5>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                                Acct: {vendor.accountNumber}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-500 space-x-4">
                              {vendor.contactName && <span>{vendor.contactName}</span>}
                              {vendor.phone && <span>• {vendor.phone}</span>}
                              {vendor.email && <span>• {vendor.email}</span>}
                            </div>
                            {vendor.notes && (
                              <p className="mt-2 text-sm text-slate-600 italic">{vendor.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingVendor(vendor)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deleteVendor(vendor.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Vendor Modal */}
                {showAddVendor && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                      <div className="p-6 border-b border-slate-100">
                        <h3 className="text-xl font-bold text-slate-900">Add New Vendor</h3>
                        <p className="text-slate-500 text-sm">Enter vendor details and account number</p>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vendor Name *</label>
                          <input
                            type="text"
                            value={newVendor.name}
                            onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="e.g., SanMar, Alpha Broder, S&S Activewear"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Number *</label>
                          <input
                            type="text"
                            value={newVendor.accountNumber}
                            onChange={(e) => setNewVendor({ ...newVendor, accountNumber: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Your account number with this vendor"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Contact Name</label>
                            <input
                              type="text"
                              value={newVendor.contactName}
                              onChange={(e) => setNewVendor({ ...newVendor, contactName: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="Rep name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone</label>
                            <input
                              type="tel"
                              value={newVendor.phone}
                              onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="555-123-4567"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                            <input
                              type="email"
                              value={newVendor.email}
                              onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="orders@vendor.com"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Website</label>
                            <input
                              type="text"
                              value={newVendor.website}
                              onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="www.vendor.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notes</label>
                          <textarea
                            rows={2}
                            value={newVendor.notes}
                            onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                            placeholder="Special instructions, minimum orders, etc."
                          />
                        </div>
                      </div>
                      <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                        <button
                          onClick={() => {
                            setShowAddVendor(false);
                            setNewVendor({ name: '', accountNumber: '', contactName: '', phone: '', email: '', website: '', notes: '' });
                          }}
                          className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addVendor}
                          disabled={!newVendor.name || !newVendor.accountNumber}
                          className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Add Vendor
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Vendor Modal */}
                {editingVendor && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                      <div className="p-6 border-b border-slate-100">
                        <h3 className="text-xl font-bold text-slate-900">Edit Vendor</h3>
                        <p className="text-slate-500 text-sm">Update vendor details</p>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vendor Name *</label>
                          <input
                            type="text"
                            value={editingVendor.name}
                            onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Number *</label>
                          <input
                            type="text"
                            value={editingVendor.accountNumber}
                            onChange={(e) => setEditingVendor({ ...editingVendor, accountNumber: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Contact Name</label>
                            <input
                              type="text"
                              value={editingVendor.contactName || ''}
                              onChange={(e) => setEditingVendor({ ...editingVendor, contactName: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone</label>
                            <input
                              type="tel"
                              value={editingVendor.phone || ''}
                              onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                            <input
                              type="email"
                              value={editingVendor.email || ''}
                              onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Website</label>
                            <input
                              type="text"
                              value={editingVendor.website || ''}
                              onChange={(e) => setEditingVendor({ ...editingVendor, website: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notes</label>
                          <textarea
                            rows={2}
                            value={editingVendor.notes || ''}
                            onChange={(e) => setEditingVendor({ ...editingVendor, notes: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                          />
                        </div>
                      </div>
                      <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                        <button
                          onClick={() => setEditingVendor(null)}
                          className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={updateVendor}
                          disabled={!editingVendor.name || !editingVendor.accountNumber}
                          className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data & Backups Tab */}
          {activeTab === 'data' && (
            <div className="space-y-8 max-w-5xl">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Data Export & Backup</h3>
                <p className="text-slate-500">Download your data for backup purposes or analytics processing.</p>
              </div>

              {/* Database Status */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Database size={24} />
                  <div>
                    <h4 className="font-bold text-lg">Database Status</h4>
                    <p className="text-slate-400 text-sm">Schema Version {SCHEMA_DEFINITION.version}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase">Orders</p>
                    <p className="text-2xl font-black">{dbStats.totalOrders}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase">Line Items</p>
                    <p className="text-2xl font-black">{dbStats.totalLineItems}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase">Customers</p>
                    <p className="text-2xl font-black">{dbStats.uniqueCustomers}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase">Active</p>
                    <p className="text-2xl font-black">{dbStats.activeOrders}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase">Archived</p>
                    <p className="text-2xl font-black">{dbStats.archivedOrders}</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-sm font-medium text-emerald-600">Leads</p>
                  <p className="text-3xl font-black text-emerald-700">{dbStats.leadsCount}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm font-medium text-blue-600">Quotes</p>
                  <p className="text-3xl font-black text-blue-700">{dbStats.quotesCount}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-sm font-medium text-amber-600">In Production</p>
                  <p className="text-3xl font-black text-amber-700">{dbStats.inProductionCount}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-sm font-medium text-green-600">Total Revenue</p>
                  <p className="text-3xl font-black text-green-700">${dbStats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 uppercase text-sm">Export Options</h4>

                <div className="grid grid-cols-1 gap-4">
                  {/* System Backup Excel - PRIMARY */}
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 flex items-center justify-between hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                        <FileSpreadsheet className="text-white" size={28} />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-lg">System Backup (Excel)</h5>
                        <p className="text-sm text-emerald-100">Complete system export: orders, users, history, art data - structured for rebuild</p>
                        <p className="text-xs text-white/80 mt-1">Use this for disaster recovery or system migration</p>
                      </div>
                    </div>
                    <button
                      onClick={exportSystemExcel}
                      className="flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
                    >
                      <Download size={18} /> Download .xlsx
                    </button>
                  </div>

                  {/* Full Database Export */}
                  <div className="bg-white border-2 border-blue-200 rounded-xl p-6 flex items-center justify-between hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Database className="text-white" size={28} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-lg">Full Database Export (JSON)</h5>
                        <p className="text-sm text-slate-500">Complete database with schema definition, metadata, and all orders</p>
                        <p className="text-xs text-blue-600 mt-1">Recommended for programmatic restore or migration</p>
                      </div>
                    </div>
                    <button
                      onClick={exportFullDatabase}
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                      <Download size={18} /> Download
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <HardDrive className="text-slate-600" size={24} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">Orders Only (JSON)</h5>
                        <p className="text-sm text-slate-500">All order data without schema metadata</p>
                      </div>
                    </div>
                    <button
                      onClick={exportOrdersJSON}
                      className="flex items-center gap-2 bg-slate-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors"
                    >
                      <Download size={18} /> Download
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <FileDown className="text-green-600" size={24} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">Order Analytics (CSV)</h5>
                        <p className="text-sm text-slate-500">Summary data for each order with financials</p>
                      </div>
                    </div>
                    <button
                      onClick={exportAnalyticsCSV}
                      className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
                    >
                      <Download size={18} /> Download
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Layers className="text-purple-600" size={24} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">Line Item Details (CSV)</h5>
                        <p className="text-sm text-slate-500">Every line item with full tracking timestamps</p>
                      </div>
                    </div>
                    <button
                      onClick={exportLineItemsCSV}
                      className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors"
                    >
                      <Download size={18} /> Download
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                        <GitBranch className="text-cyan-600" size={24} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">Schema Definition (JSON)</h5>
                        <p className="text-sm text-slate-500">Database schema for integration/migration</p>
                      </div>
                    </div>
                    <button
                      onClick={exportSchemaJSON}
                      className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-cyan-700 transition-colors"
                    >
                      <Download size={18} /> Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone - Admin Only */}
              {permissions.canDeleteUsers && onDeleteOrders && (
                <div className="space-y-4 mt-8 pt-8 border-t-2 border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-red-600" size={24} />
                    <div>
                      <h4 className="font-bold text-red-700 uppercase text-sm">Danger Zone</h4>
                      <p className="text-sm text-red-600">Permanently delete orders from the system. This action cannot be undone.</p>
                    </div>
                  </div>

                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                    <h5 className="font-bold text-red-800 mb-4">Delete Orders</h5>

                    {/* Search */}
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search by order number, customer, project, or status..."
                        className="w-full border border-red-200 p-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white"
                        value={orderSearchQuery}
                        onChange={e => setOrderSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Order Selection Table */}
                    <div className="bg-white rounded-xl border border-red-200 overflow-hidden max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-red-100 sticky top-0">
                          <tr>
                            <th className="text-left py-3 px-4 w-12">
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.size === filteredOrdersForDeletion.length && filteredOrdersForDeletion.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                              />
                            </th>
                            <th className="text-left py-3 px-4 font-bold text-red-800">Order #</th>
                            <th className="text-left py-3 px-4 font-bold text-red-800">Customer</th>
                            <th className="text-left py-3 px-4 font-bold text-red-800">Project</th>
                            <th className="text-left py-3 px-4 font-bold text-red-800">Status</th>
                            <th className="text-left py-3 px-4 font-bold text-red-800">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {filteredOrdersForDeletion.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                No orders found
                              </td>
                            </tr>
                          ) : (
                            filteredOrdersForDeletion.map(order => (
                              <tr
                                key={order.id}
                                className={`hover:bg-red-50 cursor-pointer ${selectedOrderIds.has(order.id) ? 'bg-red-100' : ''}`}
                                onClick={() => toggleOrderSelection(order.id)}
                              >
                                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={selectedOrderIds.has(order.id)}
                                    onChange={() => toggleOrderSelection(order.id)}
                                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                  />
                                </td>
                                <td className="py-3 px-4 font-mono text-xs">{order.orderNumber}</td>
                                <td className="py-3 px-4">{order.customer}</td>
                                <td className="py-3 px-4 text-slate-600">{order.projectName}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                    {order.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-500 text-xs">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Selection Summary & Delete Button */}
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-red-700">
                        {selectedOrderIds.size > 0 ? (
                          <span className="font-bold">{selectedOrderIds.size} order(s) selected for deletion</span>
                        ) : (
                          <span className="text-slate-500">Select orders to delete</span>
                        )}
                      </p>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={selectedOrderIds.size === 0}
                        className="flex items-center gap-2 bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
                      >
                        <Trash2 size={18} /> Delete Selected
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schema Tab - Visual ERD */}
          {activeTab === 'schema' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Data Schema Diagram</h3>
                <p className="text-slate-500">Visual representation of the database structure and entity relationships.</p>
              </div>

              {/* Schema Version Info */}
              <div className="bg-slate-800 text-white rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch size={20} />
                  <span className="font-bold">Schema Version {SCHEMA_DEFINITION.version}</span>
                </div>
                <button
                  onClick={exportSchemaJSON}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={16} /> Export Schema
                </button>
              </div>

              {/* Visual ERD */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8 overflow-x-auto">
                <div className="min-w-[1000px]">
                  {/* ERD Diagram */}
                  <div className="relative">
                    {/* Main Order Entity - Center */}
                    <div className="flex justify-center mb-8">
                      <div className="bg-blue-600 text-white rounded-xl p-1 shadow-xl w-80">
                        <div className="bg-blue-700 rounded-t-lg px-4 py-2 font-bold text-lg flex items-center gap-2">
                          <Box size={18} />
                          Order
                        </div>
                        <div className="bg-white text-slate-700 rounded-b-lg p-3 text-sm space-y-1">
                          <div className="flex justify-between"><span className="text-blue-600 font-bold">PK</span> <span>id: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>orderNumber: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>customer: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>customerEmail?: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>customerPhone?: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>projectName: string</span></div>
                          <div className="flex justify-between"><span className="text-purple-600 font-bold">FK</span> <span>status: OrderStatus</span></div>
                          <div className="flex justify-between"><span className="text-purple-600 font-bold">FK</span> <span>artStatus: ArtStatus</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>createdAt: Date</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>dueDate: YYYY-MM-DD</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>rushOrder: boolean</span></div>
                          <div className="flex justify-between"><span className="text-orange-600 font-bold">CO</span> <span>hasChangeOrders?</span></div>
                          <div className="flex justify-between"><span className="text-orange-600 font-bold">CO</span> <span>lastChangeOrderDate?</span></div>
                          <div className="flex justify-between"><span className="text-green-600 font-bold">1:N</span> <span>lineItems: LineItem[]</span></div>
                          <div className="flex justify-between"><span className="text-green-600 font-bold">1:1</span> <span>leadInfo?: LeadInfo</span></div>
                          <div className="flex justify-between"><span className="text-green-600 font-bold">1:1</span> <span>prepStatus: PrepStatus</span></div>
                          <div className="flex justify-between"><span className="text-green-600 font-bold">1:1</span> <span>fulfillment: FulfillmentStatus</span></div>
                          <div className="flex justify-between"><span className="text-green-600 font-bold">1:1</span> <span>closeoutChecklist: CloseoutChecklist</span></div>
                          <div className="flex justify-between"><span className="text-green-600 font-bold">1:N</span> <span>history: StatusChangeLog[]</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>version: number</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>isArchived: boolean</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Related Entities Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      {/* LineItem */}
                      <div className="bg-emerald-600 text-white rounded-xl p-1 shadow-lg">
                        <div className="bg-emerald-700 rounded-t-lg px-3 py-2 font-bold flex items-center gap-2">
                          <Layers size={16} />
                          LineItem
                        </div>
                        <div className="bg-white text-slate-700 rounded-b-lg p-2 text-xs space-y-0.5">
                          <div className="flex justify-between"><span className="text-blue-600 font-bold">PK</span> <span>id: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>itemNumber: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>name: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>color: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>size: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>qty: number</span></div>
                          <div className="flex justify-between"><span className="text-purple-600 font-bold">FK</span> <span>decorationType</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>cost: number</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>price: number</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>ordered: boolean</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>received: boolean</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>decorated: boolean</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>packed: boolean</span></div>
                          <div className="border-t border-slate-200 mt-1 pt-1"></div>
                          <div className="flex justify-between"><span className="text-orange-600 font-bold">CO</span> <span>isChangeOrder: bool</span></div>
                          <div className="flex justify-between"><span className="text-orange-600 font-bold">CO</span> <span>changeOrderDate?</span></div>
                          <div className="flex justify-between"><span className="text-orange-600 font-bold">CO</span> <span>originalQuantity?</span></div>
                        </div>
                      </div>

                      {/* LeadInfo */}
                      <div className="bg-amber-600 text-white rounded-xl p-1 shadow-lg">
                        <div className="bg-amber-700 rounded-t-lg px-3 py-2 font-bold flex items-center gap-2">
                          <Users size={16} />
                          LeadInfo
                        </div>
                        <div className="bg-white text-slate-700 rounded-b-lg p-2 text-xs space-y-0.5">
                          <div className="flex justify-between"><span className="text-purple-600 font-bold">FK</span> <span>source: LeadSource</span></div>
                          <div className="flex justify-between"><span className="text-purple-600 font-bold">FK</span> <span>temperature</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>estimatedQuantity</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>estimatedValue</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>productInterest</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>eventDate?: string</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>followUpDate?</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>contactedAt: Date</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>contactNotes?</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>budget?: string</span></div>
                        </div>
                      </div>

                      {/* PrepStatus */}
                      <div className="bg-purple-600 text-white rounded-xl p-1 shadow-lg">
                        <div className="bg-purple-700 rounded-t-lg px-3 py-2 font-bold flex items-center gap-2">
                          <Settings size={16} />
                          PrepStatus
                        </div>
                        <div className="bg-white text-slate-700 rounded-b-lg p-2 text-xs space-y-0.5">
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>gangSheetCreated</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>artworkDigitized</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>screensBurned</span></div>
                          <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t">boolean | null for each</div>
                        </div>
                      </div>

                      {/* FulfillmentStatus */}
                      <div className="bg-cyan-600 text-white rounded-xl p-1 shadow-lg">
                        <div className="bg-cyan-700 rounded-t-lg px-3 py-2 font-bold flex items-center gap-2">
                          <Box size={16} />
                          FulfillmentStatus
                        </div>
                        <div className="bg-white text-slate-700 rounded-b-lg p-2 text-xs space-y-0.5">
                          <div className="flex justify-between"><span className="text-purple-600 font-bold">FK</span> <span>method</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>shippingLabelPrinted</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>customerPickedUp</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>trackingNumber?</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">-</span> <span>fulfilledAt?: Date</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row - Enums and Supporting */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {/* OrderStatus Enum */}
                      <div className="bg-slate-600 text-white rounded-xl p-1 shadow-lg">
                        <div className="bg-slate-700 rounded-t-lg px-3 py-1.5 font-bold text-sm">OrderStatus</div>
                        <div className="bg-slate-100 text-slate-700 rounded-b-lg p-2 text-[10px] space-y-0.5">
                          <div>Lead</div>
                          <div>Quote</div>
                          <div>Approval</div>
                          <div>Art Confirmation</div>
                          <div>Inventory Order</div>
                          <div>Production Prep</div>
                          <div>Inventory Received</div>
                          <div>Production</div>
                          <div>Fulfillment</div>
                          <div>Invoice</div>
                          <div>Closeout</div>
                          <div>Closed</div>
                        </div>
                      </div>

                      {/* ProductionMethod Enum */}
                      <div className="bg-slate-600 text-white rounded-xl p-1 shadow-lg">
                        <div className="bg-slate-700 rounded-t-lg px-3 py-1.5 font-bold text-sm">ProductionMethod</div>
                        <div className="bg-slate-100 text-slate-700 rounded-b-lg p-2 text-[10px] space-y-0.5">
                          <div>ScreenPrint</div>
                          <div>Embroidery</div>
                          <div>DTF</div>
                          <div>Other</div>
                        </div>
                      </div>

                      {/* LeadSource Enum */}
                      <div className="bg-slate-600 text-white rounded-xl p-1 shadow-lg">
                        <div className="bg-slate-700 rounded-t-lg px-3 py-1.5 font-bold text-sm">LeadSource</div>
                        <div className="bg-slate-100 text-slate-700 rounded-b-lg p-2 text-[10px] space-y-0.5">
                          <div>Website</div>
                          <div>Referral</div>
                          <div>Social Media</div>
                          <div>Cold Call</div>
                          <div>Trade Show</div>
                          <div>Email Campaign</div>
                          <div>Other</div>
                        </div>
                      </div>

                      {/* CloseoutChecklist */}
                      <div className="bg-green-600 text-white rounded-xl p-1 shadow-lg">
                        <div className="bg-green-700 rounded-t-lg px-3 py-1.5 font-bold text-sm">CloseoutChecklist</div>
                        <div className="bg-white text-slate-700 rounded-b-lg p-2 text-[10px] space-y-0.5">
                          <div>filesSaved: boolean</div>
                          <div>canvaArchived: boolean</div>
                          <div>summaryUploaded: boolean</div>
                          <div>invoiceSent: boolean</div>
                        </div>
                      </div>

                      {/* StatusChangeLog */}
                      <div className="bg-red-600 text-white rounded-xl p-1 shadow-lg">
                        <div className="bg-red-700 rounded-t-lg px-3 py-1.5 font-bold text-sm">StatusChangeLog</div>
                        <div className="bg-white text-slate-700 rounded-b-lg p-2 text-[10px] space-y-0.5">
                          <div>timestamp: Date</div>
                          <div>userId?: string</div>
                          <div>action: string</div>
                          <div>previousValue: any</div>
                          <div>newValue: any</div>
                          <div>notes?: string</div>
                        </div>
                      </div>
                    </div>

                    {/* Relationship Lines Legend */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <h4 className="font-bold text-slate-700 mb-4">Relationship Legend</h4>
                      <div className="flex flex-wrap gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold text-xs">PK</span>
                          <span className="text-slate-600">Primary Key</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-bold text-xs">FK</span>
                          <span className="text-slate-600">Foreign Key / Enum Reference</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-bold text-xs">1:N</span>
                          <span className="text-slate-600">One-to-Many Relationship</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-bold text-xs">1:1</span>
                          <span className="text-slate-600">One-to-One Relationship</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-bold text-xs">CO</span>
                          <span className="text-slate-600">Change Order Field</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comprehensive Workflow Diagram */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h4 className="font-bold text-slate-900 text-lg mb-2">Application Workflow Diagram</h4>
                <p className="text-slate-500 text-sm mb-6">Complete visual guide to order processing from lead capture to invoice.</p>

                {/* Swimlane Workflow */}
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  {/* Swimlane Headers */}
                  <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 min-w-[640px]">
                    <div className="px-4 py-3 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="font-bold text-slate-700 text-sm">SALES</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="font-bold text-slate-700 text-sm">OPERATIONS</span>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="font-bold text-slate-700 text-sm">PRODUCTION</span>
                      </div>
                    </div>
                  </div>

                  {/* Swimlane Content */}
                  <div className="grid grid-cols-3 min-h-[500px] min-w-[640px]">
                    {/* Sales Lane */}
                    <div className="border-r border-slate-200 p-4 bg-emerald-50/30">
                      <div className="space-y-4">
                        {/* Lead */}
                        <div className="bg-white rounded-xl border-2 border-emerald-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">0</div>
                            <span className="font-bold text-slate-800">Lead</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Capture customer inquiry</li>
                            <li>• Record contact info</li>
                            <li>• Set temperature (Hot/Warm/Cold)</li>
                            <li>• Estimate quantity & value</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Gate: Customer info captured</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-0.5 h-6 bg-emerald-300"></div>
                        </div>

                        {/* Quote */}
                        <div className="bg-white rounded-xl border-2 border-emerald-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                            <span className="font-bold text-slate-800">Quote</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Add line items (SKU grid)</li>
                            <li>• Set decoration types</li>
                            <li>• Auto-calculate pricing</li>
                            <li>• Set due date</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Gate: Line items added</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-0.5 h-6 bg-emerald-300"></div>
                        </div>

                        {/* Approval */}
                        <div className="bg-white rounded-xl border-2 border-emerald-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                            <span className="font-bold text-slate-800">Approval</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Send quote to customer</li>
                            <li>• Await customer approval</li>
                            <li>• Collect deposit if needed</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Gate: Customer approves</span>
                          </div>
                        </div>

                        <div className="flex justify-center items-center gap-2">
                          <div className="w-0.5 h-6 bg-slate-300"></div>
                        </div>
                        <div className="flex justify-center">
                          <ArrowRight className="text-blue-400" size={24} />
                        </div>
                      </div>
                    </div>

                    {/* Operations Lane */}
                    <div className="border-r border-slate-200 p-4 bg-blue-50/30">
                      <div className="space-y-4">
                        {/* Art Confirmation */}
                        <div className="bg-white rounded-xl border-2 border-blue-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</div>
                            <span className="font-bold text-slate-800">Art Confirmation</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Create artwork proof</li>
                            <li>• Send to customer</li>
                            <li>• Get approval or revise</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Gate: Art approved (or bypass)</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-0.5 h-6 bg-blue-300"></div>
                        </div>

                        {/* Inventory Order */}
                        <div className="bg-white rounded-xl border-2 border-blue-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">4</div>
                            <span className="font-bold text-slate-800">Inventory Order</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Order blank goods</li>
                            <li>• Mark each item ordered</li>
                            <li>• Track supplier orders</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Gate: All items ordered</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-0.5 h-6 bg-blue-300"></div>
                        </div>

                        {/* Production Prep */}
                        <div className="bg-white rounded-xl border-2 border-blue-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">5</div>
                            <span className="font-bold text-slate-800">Production Prep</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• DTF: Create gang sheet</li>
                            <li>• Embroidery: Digitize art</li>
                            <li>• Screen: Burn screens</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Gate: Prep tasks complete</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-0.5 h-6 bg-blue-300"></div>
                        </div>

                        {/* Inventory Received */}
                        <div className="bg-white rounded-xl border-2 border-blue-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">6</div>
                            <span className="font-bold text-slate-800">Inventory Received</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Receive shipments</li>
                            <li>• Verify quantities</li>
                            <li>• Check for defects</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Gate: All items received</span>
                          </div>
                        </div>

                        <div className="flex justify-center items-center gap-2">
                          <div className="w-0.5 h-6 bg-slate-300"></div>
                        </div>
                        <div className="flex justify-center">
                          <ArrowRight className="text-purple-400" size={24} />
                        </div>
                      </div>
                    </div>

                    {/* Production Lane */}
                    <div className="p-4 bg-purple-50/30">
                      <div className="space-y-4">
                        {/* Production */}
                        <div className="bg-white rounded-xl border-2 border-purple-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">7</div>
                            <span className="font-bold text-slate-800">Production</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Run sheet tracking</li>
                            <li>• Mark items decorated</li>
                            <li>• Mark items packed</li>
                            <li>• Quality check</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-purple-600 uppercase">Gate: All decorated & packed</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-0.5 h-6 bg-purple-300"></div>
                        </div>

                        {/* Fulfillment */}
                        <div className="bg-white rounded-xl border-2 border-purple-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">8</div>
                            <span className="font-bold text-slate-800">Fulfillment</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Print shipping label</li>
                            <li className="text-slate-400">— OR —</li>
                            <li>• Customer pickup</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-purple-600 uppercase">Gate: Shipped or picked up</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-0.5 h-6 bg-purple-300"></div>
                        </div>

                        {/* Invoice */}
                        <div className="bg-white rounded-xl border-2 border-green-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">9</div>
                            <span className="font-bold text-slate-800">Invoice</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Create invoice</li>
                            <li>• Send to customer</li>
                            <li>• Track payment</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-green-600 uppercase">Gate: Invoice sent</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-0.5 h-6 bg-green-300"></div>
                        </div>

                        {/* Closeout */}
                        <div className="bg-white rounded-xl border-2 border-slate-400 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs font-bold">10</div>
                            <span className="font-bold text-slate-800">Closeout</span>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1 ml-8">
                            <li>• Save files to folder</li>
                            <li>• Archive Canva proof</li>
                            <li>• Upload order summary</li>
                          </ul>
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Gate: All files archived</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-0.5 h-6 bg-slate-300"></div>
                        </div>

                        {/* Archive */}
                        <div className="bg-slate-800 rounded-xl p-4 shadow-sm text-center">
                          <span className="font-bold text-white text-sm">✓ CLOSED</span>
                          <p className="text-slate-400 text-xs mt-1">Order complete</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow Legend */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h5 className="font-bold text-slate-700 text-sm mb-4">Workflow Legend</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">0-2</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Sales Funnel</p>
                        <p className="text-xs text-slate-500">Lead → Approval</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3-6</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Operations</p>
                        <p className="text-xs text-slate-500">Art → Receiving</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">7-8</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Production</p>
                        <p className="text-xs text-slate-500">Decorate → Ship</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">9-10</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Closeout</p>
                        <p className="text-xs text-slate-500">Invoice → Closed</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decoration Methods */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h5 className="font-bold text-slate-700 text-sm mb-4">Decoration Methods & Prep Requirements</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="font-bold text-purple-800">Screen Print</span>
                      </div>
                      <p className="text-xs text-purple-700">Requires: Screens burned</p>
                      <p className="text-xs text-purple-600 mt-1">+$2/placement, +$1/color</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="font-bold text-amber-800">Embroidery</span>
                      </div>
                      <p className="text-xs text-amber-700">Requires: Art digitized</p>
                      <p className="text-xs text-amber-600 mt-1">+$0/10/20 by stitch count</p>
                    </div>
                    <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                        <span className="font-bold text-cyan-800">DTF</span>
                      </div>
                      <p className="text-xs text-cyan-700">Requires: Gang sheet created</p>
                      <p className="text-xs text-cyan-600 mt-1">+$5 standard, +$8 large</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linear State Machine (simplified view) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h4 className="font-bold text-slate-900 text-lg mb-6">Linear Stage Progression</h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-4">
                  {SCHEMA_DEFINITION.workflow.stages.map((stage, index) => (
                    <React.Fragment key={stage.number}>
                      <div className="flex flex-col items-center min-w-[100px]">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          stage.number === 0 ? 'bg-emerald-500' :
                          stage.number <= 2 ? 'bg-emerald-500' :
                          stage.number <= 6 ? 'bg-blue-500' :
                          stage.number <= 8 ? 'bg-purple-500' : 'bg-green-500'
                        }`}>
                          {stage.number}
                        </div>
                        <p className="text-xs font-bold text-slate-700 mt-2 text-center">{stage.name}</p>
                        <p className="text-[10px] text-slate-400 text-center mt-1 max-w-[90px]">{stage.gateCondition}</p>
                      </div>
                      {index < SCHEMA_DEFINITION.workflow.stages.length - 1 && (
                        <ArrowRight className="text-slate-300 flex-shrink-0" size={20} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Entity Details Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h4 className="font-bold text-slate-900 text-lg mb-4">Entity Field Reference</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-3 font-bold text-slate-600">Entity</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Total Fields</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Required</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Optional</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Relationships</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(SCHEMA_DEFINITION.entities).map(([name, entity]) => {
                        const fields = Object.values(entity.fields);
                        const required = fields.filter((f: any) => f.required).length;
                        const relationships = 'relationships' in entity && entity.relationships ? Object.keys(entity.relationships).length : 0;
                        return (
                          <tr key={name} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-bold text-slate-900">{name}</td>
                            <td className="px-4 py-3 text-slate-600">{fields.length}</td>
                            <td className="px-4 py-3 text-green-600 font-medium">{required}</td>
                            <td className="px-4 py-3 text-slate-400">{fields.length - required}</td>
                            <td className="px-4 py-3 text-blue-600 font-medium">{relationships}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SOP & Training Tab */}
          {activeTab === 'sop' && (
            <div className="space-y-8 max-w-4xl">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Standard Operating Procedures & Training Guide</h3>
                <p className="text-slate-500">Complete documentation for system operation and staff training.</p>
              </div>

              <div className="prose prose-slate max-w-none">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                  <h4 className="text-blue-900 font-bold text-lg m-0 mb-2">Pallet 2.0 - Production Management System</h4>
                  <p className="text-blue-700 m-0">Standard Operating Procedures Manual v2.1 — Supabase Backend</p>
                </div>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2">1. System Overview</h4>
                <p>Pallet 2.0 is a comprehensive production management system designed for apparel decoration businesses. The system manages orders through a 12-stage workflow (Lead through Closed) with role-based access control, full audit trail tracking persisted in the database, change order support at the line-item level, and real-time data synchronization across all connected devices via Supabase.</p>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">1.1 Authentication & Access</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Login Required:</strong> All users must authenticate to access the system</li>
                  <li><strong>Default Credentials:</strong> Username: admin / Password: admin (change on first login)</li>
                  <li><strong>Role-Based Access:</strong> Six permission levels control what users can see and do</li>
                </ul>

                <div className="bg-slate-100 rounded-lg p-4 my-4">
                  <h5 className="font-bold text-slate-800 m-0 mb-2">User Roles:</h5>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li><strong>Admin (Owner):</strong> Full system access - manage users, settings, all stages, delete users</li>
                    <li><strong>Manager (Admin/IT):</strong> Manage users (except delete), access all stages and reports</li>
                    <li><strong>Sales:</strong> Create orders, access sales stages (Lead through Paid), view reports</li>
                    <li><strong>Production:</strong> Access production stages, Production Floor dashboard, upload art</li>
                    <li><strong>Fulfillment:</strong> Access fulfillment stages and tracking</li>
                    <li><strong>ReadOnly:</strong> View-only access to all areas (no editing)</li>
                  </ul>
                </div>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">2. Workflow Stages</h4>

                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                    <h5 className="font-bold text-emerald-800 m-0">Stage 0: Lead</h5>
                    <p className="text-sm text-emerald-700 m-0 mt-1">Capture initial customer inquiries with estimated quantities, product interests, and lead qualification data for sales funnel tracking.</p>
                    <p className="text-xs text-emerald-600 m-0 mt-2"><strong>Action:</strong> Convert to Quote</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 1: Quote</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Build quotes using the SKU-based line item system. Enter product details, decoration specifications, and quantities using the color/size grid.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Action:</strong> Submit Quote for Approval</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 2: Approval</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Customer reviews and approves the quote. System displays total value and item count.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Action:</strong> Quote Approved - Continue</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 3: Art Confirmation</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Artwork approval stage. Can approve art or bypass to continue with pending art status.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Actions:</strong> Art Approved OR Advance to Purchasing (Art Pending)</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 4: Inventory Order</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Purchasing checklist for all line items. Mark each item as ordered from suppliers.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Gate:</strong> All items must be marked as ordered to proceed</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 5: Production Prep</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Dynamic checklist based on decoration methods: DTF (gang sheet), Embroidery (digitizing), Screen Print (screens).</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Gate:</strong> All applicable prep tasks must be complete</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 6: Inventory Received</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Receiving checklist to verify all ordered inventory has arrived.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Gate:</strong> All items must be marked as received</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 7: Production</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Run sheet with dual tracking columns. Mark items as decorated, then packed.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Gate:</strong> All items must be decorated AND packed</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 8: Fulfillment</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Complete order delivery via shipping or customer pickup.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Options:</strong> Shipping Label Printed OR Customer Picked Up</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 9: Invoice</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Create and send invoice to customer. Track payment status and method.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Gate:</strong> Invoice created AND sent to customer</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 10: Closeout</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Project file archival: Files saved to customer folder, Canva proof archived, Order summary uploaded.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Gate:</strong> All closeout checklist items complete</p>
                  </div>

                  <div className="bg-slate-200 rounded-lg p-4">
                    <h5 className="font-bold text-slate-800 m-0">Stage 11: Closed</h5>
                    <p className="text-sm text-slate-600 m-0 mt-1">Order completed and archived. Can be reopened if needed for follow-up or corrections.</p>
                    <p className="text-xs text-slate-500 m-0 mt-2"><strong>Options:</strong> View order history, Reopen to previous stage</p>
                  </div>
                </div>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">3. Pricing Calculations</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Base Price:</strong> Wholesale Cost × 2.0</li>
                  <li><strong>Screen Print:</strong> +$2.00/placement + $1.00/color + $2.00 for 2XL+ sizes</li>
                  <li><strong>DTF:</strong> +$5.00 (Standard) or +$8.00 (Large)</li>
                  <li><strong>Embroidery:</strong> +$0 (&lt;8k), +$10 (8k-12k), +$20 (12k+)</li>
                </ul>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">4. Best Practices</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Always complete stages in order - do not skip stages</li>
                  <li>Mark line items complete immediately when finished</li>
                  <li>Use rush order flag for time-sensitive jobs</li>
                  <li>Complete all closeout checklist items before archiving</li>
                  <li><strong>Change orders:</strong> Use the "New Change Order" button to add items to an existing order. Change order line items are tracked separately with their own date and original quantity fields. The order will display a change order indicator badge throughout the workflow.</li>
                  <li><strong>Audit trail:</strong> All status changes are persisted to the database and visible in the order history. Every stage transition, change order, and field update is recorded with the user who performed it.</li>
                </ul>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">5. Security Best Practices</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Change default password:</strong> Change the admin password immediately after first login</li>
                  <li><strong>User management:</strong> Create individual accounts for each user - do not share credentials</li>
                  <li><strong>Role assignment:</strong> Assign minimum necessary permissions for each user's job function</li>
                  <li><strong>Password resets:</strong> Admins can reset any user's password in Settings → Security</li>
                  <li><strong>Audit trail:</strong> All order changes are logged with user attribution</li>
                </ul>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">6. Data Backup & Recovery</h4>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <h5 className="font-bold text-green-800 m-0 mb-2">Supabase Cloud Database</h5>
                  <p className="text-green-700 text-sm m-0">All order data, line items, and status change history are stored in a Supabase PostgreSQL database with real-time synchronization. Data persists server-side and is accessible from any device. Local settings (company info, vendor list) remain in browser localStorage.</p>
                </div>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Weekly backups:</strong> Export System Backup (Excel) weekly from Settings → Data & Backups</li>
                  <li><strong>Excel backup:</strong> Contains all data needed to rebuild system (orders, users, history, art data)</li>
                  <li><strong>JSON backup:</strong> Full Database Export for programmatic restore</li>
                  <li><strong>Store securely:</strong> Keep backups in a secure, off-site location</li>
                  <li><strong>Test restore:</strong> Periodically verify backups can be restored successfully</li>
                  <li><strong>Change order data:</strong> Change order fields (isChangeOrder, changeOrderDate, originalQuantity) are persisted per line item and included in all backups</li>
                  <li><strong>Audit history:</strong> Status change logs are stored in a dedicated database table and automatically loaded with each order</li>
                </ul>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">7. Application Update Procedures</h4>
                <p className="text-slate-600 mb-4">Follow these procedures to update the Pallet application without losing data. Core business data (orders, line items, status history) is stored in a Supabase PostgreSQL database and is not affected by front-end deployments. Local-only settings are stored in the browser's localStorage.</p>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <h5 className="font-bold text-amber-800 m-0 mb-2 flex items-center gap-2">
                    <span>⚠️</span> Important: Always Backup Before Updating
                  </h5>
                  <p className="text-amber-700 text-sm m-0">Before any update, export a complete backup using the System Backup (Excel) feature in Settings → Data & Backups. This captures both database and local data.</p>
                </div>

                <h5 className="font-bold text-slate-800 mt-6 mb-2">7.1 Data Storage Locations</h5>
                <p className="text-slate-600 mb-2">The application stores data across two layers:</p>
                <div className="bg-slate-100 rounded-lg p-4 font-mono text-sm mb-4">
                  <pre className="m-0">{`Supabase Database (server-side, persists across deployments):
├── orders                 # All order data
├── line_items             # Line items with change order tracking
├── status_change_logs     # Full audit trail / order history
├── users                  # User accounts and roles
├── productivity_entries   # Production floor tracking
└── art_files              # Art file metadata

localStorage (browser-side, device-specific):
├── pallet-company-settings  # Company info for POs
├── pallet-vendors           # Vendor list
└── pallet-auth              # Current user session cache`}</pre>
                </div>

                <h5 className="font-bold text-slate-800 mt-6 mb-2">7.2 Pre-Update Checklist</h5>
                <ol className="list-decimal pl-6 space-y-2">
                  <li><strong>Notify users:</strong> Inform all users that an update will occur and they should save their work</li>
                  <li><strong>Export System Backup:</strong> Go to Settings → Data & Backups → Download System Backup (Excel)</li>
                  <li><strong>Export JSON Backup:</strong> Also download Full Database Export (JSON) as secondary backup</li>
                  <li><strong>Verify backups:</strong> Open both files to confirm they contain current data</li>
                  <li><strong>Store backups:</strong> Save backups to a secure location (network drive, cloud storage)</li>
                  <li><strong>Document current version:</strong> Note the current Schema Version from Settings → Data & Backups</li>
                </ol>

                <h5 className="font-bold text-slate-800 mt-6 mb-2">7.3 Update Procedure</h5>
                <ol className="list-decimal pl-6 space-y-2">
                  <li><strong>Close all browser tabs:</strong> Ensure no users have the application open</li>
                  <li><strong>Deploy new code:</strong> Upload the updated application files to the web server</li>
                  <li><strong>Clear browser cache (if needed):</strong> Force refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)</li>
                  <li><strong>Verify application loads:</strong> Open the application and confirm it loads without errors</li>
                  <li><strong>Check data integrity:</strong> Verify orders, users, and settings are intact</li>
                  <li><strong>Test critical functions:</strong> Create a test order, verify stage transitions work</li>
                </ol>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 my-4">
                  <h5 className="font-bold text-blue-800 m-0 mb-2">Note: Database Data Persists Automatically</h5>
                  <p className="text-blue-700 text-sm m-0">All order data, line items, change order fields, and audit history are stored in Supabase and are NOT affected by front-end code deployments. Local-only settings (company info, vendor list) persist in browser localStorage and are device-specific.</p>
                </div>

                <h5 className="font-bold text-slate-800 mt-6 mb-2">7.4 Post-Update Verification</h5>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Login test:</strong> Verify admin and user logins work correctly</li>
                  <li><strong>Order count:</strong> Compare order count with pre-update backup</li>
                  <li><strong>User accounts:</strong> Verify all user accounts are present in Settings → Security</li>
                  <li><strong>Stage transitions:</strong> Test advancing an order through stages</li>
                  <li><strong>Export test:</strong> Verify backup exports still function</li>
                </ul>

                <h5 className="font-bold text-slate-800 mt-6 mb-2">7.5 Data Recovery (If Needed)</h5>
                <p className="text-slate-600 mb-2">If data appears missing or the application fails to load:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li><strong>Don't panic:</strong> Order data is stored server-side in Supabase and is not affected by front-end issues</li>
                  <li><strong>Check connectivity:</strong> Verify the browser can reach the Supabase endpoint (check the browser console for network errors)</li>
                  <li><strong>Hard refresh:</strong> Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to clear cached assets</li>
                  <li><strong>Verify database:</strong> Use the Supabase dashboard to confirm orders exist in the database</li>
                  <li><strong>Restore local settings:</strong> If company info or vendor data is missing, re-enter it in Settings → Company Info (these are browser-local)
                  </li>
                  <li><strong>Restore from backup (last resort):</strong> If database data is lost, use a JSON or Excel backup to re-import data through the Supabase dashboard or API</li>
                  <li><strong>Re-import users (if needed):</strong> Use CSV import in Settings → Security</li>
                </ol>

                <h5 className="font-bold text-slate-800 mt-6 mb-2">7.6 Clearing Data (Fresh Start)</h5>
                <p className="text-slate-600 mb-2">To reset the application:</p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 text-sm mb-2"><strong>Warning:</strong> Database operations are irreversible. Always export a full backup first.</p>
                  <p className="text-red-800 text-sm font-bold mb-2">Clear local-only settings (browser console):</p>
                  <div className="bg-white rounded-lg p-3 font-mono text-xs mb-3">
                    <pre className="m-0">{`// In browser console (F12):
localStorage.removeItem('pallet-company-settings');
localStorage.removeItem('pallet-vendors');
localStorage.removeItem('pallet-auth');
location.reload();`}</pre>
                  </div>
                  <p className="text-red-800 text-sm font-bold mb-2">Clear database data (Supabase dashboard or SQL):</p>
                  <div className="bg-white rounded-lg p-3 font-mono text-xs">
                    <pre className="m-0">{`-- Run in Supabase SQL Editor:
TRUNCATE status_change_logs CASCADE;
TRUNCATE line_items CASCADE;
TRUNCATE orders CASCADE;
-- Users and other tables can be truncated separately if needed`}</pre>
                  </div>
                </div>

                <h5 className="font-bold text-slate-800 mt-6 mb-2">7.7 Multi-Device & Real-Time Sync</h5>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Real-time sync:</strong> All order data is stored in Supabase and synchronized across devices in real time via PostgreSQL change subscriptions</li>
                  <li><strong>Multiple users:</strong> Multiple team members can work on different orders simultaneously from different devices</li>
                  <li><strong>Local settings are device-specific:</strong> Company info and vendor lists are stored in browser localStorage and must be configured on each device</li>
                  <li><strong>Offline fallback:</strong> If the database connection fails, the app loads test/sample orders in offline mode and displays a warning banner</li>
                </ul>
              </div>
            </div>
          )}

          {/* Specification Tab */}
          {activeTab === 'specification' && (
            <div className="space-y-8 max-w-4xl">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Application Specification</h3>
                <p className="text-slate-500">Complete technical specification for the Pallet 2.0 system.</p>
              </div>

              <div className="prose prose-slate max-w-none">
                <div className="bg-slate-800 text-white rounded-xl p-6 mb-8">
                  <h4 className="text-white font-bold text-lg m-0 mb-2">Pallet 2.0 - Technical Specification</h4>
                  <p className="text-slate-300 m-0">Version 2.0 | Schema Version {SCHEMA_DEFINITION.version}</p>
                </div>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2">1. Technology Stack</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Frontend:</strong> React 19.x with TypeScript</li>
                  <li><strong>Build Tool:</strong> Vite 6.x</li>
                  <li><strong>Styling:</strong> Tailwind CSS (CDN)</li>
                  <li><strong>Icons:</strong> Lucide React</li>
                  <li><strong>State Management:</strong> React Context API + useState/useMemo hooks</li>
                  <li><strong>Backend / Database:</strong> Supabase (hosted PostgreSQL) with real-time subscriptions</li>
                  <li><strong>Authentication:</strong> Supabase Auth with React Context wrapper</li>
                  <li><strong>Excel Export:</strong> SheetJS (xlsx library)</li>
                </ul>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">2. Data Persistence</h4>
                <p>The application uses a two-layer persistence model:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Supabase PostgreSQL:</strong> Orders, line items (including change order fields: is_change_order, change_order_date, original_quantity), status_change_logs (audit history), users, productivity entries, art file metadata</li>
                  <li><strong>Browser localStorage:</strong> Company settings (pallet-company-settings), vendor list (pallet-vendors), session cache (pallet-auth)</li>
                  <li><strong>Real-time sync:</strong> Supabase Realtime subscriptions on orders and line_items tables push updates to all connected clients</li>
                  <li><strong>Future:</strong> S3-compatible storage for file attachments via Supabase Storage</li>
                </ul>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">3. API Integration Points</h4>
                <div className="bg-slate-100 rounded-lg p-4 font-mono text-sm">
                  <pre className="m-0">{`# Authentication
POST   /api/auth/login          # User login
POST   /api/auth/logout         # User logout
GET    /api/auth/me             # Current user info

# User Management
GET    /api/users               # List users (admin only)
POST   /api/users               # Create user (admin only)
PUT    /api/users/:id           # Update user (admin only)
DELETE /api/users/:id           # Deactivate user (admin only)
PUT    /api/users/:id/password  # Reset password (admin only)
POST   /api/users/import        # CSV bulk import (admin only)

# Orders
GET    /api/orders              # List orders (with filters)
GET    /api/orders/:id          # Get single order
POST   /api/orders              # Create order/lead
PUT    /api/orders/:id          # Update order
DELETE /api/orders/:id          # Archive order
POST   /api/orders/:id/advance  # Advance to next stage

# Reports & Export
GET    /api/customers           # List customers
GET    /api/reports/queue       # Queue report data
GET    /api/reports/performance # Performance analytics
GET    /api/export/database     # Full database export (JSON)
GET    /api/export/excel        # System backup (Excel)
GET    /api/export/orders       # Orders JSON
GET    /api/export/analytics    # Analytics CSV
GET    /api/export/lineitems    # Line items CSV`}</pre>
                </div>

                <h4 className="text-slate-900 font-bold border-b border-slate-200 pb-2 mt-8">4. Component Structure</h4>
                <div className="bg-slate-100 rounded-lg p-4 font-mono text-sm">
                  <pre className="m-0">{`/
├── App.tsx                     # Main application shell with auth
├── types.ts                    # TypeScript interfaces & schema
├── constants.tsx               # Stage definitions, defaults
├── components/
│   ├── Sidebar.tsx             # Icon navigation bar
│   ├── WorkflowSidebar.tsx     # Stage navigation (responsive)
│   ├── OrderCard.tsx           # Order summary cards
│   ├── OrderSlideOver.tsx      # Order detail panel (12 stages)
│   ├── NewOrderModal.tsx       # Create lead/order form
│   ├── ChangeOrderModal.tsx    # Change order selection modal
│   ├── CustomerSearch.tsx      # Customer search autocomplete
│   ├── ReportsPage.tsx         # Queue & Performance reports
│   ├── SettingsPage.tsx        # Settings & documentation
│   ├── LoginPage.tsx           # Authentication login page
│   ├── SetupWizard.tsx         # First-run setup wizard
│   ├── FulfillmentTrackingPage.tsx  # Fulfillment tracking
│   └── ProductionFloorPage.tsx # Production floor dashboard
├── src/lib/
│   ├── supabase.ts             # Supabase client initialization
│   ├── orderService.ts         # Order CRUD, real-time subscriptions
│   ├── authService.ts          # Auth repair, setup check
│   └── database.types.ts       # Generated Supabase DB types
├── contexts/
│   └── AuthContext.tsx          # Authentication provider
├── utils/
│   ├── pricing.ts              # Price calculation logic
│   └── permissions.ts          # RBAC permission definitions
├── supabase/migrations/
│   ├── 20240123000001_schema.sql       # Initial schema
│   ├── 20240123000002_disable_rls.sql  # RLS configuration
│   ├── 20240124000001_seed_users.sql   # Default users
│   └── 20240125000001_add_change_order_fields.sql  # Change order columns
└── tests/
    ├── testOrders.ts           # Test order data
    ├── testUtils.ts            # Validation utilities
    ├── TestRunner.tsx          # Interactive test runner
    └── TEST_PROCEDURES.md      # Test documentation`}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Security & Users Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8 max-w-5xl">
              {/* Current User Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {currentUser?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-blue-900">{currentUser?.displayName}</p>
                    <p className="text-sm text-blue-600">{currentUser?.role} • {currentUser?.department || 'No department'}</p>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-lg text-blue-700 font-medium hover:bg-blue-100 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>

              {/* Change My Password - Available to all users */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Change My Password</h3>
                <p className="text-slate-500 mb-4">Update your password. Password must be at least 8 characters.</p>

                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                      <input
                        type="password"
                        value={myNewPassword}
                        onChange={(e) => {
                          setMyNewPassword(e.target.value);
                          setMyPasswordError('');
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2"
                        placeholder="Enter new password (min 8 chars)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={myConfirmPassword}
                        onChange={(e) => {
                          setMyConfirmPassword(e.target.value);
                          setMyPasswordError('');
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleMyPasswordChange}
                        disabled={!myNewPassword || !myConfirmPassword || isUserActionLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {isUserActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                        {isUserActionLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>

                  {myPasswordError && (
                    <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">{myPasswordError}</span>
                    </div>
                  )}

                  {myPasswordSuccess && (
                    <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
                      <CheckCircle size={16} />
                      <span className="text-sm font-medium">Your password has been updated successfully!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reset Any User's Password - Admin Only */}
              {permissions.canManageUsers && (
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Send Password Reset Email</h3>
                  <p className="text-slate-500 mb-4">Send a password reset link to a user's email address. They will receive an email with instructions to set a new password.</p>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Select User</label>
                        <select
                          value={passwordChangeUser}
                          onChange={(e) => {
                            setPasswordChangeUser(e.target.value);
                            setPasswordChangeError('');
                            setPasswordChangeSuccess(false);
                          }}
                          className="w-full border border-amber-300 rounded-lg px-3 py-2 bg-white"
                        >
                          <option value="">Choose a user...</option>
                          {orgHierarchy.users
                            .filter(u => u.isActive && u.email)
                            .map(user => (
                              <option key={user.id} value={user.id}>
                                {user.displayName} ({user.email}) {user.id === currentUser?.id ? '← You' : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handlePasswordChange}
                          disabled={!passwordChangeUser || isUserActionLoading}
                          className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          {isUserActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                          {isUserActionLoading ? 'Sending...' : 'Send Reset Email'}
                        </button>
                      </div>
                    </div>

                    {passwordChangeError && (
                      <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                        <AlertTriangle size={16} />
                        <span className="text-sm font-medium">{passwordChangeError}</span>
                      </div>
                    )}

                    {passwordChangeSuccess && (
                      <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">Password reset email has been sent! The user should check their inbox.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Auth Link Repair - Admin Only */}
              {permissions.canManageUsers && (
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Repair Authentication Links</h3>
                  <p className="text-slate-500 mb-4">
                    Fix user accounts that can't log in from multiple terminals. This repairs missing auth links in the database.
                  </p>

                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={async () => {
                          setAuthRepairLoading(true);
                          try {
                            const missing = await findUsersWithMissingAuthLink();
                            setUsersWithMissingAuth(missing);
                            const diagnostics = await runAuthDiagnostics();
                            setAuthDiagnostics(diagnostics);
                          } catch (error) {
                            console.error('Diagnostics failed:', error);
                          } finally {
                            setAuthRepairLoading(false);
                          }
                        }}
                        disabled={authRepairLoading}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                      >
                        {authRepairLoading ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                        Check Auth Status
                      </button>

                      <button
                        onClick={async () => {
                          if (!confirm('This will attempt to repair all users with missing auth links using the default password (Password123!). Continue?')) {
                            return;
                          }
                          setAuthRepairLoading(true);
                          setAuthRepairResult(null);
                          try {
                            const result = await repairAllMissingAuthLinks();
                            setAuthRepairResult(result);
                            // Refresh the list
                            const missing = await findUsersWithMissingAuthLink();
                            setUsersWithMissingAuth(missing);
                          } catch (error) {
                            console.error('Repair failed:', error);
                            setAuthRepairResult({
                              repaired: [],
                              failed: [],
                              errors: [error instanceof Error ? error.message : 'Unknown error']
                            });
                          } finally {
                            setAuthRepairLoading(false);
                          }
                        }}
                        disabled={authRepairLoading || usersWithMissingAuth.length === 0}
                        className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                      >
                        {authRepairLoading ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                        Repair All Missing Links
                      </button>
                    </div>

                    {/* Diagnostics Results */}
                    {authDiagnostics && (
                      <div className="bg-white border border-purple-200 rounded-lg p-4 text-sm space-y-2">
                        <h4 className="font-bold text-purple-800">Diagnostics Results:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className={authDiagnostics.supabaseConnected ? 'text-green-600' : 'text-red-600'}>
                            {authDiagnostics.supabaseConnected ? '✓' : '✗'} Supabase Connected
                          </div>
                          <div className={authDiagnostics.usersTableAccessible ? 'text-green-600' : 'text-red-600'}>
                            {authDiagnostics.usersTableAccessible ? '✓' : '✗'} Users Table Accessible
                          </div>
                          <div className={authDiagnostics.currentSession ? 'text-green-600' : 'text-red-600'}>
                            {authDiagnostics.currentSession ? '✓' : '✗'} Current Session Active
                          </div>
                          <div className={authDiagnostics.linkedUserProfile ? 'text-green-600' : 'text-red-600'}>
                            {authDiagnostics.linkedUserProfile ? '✓' : '✗'} Your Profile Linked
                          </div>
                        </div>
                        {authDiagnostics.errors.length > 0 && (
                          <div className="text-red-600 mt-2">
                            <strong>Errors:</strong>
                            <ul className="list-disc pl-5">
                              {authDiagnostics.errors.map((err: string, i: number) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Users with missing auth */}
                    {usersWithMissingAuth.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                          <AlertTriangle size={16} />
                          Users with Missing Auth Links ({usersWithMissingAuth.length})
                        </h4>
                        <p className="text-sm text-red-600 mb-2">
                          These users cannot log in from any terminal until their auth links are repaired:
                        </p>
                        <ul className="text-sm text-red-700 space-y-1">
                          {usersWithMissingAuth.map(user => (
                            <li key={user.id}>• {user.username} ({user.email || 'no email'})</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {usersWithMissingAuth.length === 0 && authDiagnostics && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
                        <CheckCircle size={16} />
                        All users have auth links properly configured.
                      </div>
                    )}

                    {/* Repair Results */}
                    {authRepairResult && (
                      <div className="bg-white border border-purple-200 rounded-lg p-4 text-sm space-y-2">
                        <h4 className="font-bold text-purple-800">Repair Results:</h4>
                        {authRepairResult.repaired.length > 0 && (
                          <div className="text-green-600">
                            <strong>✓ Repaired ({authRepairResult.repaired.length}):</strong> {authRepairResult.repaired.join(', ')}
                          </div>
                        )}
                        {authRepairResult.failed.length > 0 && (
                          <div className="text-red-600">
                            <strong>✗ Failed ({authRepairResult.failed.length}):</strong> {authRepairResult.failed.join(', ')}
                          </div>
                        )}
                        {authRepairResult.errors.length > 0 && (
                          <div className="text-red-600 mt-2">
                            <strong>Errors:</strong>
                            <ul className="list-disc pl-5">
                              {authRepairResult.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Organization Hierarchy Upload */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Organization Hierarchy</h3>
                <p className="text-slate-500 mb-4">Import users from a CSV file or add them manually.</p>

                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  {permissions.canImportUsers && (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                      >
                        <Upload size={18} />
                        Import CSV
                      </button>
                      <button
                        onClick={downloadCSVTemplate}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Download size={18} />
                        Download Template
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">CSV Format</p>
                    <p className="text-sm text-slate-600 font-mono">username,password,displayName,email,role,department,reportsTo</p>
                    <p className="text-xs text-slate-500 mt-1">Roles: Admin, Manager, Sales, Production, Fulfillment, ReadOnly</p>
                  </div>

                  {importResults && (
                    <div className={`rounded-lg p-4 ${importResults.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                      <p className="font-bold text-sm mb-2">
                        {importResults.success > 0 && <span className="text-green-700">Imported {importResults.success} users. </span>}
                        {importResults.errors.length > 0 && <span className="text-amber-700">{importResults.errors.length} errors.</span>}
                      </p>
                      {importResults.errors.length > 0 && (
                        <ul className="text-sm text-amber-600 space-y-1">
                          {importResults.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      )}
                      <button onClick={() => setImportResults(null)} className="text-xs text-slate-500 mt-2 hover:underline">Dismiss</button>
                    </div>
                  )}
                </div>
              </div>

              {/* User Management */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">User Management</h3>
                  {permissions.canCreateUsers && (
                    <button
                      onClick={() => setShowAddUser(true)}
                      disabled={isUserActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <UserPlus size={18} />
                      Add User
                    </button>
                  )}
                </div>

                {/* User Action Error Display */}
                {userActionError && (
                  <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">{userActionError}</span>
                    <button
                      onClick={() => setUserActionError(null)}
                      className="ml-auto text-red-400 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Add User Form */}
                {showAddUser && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-4">
                    <h4 className="font-bold text-blue-800 mb-4">Add New User</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username *</label>
                        <input
                          type="text"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2"
                          placeholder="jsmith"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password * <span className="font-normal">(min 8 chars)</span></label>
                        <input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2"
                          placeholder="Min 8 characters"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name *</label>
                        <input
                          type="text"
                          value={newUser.displayName}
                          onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2"
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email *</label>
                        <input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2"
                          placeholder="john@company.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role *</label>
                        <select
                          value={newUser.role}
                          onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Manager">Manager</option>
                          <option value="Sales">Sales</option>
                          <option value="Production">Production</option>
                          <option value="Fulfillment">Fulfillment</option>
                          <option value="ReadOnly">Read Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                        <input
                          type="text"
                          value={newUser.department}
                          onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2"
                          placeholder="Sales Team"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleAddUser}
                        disabled={!newUser.username || !newUser.password || !newUser.displayName || !newUser.email || isUserActionLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isUserActionLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                        {isUserActionLoading ? 'Creating...' : 'Add User'}
                      </button>
                      <button
                        onClick={() => { setShowAddUser(false); setUserActionError(null); setNewUser({ username: '', password: '', displayName: '', email: '', role: 'Sales', department: '', reportsTo: '' }); }}
                        disabled={isUserActionLoading}
                        className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Users List */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">User</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Username</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Role</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Department</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                        <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orgHierarchy.users.map(user => (
                        <tr key={user.id} className={`hover:bg-slate-50 ${!user.isActive ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                                {user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{user.displayName}</p>
                                {user.email && <p className="text-xs text-slate-500">{user.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-slate-600">{user.username}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                              user.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                              user.role === 'Sales' ? 'bg-green-100 text-green-700' :
                              user.role === 'Production' ? 'bg-amber-100 text-amber-700' :
                              user.role === 'Fulfillment' ? 'bg-cyan-100 text-cyan-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{user.department || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Deactivate button for active users */}
                              {permissions.canDeleteUsers && user.id !== currentUser?.id && user.isActive && (
                                <button
                                  onClick={async () => {
                                    setIsUserActionLoading(true);
                                    try {
                                      await deleteUser(user.id);
                                    } catch (error) {
                                      setUserActionError(error instanceof Error ? error.message : 'Failed to deactivate user');
                                    } finally {
                                      setIsUserActionLoading(false);
                                    }
                                  }}
                                  disabled={isUserActionLoading}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                  title="Deactivate user"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                              {/* Reactivate and Permanently Delete buttons for inactive users */}
                              {!user.isActive && (
                                <>
                                  {permissions.canManageUsers && (
                                    <button
                                      onClick={async () => {
                                        setIsUserActionLoading(true);
                                        try {
                                          await updateUser(user.id, { isActive: true });
                                        } catch (error) {
                                          setUserActionError(error instanceof Error ? error.message : 'Failed to reactivate user');
                                        } finally {
                                          setIsUserActionLoading(false);
                                        }
                                      }}
                                      disabled={isUserActionLoading}
                                      className="px-3 py-1.5 text-green-600 hover:text-white hover:bg-green-600 border border-green-600 rounded-lg transition-colors text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                                      title="Reactivate user"
                                    >
                                      <CheckCircle size={14} />
                                      Reactivate
                                    </button>
                                  )}
                                  {permissions.canDeleteUsers && user.id !== currentUser?.id && (
                                    <button
                                      onClick={() => {
                                        setUserToDelete(user);
                                        setShowUserDeleteConfirm(true);
                                      }}
                                      className="px-3 py-1.5 text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
                                      title="Permanently delete user"
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                              {user.id === currentUser?.id && (
                                <span className="text-xs text-slate-400">(You)</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-sm text-slate-500">
                  <p><strong>{orgHierarchy.users.filter(u => u.isActive).length}</strong> active users • <strong>{orgHierarchy.departments.length}</strong> departments</p>
                  <p className="text-xs mt-1">Last updated: {orgHierarchy.lastUpdatedAt.toLocaleString()}</p>
                </div>
              </div>

              {/* Departments */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Departments</h3>
                <div className="flex flex-wrap gap-2">
                  {orgHierarchy.departments.map(dept => (
                    <div key={dept} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                      <Building2 size={16} className="text-slate-400" />
                      <span className="font-medium text-slate-700">{dept}</span>
                      <span className="text-xs text-slate-500">({orgHierarchy.users.filter(u => u.department === dept && u.isActive).length})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal (Orders) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-800">Confirm Deletion</h3>
                  <p className="text-sm text-red-600">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700">
                You are about to permanently delete <strong className="text-red-600">{selectedOrderIds.size} order(s)</strong> from the system.
                This will remove all associated data including line items, history, and art files.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700 mb-2">
                  To confirm, type <strong>DELETE</strong> in the box below:
                </p>
                <input
                  type="text"
                  className="w-full border-2 border-red-300 p-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-mono text-center text-lg"
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrders}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="flex-1 bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent User Delete Confirmation Modal */}
      {showUserDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-800">Permanently Delete User</h3>
                  <p className="text-sm text-red-600">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700">
                You are about to permanently delete the user <strong className="text-red-600">{userToDelete.displayName}</strong> ({userToDelete.username}) from the system.
                This will remove all user data and cannot be recovered.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-500">Username:</div>
                  <div className="font-medium">{userToDelete.username}</div>
                  <div className="text-slate-500">Role:</div>
                  <div className="font-medium">{userToDelete.role}</div>
                  <div className="text-slate-500">Department:</div>
                  <div className="font-medium">{userToDelete.department || '-'}</div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700 mb-2">
                  To confirm, type <strong>DELETE</strong> in the box below:
                </p>
                <input
                  type="text"
                  className="w-full border-2 border-red-300 p-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-mono text-center text-lg"
                  placeholder="Type DELETE to confirm"
                  value={userDeleteConfirmText}
                  onChange={e => setUserDeleteConfirmText(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowUserDeleteConfirm(false);
                    setUserToDelete(null);
                    setUserDeleteConfirmText('');
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (userToDelete) {
                      setIsUserActionLoading(true);
                      try {
                        const success = await permanentlyDeleteUser(userToDelete.id);
                        if (success) {
                          setShowUserDeleteConfirm(false);
                          setUserToDelete(null);
                          setUserDeleteConfirmText('');
                        }
                      } catch (error) {
                        setUserActionError(error instanceof Error ? error.message : 'Failed to delete user');
                      } finally {
                        setIsUserActionLoading(false);
                      }
                    }
                  }}
                  disabled={userDeleteConfirmText !== 'DELETE' || isUserActionLoading}
                  className="flex-1 bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isUserActionLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  {isUserActionLoading ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
