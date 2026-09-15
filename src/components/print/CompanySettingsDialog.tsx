import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompanyLogo } from "@/components/print/CompanyLogo";
import { DEFAULT_COMPANY, getCompanyProfile, saveCompanyProfile, type CompanyProfile } from "@/lib/company";
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_LOGO_BYTES = 1024 * 1024;

export function CompanySettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState<CompanyProfile>(getCompanyProfile);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setForm(getCompanyProfile());
  }, [open]);

  const set = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => setForm(f => ({ ...f, [key]: value }));

  const handleLogo = (file?: File) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) { toast.error("Use a PNG, JPG, WEBP, or SVG image"); return; }
    if (file.size > MAX_LOGO_BYTES) { toast.error("Logo must be 1MB or smaller"); return; }
    const reader = new FileReader();
    reader.onload = () => set("logo", String(reader.result));
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    const persisted = saveCompanyProfile({ ...form, name: form.name.trim() });
    if (persisted) toast.success("Letterhead saved");
    else toast.warning("Saved for this session only", { description: "Browser storage is blocked or full — try a smaller logo." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Company Letterhead</DialogTitle>
          <DialogDescription>Shown at the top of printed quotations, invoices, and purchase orders. Saved in this browser.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex items-center gap-4 rounded-xl border border-border p-3">
            <CompanyLogo company={form} className="h-16 w-16 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Logo</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, or SVG · max 1MB · a wide or square logo works best</p>
              <div className="mt-2 flex gap-2">
                <input ref={fileInput} type="file" accept={LOGO_TYPES.join(",")} className="hidden" onChange={e => { handleLogo(e.target.files?.[0]); e.target.value = ""; }} />
                <Button type="button" size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
                  <ImagePlus className="mr-1.5 h-4 w-4" />{form.logo ? "Change" : "Upload"}
                </Button>
                {form.logo && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => set("logo", "")}>
                    <Trash2 className="mr-1.5 h-4 w-4" />Use monogram
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="e.g. Custom Furniture & Cabinetry" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea rows={2} value={form.address} onChange={e => set("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Website</Label><Input value={form.website} onChange={e => set("website", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>TIN</Label><Input value={form.tin} onChange={e => set("tin", e.target.value)} placeholder="000-000-000-000" /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Instructions <span className="font-normal text-muted-foreground">(invoices)</span></Label>
            <Textarea rows={3} value={form.paymentInstructions} onChange={e => set("paymentInstructions", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Terms & Conditions <span className="font-normal text-muted-foreground">(quotations)</span></Label>
            <Textarea rows={4} value={form.quotationTerms} onChange={e => set("quotationTerms", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => setForm({ ...DEFAULT_COMPANY })} className="text-muted-foreground">
            <RotateCcw className="mr-1.5 h-4 w-4" />Reset to sample
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save}>Save Letterhead</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
