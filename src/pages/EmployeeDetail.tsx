import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { store, formatCurrency } from "@/lib/data";
import { ArrowLeft, UserCheck, DollarSign, FileText } from "lucide-react";

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const employee = store.getEmployee(id || "");

  if (!employee) return <div className="p-8 text-muted-foreground">Employee not found.</div>;

  const commissions = store.getAgentCommissions(employee.id);
  const totalCommission = commissions.reduce((sum, c) => sum + c.commission, 0);
  const totalSales = commissions.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <button onClick={() => navigate('/employees')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </button>

      <PageHeader title={employee.name} description={`${employee.position} • ${employee.department}`} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Email</p>
          <p className="text-sm font-medium text-foreground">{employee.email}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Phone</p>
          <p className="text-sm font-medium text-foreground">{employee.phone}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Status</p>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-secondary text-secondary-foreground'
          }`}>{employee.status}</span>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6">
          <p className="label-caps mb-1">Role</p>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            employee.isAgent ? 'bg-blue-100 text-blue-700' : 'bg-secondary text-secondary-foreground'
          }`}>{employee.isAgent ? `Agent (${employee.commissionPercent}%)` : 'Staff'}</span>
        </div>
      </div>

      {employee.isAgent && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Sales" value={formatCurrency(totalSales)} icon={<DollarSign className="h-4 w-4" />} />
            <StatCard label="Total Commission" value={formatCurrency(totalCommission)} icon={<UserCheck className="h-4 w-4" />} />
            <StatCard label="Approved Deals" value={commissions.length} icon={<FileText className="h-4 w-4" />} />
          </div>

          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-[length:var(--font-size-h2)] font-semibold">Commission History</h2>
            </div>
            {commissions.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No approved quotations yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Quotation</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Sale Value</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Commission ({employee.commissionPercent}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.quotationId} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/quotations/${c.quotationId}`)}>
                      <td className="px-6 py-3.5">
                        <p className="text-sm font-medium text-foreground">{c.description}</p>
                        <p className="text-xs text-muted-foreground">{c.quotationId.toUpperCase()}</p>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-right font-medium tabular-nums text-foreground">{formatCurrency(c.total)}</td>
                      <td className="px-6 py-3.5 text-sm text-right font-semibold tabular-nums text-green-600">{formatCurrency(c.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeDetail;
