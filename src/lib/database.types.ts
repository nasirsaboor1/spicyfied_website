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
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          parent_id: string | null
          image_url: string | null
          display_order: number
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          parent_id?: string | null
          image_url?: string | null
          display_order?: number
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      products: {
        Row: {
          id: string
          sku: string
          name: string
          slug: string
          description: string | null
          category_id: string | null
          base_price: number
          is_featured: boolean
          is_new_arrival: boolean
          tags: string[] | null
          origin: string | null
          usage_instructions: string | null
          health_benefits: string | null
          stock_status: string
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku: string
          name: string
          slug: string
          description?: string | null
          category_id?: string | null
          base_price: number
          is_featured?: boolean
          is_new_arrival?: boolean
          tags?: string[] | null
          origin?: string | null
          usage_instructions?: string | null
          health_benefits?: string | null
          stock_status?: string
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          variant_name: string
          weight_value: number
          weight_unit: string
          price: number
          compare_at_price: number | null
          sku: string
          stock_quantity: number
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          variant_name: string
          weight_value: number
          weight_unit: string
          price: number
          compare_at_price?: number | null
          sku: string
          stock_quantity?: number
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          alt_text: string | null
          display_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          title: string | null
          comment: string | null
          is_verified_purchase: boolean
          is_approved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          rating: number
          title?: string | null
          comment?: string | null
          is_verified_purchase?: boolean
          is_approved?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string | null
          email: string
          status: string
          subtotal: number
          tax_amount: number
          shipping_amount: number
          total_amount: number
          payment_status: string
          payment_method: string | null
          payment_id: string | null
          razorpay_order_id: string | null
          shipping_address_id: string | null
          tracking_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          user_id?: string | null
          email: string
          status?: string
          subtotal: number
          tax_amount?: number
          shipping_amount?: number
          total_amount: number
          payment_status?: string
          payment_method?: string | null
          payment_id?: string | null
          razorpay_order_id?: string | null
          shipping_address_id?: string | null
          tracking_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          variant_id: string
          product_name: string
          variant_name: string
          price: number
          quantity: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          variant_id: string
          product_name: string
          variant_name: string
          price: number
          quantity: number
          subtotal: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          address_type: string | null
          full_name: string
          phone: string
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          postal_code: string
          country: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          address_type?: string | null
          full_name: string
          phone: string
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          postal_code: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['addresses']['Insert']>
      }
      delivery_zones: {
        Row: {
          pincode: string
          label: string | null
          delivery_fee: number
          created_at: string
        }
        Insert: {
          pincode: string
          label?: string | null
          delivery_fee?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['delivery_zones']['Insert']>
      }
      delivery_settings: {
        Row: {
          id: boolean
          outside_zone_fee: number
          base_pincode: string
          base_radius_km: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          outside_zone_fee?: number
          base_pincode?: string
          base_radius_km?: number
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['delivery_settings']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_delivery_fee: {
        Args: { p_postal_code: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
