export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string | null
          city: string
          country: string
          created_at: string | null
          full_name: string
          id: string
          is_default: boolean | null
          phone: string
          postal_code: string
          state: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type?: string | null
          city: string
          country?: string
          created_at?: string | null
          full_name: string
          id?: string
          is_default?: boolean | null
          phone: string
          postal_code: string
          state: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string | null
          city?: string
          country?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_default?: boolean | null
          phone?: string
          postal_code?: string
          state?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string
          id: string
          is_active?: boolean
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
        }
        Relationships: []
      }
      back_in_stock_notifications: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_notified: boolean | null
          product_id: string
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_notified?: boolean | null
          product_id: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_notified?: boolean | null
          product_id?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "back_in_stock_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "back_in_stock_notifications_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alert_recipients: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          label: string | null
          phone: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          phone: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          phone?: string
        }
        Relationships: []
      }
      stock_alert_queue: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          processed_at: string | null
          product_id: string
          stock_quantity: number | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          processed_at?: string | null
          product_id: string
          stock_quantity?: number | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          processed_at?: string | null
          product_id?: string
          stock_quantity?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alert_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alert_queue_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          price_at_addition: number
          product_id: string
          quantity: number
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          price_at_addition: number
          product_id: string
          quantity?: number
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          price_at_addition?: number
          product_id?: string
          quantity?: number
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          subject?: string
        }
        Relationships: []
      }
      content_pages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          phone_verified: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string
          id: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          base_pincode: string
          base_radius_km: number
          id: boolean
          outside_zone_fee: number
          updated_at: string | null
        }
        Insert: {
          base_pincode?: string
          base_radius_km?: number
          id?: boolean
          outside_zone_fee?: number
          updated_at?: string | null
        }
        Update: {
          base_pincode?: string
          base_radius_km?: number
          id?: boolean
          outside_zone_fee?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          created_at: string | null
          delivery_fee: number
          label: string | null
          pincode: string
        }
        Insert: {
          created_at?: string | null
          delivery_fee?: number
          label?: string | null
          pincode: string
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number
          label?: string | null
          pincode?: string
        }
        Relationships: []
      }
      google_review_links: {
        Row: {
          created_at: string | null
          google_place_id: string
          id: string
          is_active: boolean | null
          product_id: string | null
          review_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          google_place_id: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          review_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          google_place_id?: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          review_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_review_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean | null
          subscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          carrier: string | null
          created_at: string | null
          delivery_type: string
          email: string
          id: string
          notes: string | null
          order_number: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          razorpay_order_id: string | null
          shipping_address_id: string | null
          shipping_amount: number | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          carrier?: string | null
          created_at?: string | null
          delivery_type?: string
          email: string
          id?: string
          notes?: string | null
          order_number: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          shipping_address_id?: string | null
          shipping_amount?: number | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          carrier?: string | null
          created_at?: string | null
          delivery_type?: string
          email?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          shipping_address_id?: string | null
          shipping_amount?: number | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string | null
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stories: {
        Row: {
          created_at: string | null
          heritage_info: string | null
          id: string
          product_id: string
          sourcing_details: string | null
          story_content: string | null
          story_title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          heritage_info?: string | null
          id?: string
          product_id: string
          sourcing_details?: string | null
          story_content?: string | null
          story_title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          heritage_info?: string | null
          id?: string
          product_id?: string
          sourcing_details?: string | null
          story_content?: string | null
          story_title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string | null
          id: string
          is_default: boolean | null
          price: number
          product_id: string
          sku: string
          stock_quantity: number | null
          updated_at: string | null
          variant_name: string
          weight_unit: string
          weight_value: number
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          price: number
          product_id: string
          sku: string
          stock_quantity?: number | null
          updated_at?: string | null
          variant_name: string
          weight_unit?: string
          weight_value: number
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          price?: number
          product_id?: string
          sku?: string
          stock_quantity?: number | null
          updated_at?: string | null
          variant_name?: string
          weight_unit?: string
          weight_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string | null
          description: string | null
          health_benefits: string | null
          id: string
          is_active: boolean
          is_featured: boolean | null
          is_new_arrival: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          origin: string | null
          sku: string
          slug: string
          stock_status: string | null
          tags: string[] | null
          updated_at: string | null
          usage_instructions: string | null
        }
        Insert: {
          base_price: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          health_benefits?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          is_new_arrival?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          origin?: string | null
          sku: string
          slug: string
          stock_status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          usage_instructions?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          health_benefits?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          is_new_arrival?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          origin?: string | null
          sku?: string
          slug?: string
          stock_status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          usage_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_banners: {
        Row: {
          background_color: string | null
          content: string | null
          created_at: string | null
          display_order: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          link_url: string | null
          start_date: string | null
          text_color: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          content?: string | null
          created_at?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          start_date?: string | null
          text_color?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          content?: string | null
          created_at?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          start_date?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          ingredient_text: string
          product_id: string | null
          quantity: string | null
          recipe_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          ingredient_text: string
          product_id?: string | null
          quantity?: string | null
          recipe_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          ingredient_text?: string
          product_id?: string | null
          quantity?: string | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          content: string | null
          cook_time: number | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          featured_image: string | null
          id: string
          is_published: boolean | null
          prep_time: number | null
          servings: number | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          cook_time?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean | null
          prep_time?: number | null
          servings?: number | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          cook_time?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean | null
          prep_time?: number | null
          servings?: number | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          title: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          title?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_delivery_fee: { Args: { p_postal_code: string }; Returns: number }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      promote_to_admin: {
        Args: { target_email: string }
        Returns: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: string
        }
        SetofOptions: {
          from: "*"
          to: "admin_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
