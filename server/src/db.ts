import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

export type Registration = {
  id: number;
  fullName: string;
  fatherName?: string;
  religion?: string;
  nationality?: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  highestQualification: string;
  schoolCollegeName: string;
  yearOfStudy: string;
  mobileNumber: string;
  preferredBatchTime: string;
  courseSelected: string;
  howDidYouHear: string;
  paymentMode: string;
  status: 'Pending' | 'Confirmed' | 'Rejected';
  createdAt: string;
};

export type Course = {
  id: number;
  title: string;
  duration: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  imageUrl?: string;
  isActive: boolean;
  isPromoted: boolean;
  badgeText?: string;
  createdAt: string;
};

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing. Database operations will fail.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for type safety if needed
export type Tables = {
  registrations: Registration;
};

/**
 * Helper to retry a function that returns a promise.
 * Useful for handling transient network errors/timeouts with Supabase.
 */
export async function withRetry<T>(
  fn: () => Promise<T> | PromiseLike<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isNetworkError = 
      err.message?.includes("fetch failed") || 
      err.message?.includes("ConnectTimeoutError") ||
      err.message?.includes("UND_ERR_CONNECT_TIMEOUT") ||
      err.code === "ECONNRESET" ||
      err.code === "ETIMEDOUT";

    if (retries > 0 && isNetworkError) {
      console.warn(`⚠️ Supabase connection issue. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}
