export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type AccountRole = "primary" | "secondary";
export type TransferStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type TransferType = "drive" | "photos" | "gmail_attachment" | "drive_to_mega" | "drive_to_drime";
export type TransferAction = "copy" | "move";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          is_premium: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      connected_accounts: {
        Row: {
          id: string;
          user_id: string;
          google_email: string;
          google_id: string;
          role: AccountRole;
          display_name: string | null;
          avatar_url: string | null;
          access_token: string;
          refresh_token: string;
          token_expiry: string;
          scopes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["connected_accounts"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["connected_accounts"]["Insert"]>;
      };
      external_accounts: {
        Row: {
          id: string;
          user_id: string;
          provider: "mega" | "drime";
          email: string;
          display_name: string | null;
          encrypted_credentials: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["external_accounts"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["external_accounts"]["Insert"]>;
      };
      transfer_jobs: {
        Row: {
          id: string;
          user_id: string;
          type: TransferType;
          action: TransferAction;
          source_account_id: string;
          destination_account_id: string | null;
          external_account_id: string | null;
          source_items: Json;
          status: TransferStatus;
          total_files: number;
          transferred_files: number;
          total_bytes: number;
          transferred_bytes: number;
          error_message: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["transfer_jobs"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["transfer_jobs"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
