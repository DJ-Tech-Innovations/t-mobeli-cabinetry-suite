// Company profile used for printed letterheads. Persisted per browser in localStorage.
import { useSyncExternalStore } from "react";

export interface CompanyProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tin: string;
  /** Data URL of an uploaded logo, or "" for the generated mark */
  logo: string;
  paymentInstructions: string;
  quotationTerms: string;
  /** false while the sample details below are still in use */
  customized: boolean;
}

export const DEFAULT_COMPANY: CompanyProfile = {
  name: "T-Mobeli",
  tagline: "Custom Furniture & Cabinetry",
  address: "123 Sample Street, Barangay Sample\nQuezon City, Metro Manila 1100",
  phone: "+63 2 8123 4567",
  email: "sales@tmobeli.com",
  website: "www.tmobeli.com",
  tin: "000-000-000-000",
  logo: "",
  paymentInstructions: "Bank: Sample Bank · Account name: T-Mobeli\nAccount no.: 0000-0000-0000\nPlease use the invoice number as your payment reference.",
  quotationTerms:
    "1. This quotation is valid for 30 days from the date above.\n" +
    "2. A 50% down payment is required to start production; the balance is due upon installation.\n" +
    "3. Lead time is confirmed once the down payment and final measurements are received.\n" +
    "4. Prices may change if the scope, dimensions, or materials change.",
  customized: false,
};

const STORAGE_KEY = "tmobeli.company.v1";
const listeners = new Set<() => void>();
let cache: CompanyProfile | null = null;

export function getCompanyProfile(): CompanyProfile {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? { ...DEFAULT_COMPANY, ...JSON.parse(raw) } : DEFAULT_COMPANY;
  } catch {
    cache = DEFAULT_COMPANY;
  }
  return cache as CompanyProfile;
}

/** Saves the profile. Returns false if it could only be kept in memory (storage blocked or full). */
export function saveCompanyProfile(profile: CompanyProfile): boolean {
  cache = { ...profile, customized: true };
  let persisted = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    persisted = false;
  }
  listeners.forEach(l => l());
  return persisted;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function useCompanyProfile() {
  return useSyncExternalStore(subscribe, getCompanyProfile, getCompanyProfile);
}

export const companyInitials = (name: string) =>
  name.split(/[\s-]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "CO";
