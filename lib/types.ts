/**
 * Database types for JobBoost AI
 * Generated from Supabase schema — keep in sync with supabase/migrations/001_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; // maps to Clerk user ID
          email: string;
          full_name: string | null;
          credits: number; // free job applications remaining
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          credits?: number; // defaults to 3
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          credits?: number;
          updated_at?: string;
        };
      };
      cvs: {
        Row: {
          id: string;
          user_id: string;
          original_name: string;
          storage_path: string;
          parsed_text: string | null;
          structured_data: Json | null;
          parse_confidence: number | null;
          warnings: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          original_name: string;
          storage_path: string;
          parsed_text?: string | null;
          structured_data?: Json | null;
          parse_confidence?: number | null;
          warnings?: string[];
          created_at?: string;
        };
        Update: {
          parsed_text?: string | null;
          structured_data?: Json | null;
          parse_confidence?: number | null;
          warnings?: string[];
        };
      };
      job_applications: {
        Row: {
          id: string;
          user_id: string;
          cv_id: string | null;
          jd_text: string | null;
          jd_url: string | null;
          status:
            | "cv_uploaded"
            | "jd_analyzed"
            | "pending_payment"
            | "paid"
            | "generating"
            | "complete"
            | "failed";
          stripe_payment_intent_id: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cv_id?: string | null;
          jd_text?: string | null;
          jd_url?: string | null;
          status?: string;
          stripe_payment_intent_id?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          cv_id?: string | null;
          jd_text?: string | null;
          jd_url?: string | null;
          status?: string;
          stripe_payment_intent_id?: string | null;
          paid_at?: string | null;
          updated_at?: string;
        };
      };
      job_results: {
        Row: {
          id: string;
          application_id: string;
          cv_pdf_storage_path: string | null;
          company_report: Json | null;
          mock_interview_qa: Json | null;
          tech_prep: Json | null;
          generated_at: string | null;
        };
        Insert: {
          id?: string;
          application_id: string;
          cv_pdf_storage_path?: string | null;
          company_report?: Json | null;
          mock_interview_qa?: Json | null;
          tech_prep?: Json | null;
          generated_at?: string | null;
        };
        Update: {
          cv_pdf_storage_path?: string | null;
          company_report?: Json | null;
          mock_interview_qa?: Json | null;
          tech_prep?: Json | null;
          generated_at?: string | null;
        };
      };
    };
  };
}

// Convenient type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CV = Database["public"]["Tables"]["cvs"]["Row"];
export type JobApplication = Database["public"]["Tables"]["job_applications"]["Row"];
export type JobResult = Database["public"]["Tables"]["job_results"]["Row"];

// API response shape for CV upload (what frontend receives)
export interface CVUploadResponse {
  id: string;
  originalName: string;
  storagePath: string;
  parsedText: string | null;
  structuredData: ParsedCVData | null;
  parseConfidence: number | null;
  warnings: string[];
}

// Parsed CV structured data shape
export interface ParsedCVData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedIn?: string;
    portfolio?: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationYear: number;
  }>;
  skills: string[];
}
