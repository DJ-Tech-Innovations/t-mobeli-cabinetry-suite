import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { store, formatCurrency, computeQuotationTotals } from "@/lib/data";
import { ArrowRight, TrendingUp, Users, FolderKanban, FileText, Package, CheckCircle, Clock, AlertTriangle, UserCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STATUS_COLORS = {
  draft: 'hsl(var(--muted-foreground))',
  sent: 'hsl(210, 70%, 50%)',
  approved: 'hsl(142, 60%, 45%)',
  rejected: 'hsl(0, 72%, 51%)',
};

const PROJECT_STATUS_COLORS = {
  active: 'hsl(142, 60%, 45%)',
  'on-hold': 'hsl(45, 90%, 50%)',
  completed: 'hsl(var(--primary))',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const customers = store.getCustomers();
  const projects = store.getProjects();
  const quotations = store.getQuotations();
  const materials = store.getMaterials();
  const employees = store.getEmployees();
  const agents = store.getAgents();
  const recentActivities = store.getRecentActivities(8);

  const activeProjects = projects.filter(p => p.status === 'active');
  const onHoldProjects = projects.filter(p => p.status === 'on-hold');
  const approvedQuotations = quotations.filter(q => q.status === 'approved');
  const pendingQuotations = quotations.filter(q => q.status === 'draft' || q.status === 'sent');

  const totalQuotationValue = quotations.reduce((sum, q) => {
    const { total } = computeQuotationTotals(q);
    return sum + total;
  }, 0);

  const approvedValue = approvedQuotations.reduce((sum, q) => {
    const { total } = computeQuotationTotals(q);
    return sum + total;
  }, 0);

  // Quotation status chart data
  const quotationStatusData = [
    { name: 'Draft', value: quotations.filter(q => q.status === 'draft').length, color: STATUS_COLORS.draft },
    { name: 'Sent', value: quotations.filter(q => q.status === 'sent').length, color: STATUS_COLORS.sent },
    { name: 'Approved', value: approvedQuotations.length, color: STATUS_COLORS.approved },
    { name: 'Rejected', value: quotations.filter(q => q.status === 'rejected').length, color: STATUS_COLORS.rejected },
  ].filter(d => d.value > 0);

  // Project status chart data
  const projectStatusData = [
    { name: 'Active', value: activeProjects.length, color: PROJECT_STATUS_COLORS.active },
    { name: 'On Hold', value: onHoldProjects.length, color: PROJECT_STATUS_COLORS['on-hold'] },
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length, color: PROJECT_STATUS_COLORS.completed },
  ].filter(d => d.value > 0);

  // Top materials by usage
  const materialUsage: Record<string, number> = {};
  quotations.forEach(q => {
    q.items.forEach(item => {
      materialUsage[item.materialId] = (materialUsage[item.materialId] || 0) + item.quantity;
    });
  });
  const topMaterials = Object.entries(materialUsage)
    .map(([id, qty]) => ({ name: store.getMaterial(id)?.name?.split(' ').slice(0, 2).join(' ') || id, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const recentProjects = [...projects]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const recentQuotations = [...quotations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const actionColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-blue-600 bg-blue-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'sent': return 'text-purple-600 bg-purple-100';
      case 'updated': return 'text-amber-600 bg-amber-100';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  return (
    <div className="p-8">
      <PageHeader title="Dashboard" description="Overview of your business operations" />

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Customers" value={customers.length} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Active Projects" value={activeProjects.length} subtitle={`${projects.length} total`} icon={<FolderKanban className="h-4 w-4" />} />
        <StatCard label="Quotations" value={quotations.length} subtitle={`${pendingQuotations.length} pending`} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Approved" value={approvedQuotations.length} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard label="Employees" value={employees.length} subtitle={`${agents.length} agents`} icon={<UserCheck className="h-4 w-4" />} />
        <StatCard label="Materials" value={materials.length} icon={<Package className="h-4 w-4" />} />
      </div>

      {/* KPI Row 2 — Financial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="label-caps">Total Quoted Value</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(totalQuotationValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Across {quotations.length} quotations</p>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="label-caps">Approved Value</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(approvedValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{approvedQuotations.length} approved quotations</p>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="label-caps">On-Hold Projects</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{onHoldProjects.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quotation Pipeline */}
        <div className="bg-card rounded-2xl shadow-card p-6">
          <h2 className="text-[length:var(--font-size-h2)] font-semibold mb-4">Quotation Pipeline</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={quotationStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                  {quotationStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {quotationStatusData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Project Status */}
        <div className="bg-card rounded-2xl shadow-card p-6">
          <h2 className="text-[length:var(--font-size-h2)] font-semibold mb-4">Project Status</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={projectStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                  {projectStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {projectStatusData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Top Materials */}
        <div className="bg-card rounded-2xl shadow-card p-6">
          <h2 className="text-[length:var(--font-size-h2)] font-semibold mb-4">Top Materials Used</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMaterials} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qty" fill="hsl(35, 85%, 55%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity + Recent lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-[length:var(--font-size-h2)] font-semibold">Recent Activity</h2>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border max-h-80 overflow-auto">
            {recentActivities.map(a => {
              const user = a.userId ? store.getUser(a.userId) : null;
              return (
                <div key={a.id} className="px-6 py-3">
                  <div className="flex items-start gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${actionColor(a.action)}`}>
                      {a.action}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{a.details}</p>
                      <p className="text-xs text-muted-foreground">{user?.name || 'System'} • {new Date(a.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
