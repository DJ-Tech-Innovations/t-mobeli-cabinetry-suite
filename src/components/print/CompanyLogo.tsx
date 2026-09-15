import { companyInitials, type CompanyProfile } from "@/lib/company";
import { cn } from "@/lib/utils";

/** Uploaded logo, or a generated monogram mark in the brand navy. */
export function CompanyLogo({ company, className }: { company: Pick<CompanyProfile, "name" | "logo">; className?: string }) {
  if (company.logo) {
    return <img src={company.logo} alt={`${company.name} logo`} className={cn("object-contain", className)} />;
  }
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={`${company.name} logo`} className={className}>
      <rect width="64" height="64" rx="14" fill="#172554" />
      <rect x="12" y="46" width="40" height="4" rx="2" fill="#3b82f6" />
      <text x="32" y="38" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="22" fontWeight="800" fill="#ffffff" letterSpacing="1">
        {companyInitials(company.name)}
      </text>
    </svg>
  );
}
