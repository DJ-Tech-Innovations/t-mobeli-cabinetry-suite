import type { ReactNode } from "react";
import { CompanyLogo } from "@/components/print/CompanyLogo";
import { useCompanyProfile, type CompanyProfile } from "@/lib/company";
import {
  store, formatCurrency, computeQuotationTotals, computeInvoiceTotals, getInvoiceStatus, purchaseOrderTotal, addDaysISO, todayISO,
  PAYMENT_METHODS, type Invoice, type PurchaseOrder, type Quotation,
} from "@/lib/data";
import { cn } from "@/lib/utils";

const NAVY = "#172554";

/* ---------- formatting ---------- */

export const docDate = (iso?: string) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Million", "Billion"];

const underThousand = (n: number) => {
  const parts: string[] = [];
  if (n >= 100) { parts.push(`${ONES[Math.floor(n / 100)]} Hundred`); n %= 100; }
  if (n >= 20) parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(" ");
};

/** e.g. 1250.5 → "One Thousand Two Hundred Fifty Pesos and 50/100" */
export function pesosInWords(amount: number) {
  const cents = Math.round(Math.abs(amount) * 100);
  let whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  let words = "Zero";
  if (whole > 0) {
    const groups: string[] = [];
    for (let i = 0; whole > 0; i++, whole = Math.floor(whole / 1000)) {
      const chunk = whole % 1000;
      if (chunk) groups.unshift(underThousand(chunk) + (SCALES[i] ? ` ${SCALES[i]}` : ""));
    }
    words = groups.join(" ");
  }
  return `${words} Pesos${fraction ? ` and ${String(fraction).padStart(2, "0")}/100` : " Only"}`;
}

/* ---------- building blocks ---------- */

function Letterhead({ company }: { company: CompanyProfile }) {
  const contact = [company.phone, company.email, company.website].filter(Boolean);
  return (
    <header className="break-inside-avoid">
      <div className="flex items-center justify-between gap-6 pb-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <CompanyLogo company={company} className="h-[60px] max-w-[160px] shrink-0 [&:is(svg)]:w-[60px]" />
          <div className="min-w-0">
            <p className="text-[22px] font-extrabold leading-tight tracking-tight" style={{ color: NAVY }}>{company.name}</p>
            {company.tagline && <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-slate-500">{company.tagline}</p>}
          </div>
        </div>
        <div className="shrink-0 text-right text-[10px] leading-[1.55] text-slate-600">
          {company.address && <p className="whitespace-pre-line">{company.address}</p>}
          {contact.length > 0 && <p>{contact.join("  ·  ")}</p>}
          {company.tin && <p>TIN {company.tin}</p>}
        </div>
      </div>
      <div className="h-[3px] rounded-full" style={{ backgroundColor: NAVY }} />
      <div className="mt-[2px] h-px bg-blue-500" />
    </header>
  );
}

type StampTone = "green" | "red" | "slate" | "amber";
const STAMP_TONES: Record<StampTone, string> = {
  green: "border-emerald-600 text-emerald-700",
  red: "border-red-600 text-red-700",
  slate: "border-slate-400 text-slate-500",
  amber: "border-amber-500 text-amber-600",
};

function DocHeading({ type, number, stamp }: { type: string; number: string; stamp?: { label: string; tone: StampTone } }) {
  return (
    <div className="mt-6 flex items-end justify-between gap-6 break-inside-avoid">
      <div>
        <h1 className="text-[26px] font-extrabold uppercase leading-none tracking-[0.14em]" style={{ color: NAVY }}>{type}</h1>
        <p className="mt-1.5 font-mono text-[12px] font-semibold text-slate-600">No. {number}</p>
      </div>
      {stamp && (
        <span className={cn("mr-2 -rotate-[8deg] rounded-md border-[3px] px-3 py-1 text-[15px] font-extrabold uppercase tracking-[0.2em] opacity-85", STAMP_TONES[stamp.tone])}>
          {stamp.label}
        </span>
      )}
    </div>
  );
}

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: NAVY }}>{children}</p>
);

function Party({ label, name, lines }: { label: string; name?: string; lines: (string | undefined)[] }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 break-inside-avoid">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1 text-[13px] font-semibold text-slate-900">{name || "—"}</p>
      {lines.filter(Boolean).map((line, i) => <p key={i} className="whitespace-pre-line text-slate-600">{line}</p>)}
    </div>
  );
}

function Meta({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 break-inside-avoid">
      <table className="w-full">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="whitespace-nowrap py-[3px] pr-3 align-top text-slate-500">{label}</td>
              <td className="py-[3px] text-right font-medium text-slate-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Column { label: string; align?: "left" | "right" | "center"; width?: string }
const alignClass = (align?: Column["align"]) => (align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left");

function ItemsTable({ columns, rows, className }: { columns: Column[]; rows: ReactNode[][]; className?: string }) {
  return (
    <table className={cn("mt-5 w-full border-collapse", className)}>
      <thead>
        <tr style={{ backgroundColor: NAVY }}>
          {columns.map(c => (
            <th key={c.label} className={cn("px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white", alignClass(c.align))} style={{ width: c.width }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} className="px-2.5 py-6 text-center text-slate-500">No items.</td></tr>
        ) : rows.map((cells, i) => (
          <tr key={i} className="border-b border-slate-200 break-inside-avoid even:bg-slate-50">
            {cells.map((cell, j) => (
              <td key={j} className={cn("px-2.5 py-2 align-top", alignClass(columns[j]?.align), columns[j]?.align === "right" && "tabular-nums")}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface TotalRow { label: string; value: string; tone?: "negative" | "positive" | "strong" }

function Totals({ rows, total, words, after }: { rows: TotalRow[]; total: { label: string; value: string }; words?: string; after?: TotalRow[] }) {
  const row = (r: TotalRow) => (
    <div key={r.label} className={cn("flex justify-between gap-4 border-b border-slate-100 px-1 py-[5px]", r.tone === "strong" && "border-0 font-bold text-slate-900")}>
      <span className={r.tone === "strong" ? "" : "text-slate-600"}>{r.label}</span>
      <span className={cn("tabular-nums", r.tone === "negative" && "text-red-700", r.tone === "positive" && "text-emerald-700", r.tone !== "strong" && "font-medium text-slate-900")}>{r.value}</span>
    </div>
  );
  return (
    <div className="mt-4 flex justify-end break-inside-avoid">
      <div className="w-[58%] min-w-[270px]">
        {rows.map(row)}
        <div className="mt-1.5 flex items-center justify-between gap-4 rounded-md px-3 py-2 text-white" style={{ backgroundColor: NAVY }}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{total.label}</span>
          <span className="text-[15px] font-bold tabular-nums">{total.value}</span>
        </div>
        {after?.map(row)}
        {words && <p className="mt-1.5 text-right text-[9.5px] italic leading-snug text-slate-500">{words}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5 break-inside-avoid">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-1 whitespace-pre-line leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

function Signatures({ blocks }: { blocks: { label: string; name?: string; caption?: string }[] }) {
  return (
    <div className={cn("mt-12 grid gap-8 break-inside-avoid", blocks.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
      {blocks.map(b => (
        <div key={b.label}>
          <div className="border-t border-slate-500 pt-1.5">
            <p className="min-h-[15px] font-semibold text-slate-900">{b.name}</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">{b.label}</p>
            {b.caption && <p className="text-[9.5px] text-slate-400">{b.caption}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocFooter({ company, note }: { company: CompanyProfile; note?: string }) {
  return (
    <footer className="mt-10 border-t border-slate-200 pt-2 text-center text-[9px] leading-relaxed text-slate-400 break-inside-avoid">
      {note && <p className="mb-0.5 font-medium text-slate-500">{note}</p>}
      <p>{[company.name, company.phone, company.email].filter(Boolean).join("  ·  ")}  —  Generated {docDate(todayISO())}</p>
    </footer>
  );
}

function DocRoot({ children }: { children: ReactNode }) {
  return (
    <article className="print-doc text-[11px] leading-snug text-slate-800" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      {children}
    </article>
  );
}

/* ---------- Quotation ---------- */

export type QuotationCopy = "client" | "internal";

export function QuotationDocument({ quotation, copy, unsaved }: { quotation: Quotation; copy: QuotationCopy; unsaved?: boolean }) {
  const company = useCompanyProfile();
  const totals = computeQuotationTotals(quotation);
  const project = store.getProject(quotation.projectId);
  const customer = project ? store.getCustomer(project.customerId) : undefined;
  const agent = quotation.assignedAgentId ? store.getEmployee(quotation.assignedAgentId) : undefined;
  const date = quotation.createdAt || todayISO();
  const internal = copy === "internal";

  const stamp =
    quotation.status === "approved" ? { label: "Approved", tone: "green" as const } :
    quotation.status === "rejected" ? { label: "Rejected", tone: "red" as const } :
    quotation.status === "draft" || unsaved ? { label: "Draft", tone: "slate" as const } : undefined;

  const materialRows = quotation.items.map((item, i) => {
    const m = store.getMaterial(item.materialId);
    const name = (
      <>
        <span className="font-medium text-slate-900">{m?.name ?? "Unknown material"}</span>
        {m?.description && <span className="block text-[9.5px] text-slate-500">{m.description}</span>}
      </>
    );
    return internal
      ? [i + 1, name, `${item.quantity} ${m?.unit ?? ""}`, formatCurrency(item.unitPrice), formatCurrency(item.totalPrice)]
      : [i + 1, name, item.quantity, m?.unit ?? "—"];
  });

  return (
    <DocRoot>
      <Letterhead company={company} />
      <DocHeading type="Quotation" number={unsaved ? "— (unsaved draft)" : quotation.id.toUpperCase()} stamp={stamp} />
      {internal && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-700">
          INTERNAL COPY — shows material cost, OPEX, and margin. Not for client distribution.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Party label="Prepared for" name={customer?.name} lines={[customer?.contactPerson && `Attn: ${customer.contactPerson}`, customer?.address, customer?.phone, customer?.email]} />
        <Meta rows={[
          ["Date", docDate(date)],
          ["Valid until", docDate(addDaysISO(date, 30))],
          ["Project", project?.name ?? "—"],
          ["Prepared by", agent ? `${agent.name}` : company.name],
        ]} />
      </div>

      {quotation.description && (
        <Section title="Scope of work">{quotation.description}</Section>
      )}

      <ItemsTable
        columns={internal
          ? [{ label: "#", width: "32px", align: "center" }, { label: "Material" }, { label: "Qty", align: "right", width: "80px" }, { label: "Unit Cost", align: "right", width: "96px" }, { label: "Amount", align: "right", width: "104px" }]
          : [{ label: "#", width: "32px", align: "center" }, { label: "Materials & Components" }, { label: "Qty", align: "right", width: "70px" }, { label: "Unit", width: "80px" }]}
        rows={materialRows}
      />

      {internal ? (
        <Totals
          rows={[
            { label: `Materials subtotal (${quotation.items.length} items)`, value: formatCurrency(totals.subtotal) },
            { label: `OPEX (${quotation.opexPercent}%)`, value: formatCurrency(totals.opex) },
            { label: "Cost + OPEX", value: formatCurrency(totals.costWithOpex) },
            ...(totals.discount > 0 ? [{ label: `Discount (${quotation.discountPercent}%)`, value: `-${formatCurrency(totals.discount)}`, tone: "negative" as const }] : []),
            { label: "After discount", value: formatCurrency(totals.afterDiscount) },
            { label: `Margin (${quotation.marginPercent}%)`, value: formatCurrency(totals.margin), tone: "positive" },
          ]}
          total={{ label: "Selling price", value: formatCurrency(totals.total) }}
          after={agent ? [{ label: `Agent commission — ${agent.name} (${agent.commissionPercent}%)`, value: formatCurrency((totals.total * agent.commissionPercent) / 100) }] : undefined}
        />
      ) : (
        <Totals
          rows={totals.discount > 0 ? [{ label: `Includes ${quotation.discountPercent}% discount`, value: `-${formatCurrency(totals.discount)}`, tone: "negative" }] : []}
          total={{ label: "Total contract price", value: formatCurrency(totals.total) }}
          words={pesosInWords(totals.total)}
        />
      )}

      {company.quotationTerms && <Section title="Terms & conditions">{company.quotationTerms}</Section>}

      <Signatures
        blocks={[
          { label: "Prepared by", name: agent?.name, caption: agent?.position },
          { label: "Conforme / Accepted by", name: customer?.contactPerson, caption: "Signature over printed name & date" },
        ]}
      />
      <DocFooter company={company} note={internal ? "Internal document" : "Thank you for considering us for your project."} />
    </DocRoot>
  );
}

/* ---------- Invoice ---------- */

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const company = useCompanyProfile();
  const status = getInvoiceStatus(invoice);
  const totals = computeInvoiceTotals(invoice);
  const customer = store.getCustomer(invoice.customerId);
  const project = invoice.projectId ? store.getProject(invoice.projectId) : undefined;
  const netDays = Math.round((Date.parse(`${invoice.dueDate}T00:00:00`) - Date.parse(`${invoice.issueDate}T00:00:00`)) / 86_400_000);

  const stamp =
    status === "paid" ? { label: "Paid", tone: "green" as const } :
    status === "overdue" ? { label: "Overdue", tone: "red" as const } :
    status === "partial" ? { label: "Partially paid", tone: "amber" as const } :
    status === "cancelled" ? { label: "Cancelled", tone: "slate" as const } :
    status === "draft" ? { label: "Draft", tone: "slate" as const } : undefined;

  return (
    <DocRoot>
      <Letterhead company={company} />
      <DocHeading type="Invoice" number={invoice.number} stamp={stamp} />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Party label="Bill to" name={customer?.name} lines={[customer?.contactPerson && `Attn: ${customer.contactPerson}`, customer?.address, customer?.phone, customer?.email]} />
        <Meta rows={[
          ["Invoice date", docDate(invoice.issueDate)],
          ["Due date", docDate(invoice.dueDate)],
          ["Terms", netDays <= 0 ? "Due on receipt" : `Net ${netDays} days`],
          ["Project", project?.name ?? "—"],
          ["Balance due", <span key="bal" className={cn("font-bold", totals.balance > 0 ? "text-red-700" : "text-emerald-700")}>{formatCurrency(totals.balance)}</span>],
        ]} />
      </div>

      <ItemsTable
        columns={[{ label: "#", width: "32px", align: "center" }, { label: "Description" }, { label: "Qty", align: "right", width: "56px" }, { label: "Unit Price", align: "right", width: "104px" }, { label: "Amount", align: "right", width: "112px" }]}
        rows={invoice.items.map((item, i) => [
          i + 1,
          <span key="d" className="font-medium text-slate-900">{item.description}</span>,
          item.quantity,
          formatCurrency(item.unitPrice),
          formatCurrency(item.quantity * item.unitPrice),
        ])}
      />

      <Totals
        rows={[
          { label: "Subtotal", value: formatCurrency(totals.subtotal) },
          ...(totals.discount > 0 ? [{ label: `Discount (${invoice.discountPercent}%)`, value: `-${formatCurrency(totals.discount)}`, tone: "negative" as const }] : []),
          { label: "VATable amount", value: formatCurrency(totals.taxable) },
          { label: `VAT (${invoice.vatPercent}%)`, value: formatCurrency(totals.vat) },
        ]}
        total={{ label: "Total amount", value: formatCurrency(totals.total) }}
        after={totals.paid > 0 ? [
          { label: "Less: payments received", value: `-${formatCurrency(totals.paid)}`, tone: "positive" },
          { label: "Balance due", value: formatCurrency(totals.balance), tone: "strong" },
        ] : undefined}
        words={pesosInWords(totals.total)}
      />

      {invoice.payments.length > 0 && (
        <div className="mt-5 break-inside-avoid">
          <Eyebrow>Payments received</Eyebrow>
          <table className="mt-1.5 w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="border-b border-slate-300 text-left text-[9px] uppercase tracking-[0.1em] text-slate-500">
                <th className="py-1 pr-2 font-semibold">Date</th>
                <th className="py-1 pr-2 font-semibold">Method</th>
                <th className="py-1 pr-2 font-semibold">Reference</th>
                <th className="py-1 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map(p => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-1 pr-2">{docDate(p.date)}</td>
                  <td className="py-1 pr-2">{PAYMENT_METHODS.find(m => m.id === p.method)?.label ?? p.method}</td>
                  <td className="py-1 pr-2">{p.reference || "—"}</td>
                  <td className="py-1 text-right tabular-nums">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {invoice.notes && <Section title="Notes">{invoice.notes}</Section>}
        {company.paymentInstructions && status !== "paid" && status !== "cancelled" && (
          <Section title="Payment instructions">{company.paymentInstructions}</Section>
        )}
      </div>

      <Signatures
        blocks={[
          { label: "Prepared by", caption: company.name },
          { label: "Received by", name: customer?.contactPerson, caption: "Signature over printed name & date" },
        ]}
      />
      <DocFooter company={company} note="Thank you for your business." />
    </DocRoot>
  );
}

/* ---------- Purchase order ---------- */

const PO_STATUS_LABEL: Record<PurchaseOrder["status"], string> = {
  pending: "Pending approval",
  approved: "Approved",
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
};

export function PurchaseOrderDocument({ order }: { order: PurchaseOrder }) {
  const company = useCompanyProfile();
  const supplier = store.getSupplier(order.supplierId);
  const total = purchaseOrderTotal(order);

  const stamp =
    order.status === "received" ? { label: "Received", tone: "green" as const } :
    order.status === "cancelled" ? { label: "Cancelled", tone: "slate" as const } :
    order.status === "pending" ? { label: "For approval", tone: "amber" as const } : undefined;

  return (
    <DocRoot>
      <Letterhead company={company} />
      <DocHeading type="Purchase Order" number={order.number} stamp={stamp} />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Party label="Supplier" name={supplier?.name} lines={[supplier?.contactPerson && `Attn: ${supplier.contactPerson}`, supplier?.address, supplier?.phone, supplier?.email]} />
        <Party label="Deliver to" name={company.name} lines={[company.address, company.phone]} />
      </div>

      <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-md border border-slate-200 break-inside-avoid">
        {[
          ["PO date", docDate(order.createdAt)],
          ["Expected delivery", order.expectedDate ? docDate(order.expectedDate) : "To be confirmed"],
          ["Status", PO_STATUS_LABEL[order.status]],
          [order.receivedAt ? "Received" : "Items", order.receivedAt ? docDate(order.receivedAt) : String(order.items.length)],
        ].map(([label, value], i) => (
          <div key={label} className={cn("px-3 py-2", i > 0 && "border-l border-slate-200")}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <ItemsTable
        columns={[{ label: "#", width: "32px", align: "center" }, { label: "Material" }, { label: "Qty", align: "right", width: "56px" }, { label: "Unit", width: "64px" }, { label: "Unit Price", align: "right", width: "100px" }, { label: "Amount", align: "right", width: "108px" }]}
        rows={order.items.map((item, i) => {
          const m = store.getMaterial(item.materialId);
          return [
            i + 1,
            <>
              <span className="font-medium text-slate-900">{m?.name ?? "Unknown material"}</span>
              {m?.description && <span className="block text-[9.5px] text-slate-500">{m.description}</span>}
            </>,
            item.quantity,
            m?.unit ?? "—",
            formatCurrency(item.unitPrice),
            formatCurrency(item.quantity * item.unitPrice),
          ];
        })}
      />

      <Totals rows={[]} total={{ label: "Total order amount", value: formatCurrency(total) }} words={pesosInWords(total)} />

      <div className="grid grid-cols-2 gap-6">
        {order.notes && <Section title="Notes">{order.notes}</Section>}
        <Section title="Instructions to supplier">
          {"1. Please reference this PO number on all invoices and delivery receipts.\n2. Notify us before delivery of any shortage, substitution, or price change.\n3. Items that arrive damaged or not as specified may be returned."}
        </Section>
      </div>

      <Signatures
        blocks={[
          { label: "Prepared by", caption: company.name },
          { label: "Approved by", caption: company.name },
          { label: "Supplier acknowledgment", name: supplier?.contactPerson, caption: "Signature over printed name & date" },
        ]}
      />
      <DocFooter company={company} />
    </DocRoot>
  );
}
