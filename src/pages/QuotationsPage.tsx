import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { store, formatCurrency, computeQuotationTotals } from "@/lib/data";
import { Plus, Search, FileText } from "lucide-react";

const QuotationsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const quotations = store.getQuotations();

  const filtered = quotations.filter(q =>
    q.description.toLowerCase().includes(search.toLowerCase()) ||
    q.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Quotations"
        description="All quotations across projects"
        actions={<Button onClick={() => navigate('/quotations/new')}><Plus className="h-4 w-4 mr-2" />New Quotation</Button>}
      />

      {quotations.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6" />} title="No quotations yet" description="Create your first quotation from a project." actionLabel="New Quotation" onAction={() => navigate('/quotations/new')} />
      ) : (
        <>
          <div className="mb-6 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
            <table className="w-full min-w-[720px] [&_th]:whitespace-nowrap [&_td_span]:whitespace-nowrap">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">ID</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Description</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Project</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const project = store.getProject(q.projectId);
                  const { total } = computeQuotationTotals(q);
                  return (
                    <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/quotations/${q.id}`)}>
                      <td className="px-6 py-3.5 text-sm font-medium text-foreground">{q.id.toUpperCase()}</td>
                      <td className="px-6 py-3.5 text-sm text-foreground">{q.description}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{project?.name}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          q.status === 'draft' ? 'bg-secondary text-secondary-foreground' :
                          q.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          q.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>{q.status}</span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-right font-semibold tabular-nums text-foreground">{formatCurrency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default QuotationsPage;
