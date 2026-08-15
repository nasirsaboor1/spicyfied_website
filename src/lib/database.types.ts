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
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          health_benefits: string
          category: string
          is_bestseller: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string
          health_benefits?: string
          category: string
          is_bestseller?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          health_benefits?: string
          category?: string
          is_bestseller?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          size: string
          price: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          size: string
          price: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          size?: string
          price?: number
          sort_order?: number
          created_at?: string
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          sort_order?: number
          created_at?: string
        }
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
