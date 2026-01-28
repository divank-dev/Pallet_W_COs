import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────────────

export interface CompanySettings {
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

export interface Vendor {
  id: string;
  name: string;
  accountNumber: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
}

const COMPANY_SETTINGS_KEY = 'pallet-company-settings';
const VENDORS_KEY = 'pallet-vendors';

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

// ── Company Settings ───────────────────────────────────────────────

function dbToCompanySettings(row: any): CompanySettings {
  return {
    companyName: row.company_name || '',
    contactName: row.contact_name || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    state: row.state || '',
    zip: row.zip || '',
    accountNumber: row.account_number || '',
    taxId: row.tax_id || '',
    notes: row.notes || ''
  };
}

function companySettingsToDb(settings: CompanySettings): any {
  return {
    company_name: settings.companyName,
    contact_name: settings.contactName,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    city: settings.city,
    state: settings.state,
    zip: settings.zip,
    account_number: settings.accountNumber,
    tax_id: settings.taxId,
    notes: settings.notes,
    updated_at: new Date().toISOString()
  };
}

/**
 * Load company settings from Supabase. Falls back to localStorage, then defaults.
 * If data exists in localStorage but not Supabase, migrates it to Supabase.
 */
export async function loadCompanySettings(): Promise<CompanySettings> {
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const settings = dbToCompanySettings(data);
      // Keep localStorage in sync as a cache
      localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    }

    // No row in Supabase — check localStorage for existing data to migrate
    const saved = localStorage.getItem(COMPANY_SETTINGS_KEY);
    if (saved) {
      try {
        const localSettings: CompanySettings = JSON.parse(saved);
        // Migrate localStorage data to Supabase
        const hasData = Object.values(localSettings).some(v => v && v.trim && v.trim() !== '');
        if (hasData) {
          await saveCompanySettings(localSettings);
        }
        return localSettings;
      } catch {
        // Invalid JSON in localStorage
      }
    }

    return DEFAULT_COMPANY_SETTINGS;
  } catch (err) {
    console.error('Error loading company settings:', err);
    // Fallback to localStorage
    const saved = localStorage.getItem(COMPANY_SETTINGS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return DEFAULT_COMPANY_SETTINGS;
  }
}

/**
 * Save company settings to Supabase (upsert singleton row).
 * Also writes to localStorage as a cache.
 */
export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  // Always update localStorage cache
  localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(settings));

  const dbData = companySettingsToDb(settings);

  // Check if a row exists
  const { data: existing } = await supabase
    .from('company_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update existing row
    const { error } = await supabase
      .from('company_settings')
      .update(dbData)
      .eq('id', existing.id);

    if (error) {
      console.error('Error saving company settings:', error);
      throw error;
    }
  } else {
    // Insert new row
    const { error } = await supabase
      .from('company_settings')
      .insert(dbData);

    if (error) {
      console.error('Error creating company settings:', error);
      throw error;
    }
  }
}

// ── Vendors ────────────────────────────────────────────────────────

function dbToVendor(row: any): Vendor {
  return {
    id: row.id,
    name: row.name,
    accountNumber: row.account_number || '',
    contactName: row.contact_name || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    website: row.website || undefined,
    notes: row.notes || undefined
  };
}

function vendorToDb(vendor: Omit<Vendor, 'id'> & { id?: string }): any {
  const row: any = {
    name: vendor.name,
    account_number: vendor.accountNumber,
    contact_name: vendor.contactName || null,
    phone: vendor.phone || null,
    email: vendor.email || null,
    website: vendor.website || null,
    notes: vendor.notes || null,
    updated_at: new Date().toISOString()
  };
  if (vendor.id) row.id = vendor.id;
  return row;
}

/**
 * Load vendors from Supabase. Falls back to localStorage, then empty array.
 * Migrates localStorage data to Supabase if needed.
 */
export async function loadVendors(): Promise<Vendor[]> {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const vendors = data.map(dbToVendor);
      localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
      return vendors;
    }

    // No vendors in Supabase — check localStorage for migration
    const saved = localStorage.getItem(VENDORS_KEY);
    if (saved) {
      try {
        const localVendors: Vendor[] = JSON.parse(saved);
        if (localVendors.length > 0) {
          // Migrate to Supabase
          for (const vendor of localVendors) {
            const dbData = vendorToDb(vendor);
            delete dbData.id; // Let Supabase generate UUIDs
            await supabase.from('vendors').insert(dbData);
          }
          // Re-fetch to get proper UUIDs
          const { data: migrated } = await supabase
            .from('vendors')
            .select('*')
            .order('name', { ascending: true });
          if (migrated) {
            const vendors = migrated.map(dbToVendor);
            localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
            return vendors;
          }
        }
        return localVendors;
      } catch {
        // Invalid JSON
      }
    }

    return [];
  } catch (err) {
    console.error('Error loading vendors:', err);
    const saved = localStorage.getItem(VENDORS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  }
}

export async function createVendor(vendor: Omit<Vendor, 'id'>): Promise<Vendor> {
  const dbData = vendorToDb(vendor);
  const { data, error } = await supabase
    .from('vendors')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    console.error('Error creating vendor:', error);
    throw error;
  }

  const created = dbToVendor(data);
  // Update localStorage cache
  const cached = await loadVendors();
  localStorage.setItem(VENDORS_KEY, JSON.stringify(cached));
  return created;
}

export async function updateVendor(vendor: Vendor): Promise<Vendor> {
  const dbData = vendorToDb(vendor);
  delete dbData.id;

  const { data, error } = await supabase
    .from('vendors')
    .update(dbData)
    .eq('id', vendor.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating vendor:', error);
    throw error;
  }

  const updated = dbToVendor(data);
  const cached = await loadVendors();
  localStorage.setItem(VENDORS_KEY, JSON.stringify(cached));
  return updated;
}

export async function deleteVendor(vendorId: string): Promise<void> {
  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', vendorId);

  if (error) {
    console.error('Error deleting vendor:', error);
    throw error;
  }

  const cached = await loadVendors();
  localStorage.setItem(VENDORS_KEY, JSON.stringify(cached));
}
