// Mirrors supabase/migrations. Regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          body: string;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          entry_date?: string;
          body?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_date?: string;
          body?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recordings: {
        Row: {
          id: string;
          entry_id: string;
          user_id: string;
          object_key: string;
          mime_type: string;
          duration_ms: number | null;
          transcript: string | null;
          transcript_status: "pending" | "done" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          user_id?: string;
          object_key: string;
          mime_type: string;
          duration_ms?: number | null;
          transcript?: string | null;
          transcript_status?: "pending" | "done" | "failed";
          created_at?: string;
        };
        Update: {
          id?: string;
          entry_id?: string;
          user_id?: string;
          object_key?: string;
          mime_type?: string;
          duration_ms?: number | null;
          transcript?: string | null;
          transcript_status?: "pending" | "done" | "failed";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recordings_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "entries";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Entry = Database["public"]["Tables"]["entries"]["Row"];
export type Recording = Database["public"]["Tables"]["recordings"]["Row"];
