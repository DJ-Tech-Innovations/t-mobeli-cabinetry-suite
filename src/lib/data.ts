// In-memory data store for Phase 1 (will migrate to Lovable Cloud later)

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
  approvedQuotationId?: string;
  approvedValue?: number;
  createdAt: string;
}

export interface Material {
  id: string;
  name: string;
  category: 'wood' | 'hardware' | 'finishing' | 'adhesive' | 'other';
  unit: string;
  unitPrice: number;
  description: string;
}

export interface BOMItem {
  id: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  projectId: string;
  description: string;
  items: BOMItem[];
  opexPercent: number;
  discountPercent: number;
  marginPercent: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  assignedAgentId?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  isAgent: boolean;
  commissionPercent: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type AppRole = 'admin' | 'manager' | 'agent' | 'staff';

export interface Permission {
  id: string;
  name: string;
  description: string;
  group: string;
}

export interface Role {
  id: string;
  name: AppRole;
  label: string;
  description: string;
  permissions: string[]; // permission ids
}

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  roleId: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

// Helper
let counter = { customer: 3, project: 3, material: 10, quotation: 2, employee: 5, user: 4, activity: 10 };
const genId = (prefix: string) => `${prefix}-${String(++counter[prefix as keyof typeof counter] || 0).padStart(3, '0')}`;

// Permissions seed
const permissions: Permission[] = [
  { id: 'perm-001', name: 'customers.view', description: 'View customers', group: 'Customers' },
  { id: 'perm-002', name: 'customers.create', description: 'Create customers', group: 'Customers' },
  { id: 'perm-003', name: 'customers.edit', description: 'Edit customers', group: 'Customers' },
  { id: 'perm-004', name: 'customers.delete', description: 'Delete customers', group: 'Customers' },
  { id: 'perm-005', name: 'projects.view', description: 'View projects', group: 'Projects' },
  { id: 'perm-006', name: 'projects.create', description: 'Create projects', group: 'Projects' },
  { id: 'perm-007', name: 'projects.edit', description: 'Edit projects', group: 'Projects' },
  { id: 'perm-008', name: 'projects.delete', description: 'Delete projects', group: 'Projects' },
  { id: 'perm-009', name: 'materials.view', description: 'View materials', group: 'Materials' },
  { id: 'perm-010', name: 'materials.create', description: 'Create materials', group: 'Materials' },
  { id: 'perm-011', name: 'materials.edit', description: 'Edit materials', group: 'Materials' },
  { id: 'perm-012', name: 'materials.delete', description: 'Delete materials', group: 'Materials' },
  { id: 'perm-013', name: 'quotations.view', description: 'View quotations', group: 'Quotations' },
  { id: 'perm-014', name: 'quotations.create', description: 'Create quotations', group: 'Quotations' },
  { id: 'perm-015', name: 'quotations.edit', description: 'Edit quotations', group: 'Quotations' },
  { id: 'perm-016', name: 'quotations.approve', description: 'Approve/reject quotations', group: 'Quotations' },
  { id: 'perm-017', name: 'quotations.delete', description: 'Delete quotations', group: 'Quotations' },
  { id: 'perm-018', name: 'employees.view', description: 'View employees', group: 'Employees' },
  { id: 'perm-019', name: 'employees.create', description: 'Create employees', group: 'Employees' },
  { id: 'perm-020', name: 'employees.edit', description: 'Edit employees', group: 'Employees' },
  { id: 'perm-021', name: 'employees.delete', description: 'Delete employees', group: 'Employees' },
  { id: 'perm-022', name: 'users.view', description: 'View users', group: 'Users' },
  { id: 'perm-023', name: 'users.create', description: 'Create users', group: 'Users' },
  { id: 'perm-024', name: 'users.edit', description: 'Edit users', group: 'Users' },
  { id: 'perm-025', name: 'users.delete', description: 'Delete users', group: 'Users' },
  { id: 'perm-026', name: 'roles.manage', description: 'Manage roles & permissions', group: 'Roles' },
  { id: 'perm-027', name: 'dashboard.view', description: 'View dashboard', group: 'Dashboard' },
  { id: 'perm-028', name: 'reports.view', description: 'View reports & analytics', group: 'Reports' },
];

const allPermIds = permissions.map(p => p.id);

const roles: Role[] = [
  { id: 'role-001', name: 'admin', label: 'Administrator', description: 'Full system access', permissions: [...allPermIds] },
  { id: 'role-002', name: 'manager', label: 'Manager', description: 'Manage operations, approve quotations', permissions: allPermIds.filter(id => !['perm-025', 'perm-026'].includes(id)) },
  { id: 'role-003', name: 'agent', label: 'Agent', description: 'Handle customer quotations and projects', permissions: ['perm-001', 'perm-002', 'perm-003', 'perm-005', 'perm-006', 'perm-007', 'perm-009', 'perm-013', 'perm-014', 'perm-015', 'perm-027'] },
  { id: 'role-004', name: 'staff', label: 'Staff', description: 'Basic operational access', permissions: ['perm-001', 'perm-005', 'perm-009', 'perm-013', 'perm-027'] },
];

// Employees seed
const employees: Employee[] = [
  { id: 'employee-001', name: 'Carlos Rivera', email: 'carlos@tmobeli.com', phone: '+63 917 111 2222', position: 'Sales Manager', department: 'Sales', isAgent: true, commissionPercent: 5, status: 'active', createdAt: '2024-01-01' },
  { id: 'employee-002', name: 'Maria Santos', email: 'maria.s@tmobeli.com', phone: '+63 918 222 3333', position: 'Sales Agent', department: 'Sales', isAgent: true, commissionPercent: 3, status: 'active', createdAt: '2024-01-10' },
  { id: 'employee-003', name: 'Pedro Cruz', email: 'pedro@tmobeli.com', phone: '+63 919 333 4444', position: 'Production Lead', department: 'Production', isAgent: false, commissionPercent: 0, status: 'active', createdAt: '2024-02-01' },
  { id: 'employee-004', name: 'Elena Flores', email: 'elena@tmobeli.com', phone: '+63 920 444 5555', position: 'Purchasing Officer', department: 'Procurement', isAgent: false, commissionPercent: 0, status: 'active', createdAt: '2024-02-15' },
  { id: 'employee-005', name: 'Ricardo Lim', email: 'ricardo@tmobeli.com', phone: '+63 921 555 6666', position: 'Sales Agent', department: 'Sales', isAgent: true, commissionPercent: 4, status: 'inactive', createdAt: '2024-03-01' },
];

// Users seed
const users: User[] = [
  { id: 'user-001', name: 'Admin User', email: 'admin@tmobeli.com', roleId: 'role-001', status: 'active', lastLogin: '2024-03-12', createdAt: '2024-01-01' },
  { id: 'user-002', name: 'Carlos Rivera', email: 'carlos@tmobeli.com', employeeId: 'employee-001', roleId: 'role-002', status: 'active', lastLogin: '2024-03-11', createdAt: '2024-01-01' },
  { id: 'user-003', name: 'Maria Santos', email: 'maria.s@tmobeli.com', employeeId: 'employee-002', roleId: 'role-003', status: 'active', lastLogin: '2024-03-10', createdAt: '2024-01-10' },
  { id: 'user-004', name: 'Pedro Cruz', email: 'pedro@tmobeli.com', employeeId: 'employee-003', roleId: 'role-004', status: 'active', lastLogin: '2024-03-09', createdAt: '2024-02-01' },
];

// Activity log seed
const activities: ActivityLog[] = [
  { id: 'activity-001', userId: 'user-001', action: 'created', entity: 'customer', entityId: 'customer-001', details: 'Created customer Garcia Residence', createdAt: '2024-01-15T09:00:00' },
  { id: 'activity-002', userId: 'user-002', action: 'created', entity: 'project', entityId: 'project-001', details: 'Created project Kitchen Cabinet Set', createdAt: '2024-01-20T10:30:00' },
  { id: 'activity-003', userId: 'user-003', action: 'created', entity: 'quotation', entityId: 'quotation-001', details: 'Created quotation for Kitchen Upper & Lower Cabinets', createdAt: '2024-01-25T14:00:00' },
  { id: 'activity-004', userId: 'user-001', action: 'created', entity: 'customer', entityId: 'customer-002', details: 'Created customer Santos Commercial', createdAt: '2024-02-20T11:00:00' },
  { id: 'activity-005', userId: 'user-002', action: 'created', entity: 'project', entityId: 'project-002', details: 'Created project Office Built-ins', createdAt: '2024-02-25T09:30:00' },
  { id: 'activity-006', userId: 'user-003', action: 'sent', entity: 'quotation', entityId: 'quotation-002', details: 'Sent quotation for Office Shelving Units', createdAt: '2024-03-01T16:00:00' },
  { id: 'activity-007', userId: 'user-001', action: 'created', entity: 'customer', entityId: 'customer-003', details: 'Created customer Reyes Development', createdAt: '2024-03-10T08:00:00' },
  { id: 'activity-008', userId: 'user-002', action: 'updated', entity: 'material', entityId: 'material-001', details: 'Updated price of Marine Plywood 3/4"', createdAt: '2024-03-11T10:00:00' },
  { id: 'activity-009', userId: 'user-003', action: 'created', entity: 'quotation', entityId: 'quotation-002', details: 'Created quotation for Office Shelving Units', createdAt: '2024-03-01T10:00:00' },
  { id: 'activity-010', userId: 'user-001', action: 'approved', entity: 'quotation', entityId: 'quotation-001', details: 'Approved quotation QUOTATION-001', createdAt: '2024-03-12T09:00:00' },
];

// Seed data
const customers: Customer[] = [
  { id: 'customer-001', name: 'Garcia Residence', contactPerson: 'Maria Garcia', phone: '+63 917 123 4567', email: 'maria@garcia.com', address: '123 Mahogany St, Quezon City', createdAt: '2024-01-15' },
  { id: 'customer-002', name: 'Santos Commercial', contactPerson: 'Juan Santos', phone: '+63 918 234 5678', email: 'juan@santos.biz', address: '456 Narra Ave, Makati', createdAt: '2024-02-20' },
  { id: 'customer-003', name: 'Reyes Development', contactPerson: 'Ana Reyes', phone: '+63 919 345 6789', email: 'ana@reyes.dev', address: '789 Acacia Blvd, Pasig', createdAt: '2024-03-10' },
];

const projects: Project[] = [
  { id: 'project-001', customerId: 'customer-001', name: 'Kitchen Cabinet Set', description: 'Full kitchen remodel with custom cabinets', status: 'active', createdAt: '2024-01-20' },
  { id: 'project-002', customerId: 'customer-002', name: 'Office Built-ins', description: 'Custom shelving and desk units for main office', status: 'active', createdAt: '2024-02-25' },
  { id: 'project-003', customerId: 'customer-003', name: 'Bedroom Wardrobes', description: '3 bedroom custom wardrobe installation', status: 'on-hold', createdAt: '2024-03-15' },
];

const materials: Material[] = [
  { id: 'material-001', name: 'Marine Plywood 3/4"', category: 'wood', unit: 'sheet', unitPrice: 1850, description: '4x8 marine plywood' },
  { id: 'material-002', name: 'Marine Plywood 1/2"', category: 'wood', unit: 'sheet', unitPrice: 1450, description: '4x8 marine plywood' },
  { id: 'material-003', name: 'MDF Board 3/4"', category: 'wood', unit: 'sheet', unitPrice: 980, description: '4x8 MDF board' },
  { id: 'material-004', name: 'Soft-Close Hinge', category: 'hardware', unit: 'pc', unitPrice: 85, description: 'Hydraulic soft-close cabinet hinge' },
  { id: 'material-005', name: 'Drawer Slide 18"', category: 'hardware', unit: 'pair', unitPrice: 320, description: 'Full extension ball-bearing slide' },
  { id: 'material-006', name: 'Cabinet Handle - Modern', category: 'hardware', unit: 'pc', unitPrice: 65, description: 'Brushed nickel 128mm handle' },
  { id: 'material-007', name: 'HPL Laminate Sheet', category: 'finishing', unit: 'sheet', unitPrice: 2200, description: '4x8 high-pressure laminate' },
  { id: 'material-008', name: 'Edge Banding PVC', category: 'finishing', unit: 'roll', unitPrice: 180, description: '50m roll, 22mm width' },
  { id: 'material-009', name: 'Wood Glue', category: 'adhesive', unit: 'gallon', unitPrice: 450, description: 'Industrial wood adhesive' },
  { id: 'material-010', name: 'Contact Cement', category: 'adhesive', unit: 'gallon', unitPrice: 380, description: 'For laminate bonding' },
];

const quotations: Quotation[] = [
  {
    id: 'quotation-001', projectId: 'project-001', description: 'Kitchen Upper & Lower Cabinets',
    assignedAgentId: 'employee-002',
    items: [
      { id: 'bom-001', materialId: 'material-001', quantity: 12, unitPrice: 1850, totalPrice: 22200 },
      { id: 'bom-002', materialId: 'material-004', quantity: 24, unitPrice: 85, totalPrice: 2040 },
      { id: 'bom-003', materialId: 'material-005', quantity: 8, unitPrice: 320, totalPrice: 2560 },
      { id: 'bom-004', materialId: 'material-006', quantity: 16, unitPrice: 65, totalPrice: 1040 },
      { id: 'bom-005', materialId: 'material-007', quantity: 6, unitPrice: 2200, totalPrice: 13200 },
    ],
    opexPercent: 15, discountPercent: 5, marginPercent: 25, status: 'draft', createdAt: '2024-01-25',
  },
  {
    id: 'quotation-002', projectId: 'project-002', description: 'Office Shelving Units',
    assignedAgentId: 'employee-001',
    items: [
      { id: 'bom-006', materialId: 'material-003', quantity: 8, unitPrice: 980, totalPrice: 7840 },
      { id: 'bom-007', materialId: 'material-008', quantity: 4, unitPrice: 180, totalPrice: 720 },
    ],
    opexPercent: 12, discountPercent: 0, marginPercent: 20, status: 'sent', createdAt: '2024-03-01',
  },
];

// CRUD operations
export const store = {
  // Customers
  getCustomers: () => [...customers],
  getCustomer: (id: string) => customers.find(c => c.id === id),
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => {
    const c: Customer = { ...data, id: genId('customer'), createdAt: new Date().toISOString().split('T')[0] };
    customers.push(c);
    store.addActivity({ action: 'created', entity: 'customer', entityId: c.id, details: `Created customer ${c.name}` });
    return c;
  },
  updateCustomer: (id: string, data: Partial<Customer>) => {
    const i = customers.findIndex(c => c.id === id);
    if (i >= 0) { customers[i] = { ...customers[i], ...data }; return customers[i]; }
    return null;
  },
  deleteCustomer: (id: string) => {
    const i = customers.findIndex(c => c.id === id);
    if (i >= 0) customers.splice(i, 1);
  },

  // Projects
  getProjects: () => [...projects],
  getProjectsByCustomer: (customerId: string) => projects.filter(p => p.customerId === customerId),
  getProject: (id: string) => projects.find(p => p.id === id),
  addProject: (data: Omit<Project, 'id' | 'createdAt'>) => {
    const p: Project = { ...data, id: genId('project'), createdAt: new Date().toISOString().split('T')[0] };
    projects.push(p);
    store.addActivity({ action: 'created', entity: 'project', entityId: p.id, details: `Created project ${p.name}` });
    return p;
  },
  updateProject: (id: string, data: Partial<Project>) => {
    const i = projects.findIndex(p => p.id === id);
    if (i >= 0) { projects[i] = { ...projects[i], ...data }; return projects[i]; }
    return null;
  },
  deleteProject: (id: string) => {
    const i = projects.findIndex(p => p.id === id);
    if (i >= 0) projects.splice(i, 1);
  },

  // Materials
  getMaterials: () => [...materials],
  getMaterial: (id: string) => materials.find(m => m.id === id),
  addMaterial: (data: Omit<Material, 'id'>) => {
    const m: Material = { ...data, id: genId('material') };
    materials.push(m);
    return m;
  },
  updateMaterial: (id: string, data: Partial<Material>) => {
    const i = materials.findIndex(m => m.id === id);
    if (i >= 0) { materials[i] = { ...materials[i], ...data }; return materials[i]; }
    return null;
  },
  deleteMaterial: (id: string) => {
    const i = materials.findIndex(m => m.id === id);
    if (i >= 0) materials.splice(i, 1);
  },

  // Quotations
  getQuotations: () => [...quotations],
  getQuotationsByProject: (projectId: string) => quotations.filter(q => q.projectId === projectId),
  getQuotation: (id: string) => quotations.find(q => q.id === id),
  addQuotation: (data: Omit<Quotation, 'id' | 'createdAt'>) => {
    const q: Quotation = { ...data, id: genId('quotation'), createdAt: new Date().toISOString().split('T')[0] };
    quotations.push(q);
    store.addActivity({ action: 'created', entity: 'quotation', entityId: q.id, details: `Created quotation ${q.description}` });
    return q;
  },
  updateQuotation: (id: string, data: Partial<Quotation>) => {
    const i = quotations.findIndex(q => q.id === id);
    if (i >= 0) { quotations[i] = { ...quotations[i], ...data }; return quotations[i]; }
    return null;
  },
  deleteQuotation: (id: string) => {
    const i = quotations.findIndex(q => q.id === id);
    if (i >= 0) quotations.splice(i, 1);
  },
  approveQuotation: (id: string) => {
    const q = quotations.find(q => q.id === id);
    if (!q) return null;
    q.status = 'approved';
    q.approvedAt = new Date().toISOString().split('T')[0];
    // Link to project
    const { total } = computeQuotationTotals(q);
    const pi = projects.findIndex(p => p.id === q.projectId);
    if (pi >= 0) {
      projects[pi].approvedQuotationId = q.id;
      projects[pi].approvedValue = total;
    }
    store.addActivity({ action: 'approved', entity: 'quotation', entityId: q.id, details: `Approved quotation ${q.description} (${formatCurrency(total)})` });
    return q;
  },
  rejectQuotation: (id: string) => {
    const q = quotations.find(q => q.id === id);
    if (!q) return null;
    q.status = 'rejected';
    store.addActivity({ action: 'rejected', entity: 'quotation', entityId: q.id, details: `Rejected quotation ${q.description}` });
    return q;
  },

  // Employees
  getEmployees: () => [...employees],
  getEmployee: (id: string) => employees.find(e => e.id === id),
  getAgents: () => employees.filter(e => e.isAgent && e.status === 'active'),
  addEmployee: (data: Omit<Employee, 'id' | 'createdAt'>) => {
    const e: Employee = { ...data, id: genId('employee'), createdAt: new Date().toISOString().split('T')[0] };
    employees.push(e);
    return e;
  },
  updateEmployee: (id: string, data: Partial<Employee>) => {
    const i = employees.findIndex(e => e.id === id);
    if (i >= 0) { employees[i] = { ...employees[i], ...data }; return employees[i]; }
    return null;
  },
  deleteEmployee: (id: string) => {
    const i = employees.findIndex(e => e.id === id);
    if (i >= 0) employees.splice(i, 1);
  },
  getAgentCommissions: (agentId: string) => {
    const agentQuotations = quotations.filter(q => q.assignedAgentId === agentId && q.status === 'approved');
    const agent = employees.find(e => e.id === agentId);
    return agentQuotations.map(q => {
      const { total } = computeQuotationTotals(q);
      return {
        quotationId: q.id,
        description: q.description,
        total,
        commission: total * ((agent?.commissionPercent || 0) / 100),
      };
    });
  },

  // Users
  getUsers: () => [...users],
  getUser: (id: string) => users.find(u => u.id === id),
  addUser: (data: Omit<User, 'id' | 'createdAt'>) => {
    const u: User = { ...data, id: genId('user'), createdAt: new Date().toISOString().split('T')[0] };
    users.push(u);
    return u;
  },
  updateUser: (id: string, data: Partial<User>) => {
    const i = users.findIndex(u => u.id === id);
    if (i >= 0) { users[i] = { ...users[i], ...data }; return users[i]; }
    return null;
  },
  deleteUser: (id: string) => {
    const i = users.findIndex(u => u.id === id);
    if (i >= 0) users.splice(i, 1);
  },

  // Roles & Permissions
  getRoles: () => [...roles],
  getRole: (id: string) => roles.find(r => r.id === id),
  updateRole: (id: string, data: Partial<Role>) => {
    const i = roles.findIndex(r => r.id === id);
    if (i >= 0) { roles[i] = { ...roles[i], ...data }; return roles[i]; }
    return null;
  },
  getPermissions: () => [...permissions],
  getPermission: (id: string) => permissions.find(p => p.id === id),
  getPermissionsByGroup: () => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    });
    return groups;
  },

  // Activity Log
  getActivities: () => [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getRecentActivities: (count = 10) => [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, count),
  addActivity: (data: Omit<ActivityLog, 'id' | 'createdAt'>) => {
    const a: ActivityLog = { ...data, id: genId('activity'), createdAt: new Date().toISOString() };
    activities.push(a);
    return a;
  },
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

export const computeQuotationTotals = (q: Quotation) => {
  const subtotal = q.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const opex = subtotal * (q.opexPercent / 100);
  const costWithOpex = subtotal + opex;
  const discount = costWithOpex * (q.discountPercent / 100);
  const afterDiscount = costWithOpex - discount;
  const margin = afterDiscount * (q.marginPercent / 100);
  const total = afterDiscount + margin;
  return { subtotal, opex, costWithOpex, discount, afterDiscount, margin, total };
};
