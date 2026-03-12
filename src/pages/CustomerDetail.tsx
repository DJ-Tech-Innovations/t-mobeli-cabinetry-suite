import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { store } from "@/lib/data";
import { ArrowLeft, FolderKanban } from "lucide-react";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = store.getCustomer(id || "");
  const projects = store.getProjectsByCustomer(id || "");

  if (!customer) return <div className="p-8 text-muted-foreground">Customer not found.</div>;

  return (
    <div className="p-8">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>

      <PageHeader title={customer.name} description={customer.address} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Contact Person</p>
          <p className="text-sm font-medium text-foreground">{customer.contactPerson || '—'}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Phone</p>
          <p className="text-sm font-medium text-foreground">{customer.phone || '—'}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Email</p>
          <p className="text-sm font-medium text-foreground">{customer.email || '—'}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[length:var(--font-size-h2)] font-semibold">Projects</h2>
          <Button size="sm" onClick={() => navigate('/projects')}>View All Projects</Button>
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FolderKanban className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No projects for this customer yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  p.status === 'active' ? 'bg-green-100 text-green-700' :
                  p.status === 'on-hold' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-secondary text-secondary-foreground'
                }`}>{p.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;
