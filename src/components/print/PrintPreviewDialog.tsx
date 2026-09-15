import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CompanySettingsDialog } from "@/components/print/CompanySettingsDialog";
import { useCompanyProfile } from "@/lib/company";
import { Building2, Info, Printer, X } from "lucide-react";

type Paper = "a4" | "letter";

const PAPER: Record<Paper, { label: string; css: string; widthMm: number; heightMm: number }> = {
  a4: { label: "A4", css: "A4", widthMm: 210, heightMm: 297 },
  letter: { label: "Letter", css: "letter", widthMm: 215.9, heightMm: 279.4 },
};

const PX_PER_MM = 96 / 25.4;
const MARGIN_MM = 12;
const ZOOMS = [
  { id: "fit", label: "Fit width" },
  { id: "0.5", label: "50%" },
  { id: "0.75", label: "75%" },
  { id: "1", label: "100%" },
  { id: "1.25", label: "125%" },
];
const PAPER_KEY = "tmobeli.print.paper";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Used as the page title while printing, so "Save as PDF" suggests it as the file name */
  documentName: string;
  /** Extra document-specific controls shown in the toolbar */
  toolbar?: ReactNode;
  children: ReactNode;
}

export function PrintPreviewDialog({ open, onOpenChange, title, documentName, toolbar, children }: PrintPreviewDialogProps) {
  const company = useCompanyProfile();
  const [paper, setPaper] = useState<Paper>(() => {
    try { return localStorage.getItem(PAPER_KEY) === "letter" ? "letter" : "a4"; } catch { return "a4"; }
  });
  const [zoom, setZoom] = useState("fit");
  const [fitScale, setFitScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const size = PAPER[paper];
  const sheetWidth = size.widthMm * PX_PER_MM;
  const pageHeight = size.heightMm * PX_PER_MM;
  const scale = zoom === "fit" ? fitScale : Number(zoom);
  const pages = Math.max(1, Math.ceil((contentHeight - 1) / pageHeight));

  // Track available width (for "fit") and the unscaled sheet height (for page count)
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const sheet = sheetRef.current;
    if (!canvas || !sheet) return;
    const update = () => {
      setFitScale(Math.min(1.1, Math.max(0.3, (canvas.clientWidth - 48) / sheetWidth)));
      setContentHeight(sheet.offsetHeight);
    };
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    observer.observe(sheet);
    update();
    return () => observer.disconnect();
  }, [open, sheetWidth]);

  const changePaper = (value: Paper) => {
    setPaper(value);
    try { localStorage.setItem(PAPER_KEY, value); } catch { /* storage unavailable — keep the choice for this session */ }
  };

  const handlePrint = () => {
    const previousTitle = document.title;
    document.title = documentName;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  // Ctrl/Cmd+P prints the previewed document instead of the app screen
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentName]);

  const pageGuides = `repeating-linear-gradient(to bottom, transparent 0, transparent ${pageHeight - 1}px, rgba(100,116,139,0.35) ${pageHeight - 1}px, rgba(100,116,139,0.35) ${pageHeight}px)`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[94vh] w-[96vw] max-w-[1180px] flex-col gap-0 overflow-hidden rounded-2xl p-0 [&>button:last-child]:hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Printer className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate text-base">{title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Print preview · {size.label} · {pages} page{pages === 1 ? "" : "s"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {toolbar}
              <Select value={paper} onValueChange={v => changePaper(v as Paper)}>
                <SelectTrigger className="h-9 w-[104px]" aria-label="Paper size"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAPER) as Paper[]).map(p => <SelectItem key={p} value={p}>{PAPER[p].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={zoom} onValueChange={setZoom}>
                <SelectTrigger className="h-9 w-[112px]" aria-label="Zoom"><SelectValue /></SelectTrigger>
                <SelectContent>{ZOOMS.map(z => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setSettingsOpen(true)}>
                <Building2 className="mr-1.5 h-4 w-4" />Letterhead
              </Button>
              <Button size="sm" className="h-9" onClick={handlePrint}>
                <Printer className="mr-1.5 h-4 w-4" />Print
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onOpenChange(false)} aria-label="Close preview">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!company.customized && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              <Info className="h-3.5 w-3.5 shrink-0" />
              The letterhead is using sample company details.
              <button type="button" onClick={() => setSettingsOpen(true)} className="font-semibold underline underline-offset-2 hover:text-amber-900">
                Add your logo and details
              </button>
            </div>
          )}

          <div ref={canvasRef} className="flex-1 overflow-auto bg-slate-200/80 px-6 py-8">
            <div className="mx-auto" style={{ width: sheetWidth * scale, height: contentHeight ? contentHeight * scale : undefined }}>
              <div
                ref={sheetRef}
                className="origin-top-left bg-white shadow-[0_10px_40px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5"
                style={{ width: sheetWidth, minHeight: pageHeight, padding: `${MARGIN_MM}mm`, transform: `scale(${scale})`, backgroundImage: pages > 1 ? pageGuides : undefined }}
              >
                {children}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
            <span>Page break lines are approximate — the browser's print dialog shows the final pages.</span>
            <span>Tip: choose <strong className="font-medium text-foreground">Save as PDF</strong> as the printer, and turn off "Headers and footers".</span>
          </div>
        </DialogContent>
      </Dialog>

      {open && createPortal(
        <div id="print-root" aria-hidden="true">
          <style>{`@page { size: ${size.css} portrait; margin: ${MARGIN_MM}mm; }`}</style>
          {children}
        </div>,
        document.body,
      )}

      <CompanySettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
