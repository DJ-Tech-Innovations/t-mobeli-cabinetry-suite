import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { store, formatCurrency, computeQuotationTotals } from "@/lib/data";
import { ArrowLeft, FileText, Plus } from "lucide-react";

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = store.getProject(id || "");
  const customer = project ? store.getCustomer(project.customerId) : null;
  const quotations = store.getQuotationsByProject(id || "");

  if (!project) return <div className="p-8 text-muted-foreground">Project not found.</div>;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </button>

      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <Button onClick={() => navigate(`/quotations/new?projectId=${project.id}`)}>
            <Plus className="h-4 w-4 mr-2" />Create Quotation
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Customer</p>
          <p className="text-sm font-medium text-foreground">{customer?.name}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Status</p>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            project.status === 'active' ? 'bg-green-100 text-green-700' :
            project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-700' :
            'bg-secondary text-secondary-foreground'
          }`}>{project.status}</span>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Created</p>
          <p className="text-sm font-medium text-foreground">{project.createdAt}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Approved Value</p>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {project.approvedValue ? formatCurrency(project.approvedValue) : '—'}
          </p>
          {project.approvedQuotationId && (
            <p className="text-xs text-primary mt-1 cursor-pointer hover:underline" onClick={() => navigate(`/quotations/${project.approvedQuotationId}`)}>
              {project.approvedQuotationId.toUpperCase()}
            </p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[length:var(--font-size-h2)] font-semibold">Quotations</h2>
        </div>
        {quotations.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">No quotations yet for this project.</p>
            <Button size="sm" onClick={() => navigate(`/quotations/new?projectId=${project.id}`)}>Create Quotation</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {quotations.map(q => {
              const { total } = computeQuotationTotals(q);
              return (
                <button
                  key={q.id}
                  onClick={() => navigate(`/quotations/${q.id}`)}
                  className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{q.description}</p>
                    <p className="text-xs text-muted-foreground">{q.id.toUpperCase()} • {q.createdAt}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(total)}</p>
                    <span className={`text-xs font-medium ${
                      q.status === 'draft' ? 'text-muted-foreground' :
                      q.status === 'sent' ? 'text-blue-600' :
                      q.status === 'approved' ? 'text-green-600' : 'text-destructive'
                    }`}>{q.status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
