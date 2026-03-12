import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { store, formatCurrency, computeQuotationTotals } from "@/lib/data";
import { ArrowRight } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const customers = store.getCustomers();
  const projects = store.getProjects();
  const quotations = store.getQuotations();
  const materials = store.getMaterials();

  const activeProjects = projects.filter(p => p.status === 'active');
  const totalQuotationValue = quotations.reduce((sum, q) => {
    const { total } = computeQuotationTotals(q);
    return sum + total;
  }, 0);

  const recentProjects = [...projects]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const recentQuotations = [...quotations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="p-8">
      <PageHeader title="Dashboard" description="Overview of your business operations" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Customers" value={customers.length} />
        <StatCard label="Active Projects" value={activeProjects.length} subtitle={`${projects.length} total`} />
        <StatCard label="Quotations" value={quotations.length} />
        <StatCard label="Total Quoted" value={formatCurrency(totalQuotationValue)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-[length:var(--font-size-h2)] font-semibold">Recent Projects</h2>
            <button onClick={() => navigate('/projects')} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentProjects.map(project => {
              const customer = store.getCustomer(project.customerId);
              return (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{customer?.name}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    project.status === 'active' ? 'bg-green-100 text-green-700' :
                    project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    {project.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-[length:var(--font-size-h2)] font-semibold">Recent Quotations</h2>
            <button onClick={() => navigate('/quotations')} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentQuotations.map(q => {
              const { total } = computeQuotationTotals(q);
              const project = store.getProject(q.projectId);
              return (
                <button
                  key={q.id}
                  onClick={() => navigate(`/quotations/${q.id}`)}
                  className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{q.description}</p>
                    <p className="text-xs text-muted-foreground">{project?.name} • {q.id.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(total)}</p>
                    <span className={`text-xs font-medium ${
                      q.status === 'draft' ? 'text-muted-foreground' :
                      q.status === 'sent' ? 'text-blue-600' :
                      q.status === 'approved' ? 'text-green-600' : 'text-destructive'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
