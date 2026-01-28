// TypeScript types for Supabase Database
// Auto-generated from schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_user_id: string | null
          username: string
          display_name: string
          email: string | null
          role: Database['public']['Enums']['user_role']
          department: string | null
          reports_to: string | null
          is_active: boolean
          created_at: string
          last_login_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          username: string
          display_name: string
          email?: string | null
          role?: Database['public']['Enums']['user_role']
          department?: string | null
          reports_to?: string | null
          is_active?: boolean
          created_at?: string
          last_login_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          username?: string
          display_name?: string
          email?: string | null
          role?: Database['public']['Enums']['user_role']
          department?: string | null
          reports_to?: string | null
          is_active?: boolean
          created_at?: string
          last_login_at?: string | null
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: Json | null
          notes: string | null
          tags: string[] | null
          total_orders: number
          total_revenue: number
          last_order_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: Json | null
          notes?: string | null
          tags?: string[] | null
          total_orders?: number
          total_revenue?: number
          last_order_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: Json | null
          notes?: string | null
          tags?: string[] | null
          total_orders?: number
          total_revenue?: number
          last_order_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          item_number: string
          name: string
          description: string | null
          category: string | null
          base_cost: number
          base_price: number
          available_sizes: string[] | null
          available_colors: string[] | null
          supplier: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_number: string
          name: string
          description?: string | null
          category?: string | null
          base_cost: number
          base_price: number
          available_sizes?: string[] | null
          available_colors?: string[] | null
          supplier?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_number?: string
          name?: string
          description?: string | null
          category?: string | null
          base_cost?: number
          base_price?: number
          available_sizes?: string[] | null
          available_colors?: string[] | null
          supplier?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string | null
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          project_name: string
          status: Database['public']['Enums']['order_status']
          art_status: Database['public']['Enums']['art_status']
          created_at: string
          updated_at: string
          due_date: string | null
          closed_at: string | null
          archived_at: string | null
          rush_order: boolean
          is_archived: boolean
          is_change_order: boolean
          notes: string | null
          closed_reason: string | null
          reopened_from: Database['public']['Enums']['order_status'] | null
          parent_order_id: string | null
          po_numbers: Json | null
          selected_vendor_id: string | null
          lead_info: Json | null
          art_confirmation: Json | null
          prep_status: Json | null
          fulfillment_status: Json | null
          invoice_status: Json | null
          closeout_checklist: Json | null
          version: number
        }
        Insert: {
          id?: string
          order_number: string
          customer_id?: string | null
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          project_name: string
          status?: Database['public']['Enums']['order_status']
          art_status?: Database['public']['Enums']['art_status']
          created_at?: string
          updated_at?: string
          due_date?: string | null
          closed_at?: string | null
          archived_at?: string | null
          rush_order?: boolean
          is_archived?: boolean
          is_change_order?: boolean
          notes?: string | null
          closed_reason?: string | null
          reopened_from?: Database['public']['Enums']['order_status'] | null
          parent_order_id?: string | null
          po_numbers?: Json | null
          selected_vendor_id?: string | null
          lead_info?: Json | null
          art_confirmation?: Json | null
          prep_status?: Json | null
          fulfillment_status?: Json | null
          invoice_status?: Json | null
          closeout_checklist?: Json | null
          version?: number
        }
        Update: {
          id?: string
          order_number?: string
          customer_id?: string | null
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          project_name?: string
          status?: Database['public']['Enums']['order_status']
          art_status?: Database['public']['Enums']['art_status']
          created_at?: string
          updated_at?: string
          due_date?: string | null
          closed_at?: string | null
          archived_at?: string | null
          rush_order?: boolean
          is_archived?: boolean
          is_change_order?: boolean
          notes?: string | null
          closed_reason?: string | null
          reopened_from?: Database['public']['Enums']['order_status'] | null
          parent_order_id?: string | null
          po_numbers?: Json | null
          selected_vendor_id?: string | null
          lead_info?: Json | null
          art_confirmation?: Json | null
          prep_status?: Json | null
          fulfillment_status?: Json | null
          invoice_status?: Json | null
          closeout_checklist?: Json | null
          version?: number
        }
      }
      line_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          item_number: string
          name: string
          color: string
          size: string
          qty: number
          decoration_type: Database['public']['Enums']['production_method']
          decoration_placements: number
          decoration_description: string | null
          cost: number
          price: number
          ordered: boolean
          received: boolean
          decorated: boolean
          packed: boolean
          ordered_at: string | null
          received_at: string | null
          decorated_at: string | null
          packed_at: string | null
          created_at: string
          updated_at: string
          screen_print_colors: number | null
          is_plus_size: boolean
          stitch_count_tier: string | null
          dtf_size: string | null
          is_change_order: boolean
          change_order_date: string | null
          original_quantity: number | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          item_number: string
          name: string
          color: string
          size: string
          qty: number
          decoration_type: Database['public']['Enums']['production_method']
          decoration_placements?: number
          decoration_description?: string | null
          cost: number
          price: number
          ordered?: boolean
          received?: boolean
          decorated?: boolean
          packed?: boolean
          ordered_at?: string | null
          received_at?: string | null
          decorated_at?: string | null
          packed_at?: string | null
          created_at?: string
          updated_at?: string
          screen_print_colors?: number | null
          is_plus_size?: boolean
          stitch_count_tier?: string | null
          dtf_size?: string | null
          is_change_order?: boolean
          change_order_date?: string | null
          original_quantity?: number | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          item_number?: string
          name?: string
          color?: string
          size?: string
          qty?: number
          decoration_type?: Database['public']['Enums']['production_method']
          decoration_placements?: number
          decoration_description?: string | null
          cost?: number
          price?: number
          ordered?: boolean
          received?: boolean
          decorated?: boolean
          packed?: boolean
          ordered_at?: string | null
          received_at?: string | null
          decorated_at?: string | null
          packed_at?: string | null
          created_at?: string
          updated_at?: string
          screen_print_colors?: number | null
          is_plus_size?: boolean
          stitch_count_tier?: string | null
          dtf_size?: string | null
          is_change_order?: boolean
          change_order_date?: string | null
          original_quantity?: number | null
        }
      }
      status_change_logs: {
        Row: {
          id: string
          order_id: string
          timestamp: string
          user_id: string | null
          user_name: string | null
          action: string
          previous_value: Json | null
          new_value: Json | null
          notes: string | null
        }
        Insert: {
          id?: string
          order_id: string
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
          action: string
          previous_value?: Json | null
          new_value?: Json | null
          notes?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
          action?: string
          previous_value?: Json | null
          new_value?: Json | null
          notes?: string | null
        }
      }
      productivity_entries: {
        Row: {
          id: string
          date: string
          hour: number
          operator_name: string
          order_id: string | null
          order_number: string
          decoration_type: Database['public']['Enums']['production_method']
          items_decorated: number
          items_packed: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          hour: number
          operator_name: string
          order_id?: string | null
          order_number: string
          decoration_type: Database['public']['Enums']['production_method']
          items_decorated?: number
          items_packed?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          hour?: number
          operator_name?: string
          order_id?: string | null
          order_number?: string
          decoration_type?: Database['public']['Enums']['production_method']
          items_decorated?: number
          items_packed?: number
          notes?: string | null
          created_at?: string
        }
      }
      art_files: {
        Row: {
          id: string
          order_id: string
          placement_id: string | null
          proof_id: string | null
          file_name: string
          file_type: Database['public']['Enums']['art_file_type']
          file_source: Database['public']['Enums']['art_file_source']
          storage_path: string
          storage_bucket: string
          file_size: number | null
          mime_type: string | null
          thumbnail_path: string | null
          notes: string | null
          is_markup: boolean
          parent_file_id: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          order_id: string
          placement_id?: string | null
          proof_id?: string | null
          file_name: string
          file_type: Database['public']['Enums']['art_file_type']
          file_source: Database['public']['Enums']['art_file_source']
          storage_path: string
          storage_bucket?: string
          file_size?: number | null
          mime_type?: string | null
          thumbnail_path?: string | null
          notes?: string | null
          is_markup?: boolean
          parent_file_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          placement_id?: string | null
          proof_id?: string | null
          file_name?: string
          file_type?: Database['public']['Enums']['art_file_type']
          file_source?: Database['public']['Enums']['art_file_source']
          storage_path?: string
          storage_bucket?: string
          file_size?: number | null
          mime_type?: string | null
          thumbnail_path?: string | null
          notes?: string | null
          is_markup?: boolean
          parent_file_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
      }
    }
    Views: {
      order_summary: {
        Row: {
          id: string | null
          order_number: string | null
          customer_name: string | null
          project_name: string | null
          status: Database['public']['Enums']['order_status'] | null
          art_status: Database['public']['Enums']['art_status'] | null
          due_date: string | null
          rush_order: boolean | null
          created_at: string | null
          updated_at: string | null
          line_item_count: number | null
          total_quantity: number | null
          total_revenue: number | null
          total_cost: number | null
          total_profit: number | null
        }
      }
      daily_productivity_summary: {
        Row: {
          date: string | null
          total_decorated: number | null
          total_packed: number | null
          operator_count: number | null
          entry_count: number | null
        }
      }
      customer_lifetime_value: {
        Row: {
          id: string | null
          name: string | null
          email: string | null
          total_orders: number | null
          lifetime_revenue: number | null
          lifetime_profit: number | null
          last_order_date: string | null
          first_order_date: string | null
        }
      }
    }
    Functions: {
      generate_order_number: {
        Args: { prefix?: string }
        Returns: string
      }
      search_orders: {
        Args: { search_query: string }
        Returns: {
          id: string
          order_number: string
          customer_name: string
          project_name: string
          status: Database['public']['Enums']['order_status']
          rank: number
        }[]
      }
      refresh_analytics_views: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      update_metadata_counts: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['user_role']
      }
    }
    Enums: {
      order_status:
        | 'Lead'
        | 'Quote'
        | 'Approval'
        | 'Art Confirmation'
        | 'Inventory Order'
        | 'Production Prep'
        | 'Inventory Received'
        | 'Production'
        | 'Fulfillment'
        | 'Invoice'
        | 'Closeout'
        | 'Closed'
      production_method: 'ScreenPrint' | 'Embroidery' | 'DTF' | 'Other'
      art_status:
        | 'Not Started'
        | 'In Progress'
        | 'Sent to Customer'
        | 'Revision Requested'
        | 'Approved'
      lead_source:
        | 'Website'
        | 'Referral'
        | 'Social Media'
        | 'Cold Call'
        | 'Trade Show'
        | 'Email Campaign'
        | 'Other'
      lead_temperature: 'Hot' | 'Warm' | 'Cold'
      fulfillment_method: 'Shipped' | 'PickedUp'
      user_role:
        | 'Admin'
        | 'Manager'
        | 'Sales'
        | 'Production'
        | 'Fulfillment'
        | 'ReadOnly'
      payment_method: 'Cash' | 'Check' | 'Credit Card' | 'ACH' | 'Other'
      art_file_type: 'original' | 'proof' | 'markup' | 'reference' | 'final'
      art_file_source: 'client' | 'designer' | 'system'
      proof_status: 'Draft' | 'Sent' | 'Approved' | 'Revision Needed'
    }
  }
}
