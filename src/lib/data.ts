// In-memory data store for Phase 1 (will migrate to a persistent backend later)

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

export const CATEGORY_COLORS = ['amber', 'blue', 'violet', 'emerald', 'rose', 'cyan', 'orange', 'slate'] as const;
export type CategoryColor = typeof CATEGORY_COLORS[number];

export interface Category {
  id: string;
  name: string;
  description: string;
  color: CategoryColor;
}

export interface Material {
  id: string;
  name: string;
  /** Category id */
  category: string;
  unit: string;
  unitPrice: number;
  description: string;
  stock: number;
  lowStockThreshold: number;
  /** Supplier id, or "" when none */
  supplierId: string;
}

export interface Supplier {
  id: string;
  name: string;
  /** Material category id this supplier mainly provides */
  categoryId: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type StockStatus = 'in-stock' | 'low' | 'out';

export function getStockStatus(m: Pick<Material, 'stock' | 'lowStockThreshold'>): StockStatus {
  if (m.stock <= 0) return 'out';
  if (m.stock <= m.lowStockThreshold) return 'low';
  return 'in-stock';
}

/** Stock relative to the low-stock threshold, capped at 100%. */
export function getStockPercent(m: Pick<Material, 'stock' | 'lowStockThreshold'>): number {
  if (m.lowStockThreshold <= 0) return m.stock > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((m.stock / m.lowStockThreshold) * 100)));
}

export type FurnitureCategory = 'base-unit' | 'wall-unit' | 'wardrobe' | 'bed' | 'tv-cabinet' | 'other';

export const FURNITURE_CATEGORIES: { id: FurnitureCategory; label: string }[] = [
  { id: 'base-unit', label: 'Base Unit' },
  { id: 'wall-unit', label: 'Wall Unit' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'bed', label: 'Bed' },
  { id: 'tv-cabinet', label: 'TV Cabinet' },
  { id: 'other', label: 'Other' },
];

export interface FurnitureBOMItem {
  id: string;
  materialId: string;
  quantity: number;
}

/** A size variant (e.g. Small / Medium / Large) with its own dimensions and bill of materials. */
export interface FurnitureVariant {
  id: string;
  name: string;
  /** Dimensions in millimetres */
  width: number;
  height: number;
  depth: number;
  items: FurnitureBOMItem[];
}

export interface FurnitureTemplate {
  id: string;
  /** Short uppercase identifier used in quotations, e.g. BU-1D2S */
  code: string;
  name: string;
  category: FurnitureCategory;
  description: string;
  /** Data URL of the uploaded image, or "" */
  image: string;
  variants: FurnitureVariant[];
  createdAt: string;
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

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentMethod = 'cash' | 'bank-transfer' | 'check' | 'gcash' | 'card';

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank-transfer', label: 'Bank Transfer' },
  { id: 'check', label: 'Check' },
  { id: 'gcash', label: 'GCash' },
  { id: 'card', label: 'Card' },
];

export interface InvoicePayment {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
}

export interface Invoice {
  id: string;
  /** e.g. INV-2024-001 */
  number: string;
  customerId: string;
  /** "" when not tied to a project */
  projectId: string;
  /** YYYY-MM-DD */
  issueDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  discountPercent: number;
  vatPercent: number;
  notes: string;
  /** Stored lifecycle state; partial / paid / overdue are derived from payments and dates. */
  status: 'draft' | 'sent' | 'cancelled';
  payments: InvoicePayment[];
  createdAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Local date as YYYY-MM-DD. */
export const todayISO = () => new Date().toLocaleDateString('en-CA');

export const addDaysISO = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d + days).toLocaleDateString('en-CA');
};

export function computeInvoiceTotals(inv: Pick<Invoice, 'items' | 'discountPercent' | 'vatPercent' | 'payments'>) {
  const subtotal = round2(inv.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
  const discount = round2(subtotal * (inv.discountPercent / 100));
  const taxable = round2(subtotal - discount);
  const vat = round2(taxable * (inv.vatPercent / 100));
  const total = round2(taxable + vat);
  const paid = round2(inv.payments.reduce((sum, p) => sum + p.amount, 0));
  const balance = round2(Math.max(0, total - paid));
  return { subtotal, discount, taxable, vat, total, paid, balance };
}

export function getInvoiceStatus(inv: Invoice, today = todayISO()): InvoiceStatus {
  if (inv.status === 'cancelled') return 'cancelled';
  if (inv.status === 'draft') return 'draft';
  const { total, paid, balance } = computeInvoiceTotals(inv);
  if (total > 0 && balance <= 0) return 'paid';
  if (inv.dueDate < today) return 'overdue';
  return paid > 0 ? 'partial' : 'sent';
}

export interface PurchaseOrderItem {
  id: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
}

export type PurchaseOrderStatus = 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  /** e.g. PO-2024-001 */
  number: string;
  supplierId: string;
  /** YYYY-MM-DD, or "" */
  expectedDate: string;
  items: PurchaseOrderItem[];
  notes: string;
  status: PurchaseOrderStatus;
  createdAt: string;
  receivedAt?: string;
}

export const purchaseOrderTotal = (po: Pick<PurchaseOrder, 'items'>) =>
  round2(po.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));

export const isOpenPurchaseOrder = (po: Pick<PurchaseOrder, 'status'>) =>
  po.status === 'pending' || po.status === 'approved' || po.status === 'ordered';

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
  /** Unique lowercase key, e.g. "sales-supervisor" */
  name: string;
  label: string;
  description: string;
  permissions: string[]; // permission ids
  /** Built-in role: can't be deleted and its permissions can't be changed */
  isSystem?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  roleId: string;
  /** Extra permission ids granted directly to this user, on top of their role */
  directPermissions?: string[];
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
let counter = { customer: 3, project: 3, category: 5, supplier: 4, template: 4, invoice: 1, payment: 0, line: 2, po: 2, poline: 3, material: 13, quotation: 2, employee: 5, user: 4, role: 4, activity: 10 };
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
  { id: 'role-001', name: 'admin', label: 'Administrator', description: 'Full system access', permissions: [...allPermIds], isSystem: true },
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
  { id: 'user-004', name: 'Pedro Cruz', email: 'pedro@tmobeli.com', employeeId: 'employee-003', roleId: 'role-004', directPermissions: ['perm-011'], status: 'active', lastLogin: '2024-03-09', createdAt: '2024-02-01' },
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

const categories: Category[] = [
  { id: 'wood', name: 'Wood', description: 'Plywood, MDF and boards', color: 'amber' },
  { id: 'hardware', name: 'Hardware', description: 'Hinges, slides and handles', color: 'blue' },
  { id: 'finishing', name: 'Finishing', description: 'Laminates and edge banding', color: 'violet' },
  { id: 'adhesive', name: 'Adhesive', description: 'Glues and cements', color: 'emerald' },
  { id: 'other', name: 'Other', description: 'Miscellaneous supplies', color: 'slate' },
];

const suppliers: Supplier[] = [
  { id: 'supplier-001', name: 'PH Wood Supply Co.', categoryId: 'wood', contactPerson: 'Roberto Dela Cruz', phone: '+63 917 100 2000', email: 'orders@phwood.com', address: '12 Timber St, Valenzuela City', notes: '3–5 day lead time. 30-day payment terms.', status: 'active', createdAt: '2024-01-05' },
  { id: 'supplier-002', name: 'Buildrite Hardware', categoryId: 'hardware', contactPerson: 'Alma Reyes', phone: '+63 918 200 3000', email: 'sales@buildrite.ph', address: '45 Industrial Ave, Caloocan City', notes: 'Minimum order ₱5,000.', status: 'active', createdAt: '2024-01-08' },
  { id: 'supplier-003', name: 'FinishPro Trading', categoryId: 'finishing', contactPerson: 'Dennis Tan', phone: '+63 919 300 4000', email: 'info@finishpro.ph', address: '78 Cavite Export Zone, Rosario', notes: '', status: 'active', createdAt: '2024-01-12' },
  { id: 'supplier-004', name: 'BondMax Industrial', categoryId: 'adhesive', contactPerson: 'Gina Villanueva', phone: '+63 920 400 5000', email: 'supply@bondmax.ph', address: '90 Chemical St, Pasig City', notes: 'COD only.', status: 'active', createdAt: '2024-01-15' },
];

const materials: Material[] = [
  { id: 'material-001', name: 'Marine Plywood 3/4"', category: 'wood', unit: 'sheet', unitPrice: 1850, description: '4x8 marine plywood', stock: 24, lowStockThreshold: 10, supplierId: "supplier-001" },
  { id: 'material-002', name: 'Marine Plywood 1/2"', category: 'wood', unit: 'sheet', unitPrice: 1450, description: '4x8 marine plywood', stock: 17, lowStockThreshold: 8, supplierId: "supplier-001" },
  { id: 'material-003', name: 'MDF Board 3/4"', category: 'wood', unit: 'sheet', unitPrice: 980, description: '4x8 MDF board', stock: 15, lowStockThreshold: 10, supplierId: "supplier-001" },
  { id: 'material-004', name: 'Soft-Close Hinge', category: 'hardware', unit: 'pc', unitPrice: 85, description: 'Hydraulic soft-close cabinet hinge', stock: 120, lowStockThreshold: 50, supplierId: "supplier-002" },
  { id: 'material-005', name: 'Drawer Slide 18"', category: 'hardware', unit: 'pair', unitPrice: 320, description: 'Full extension ball-bearing slide', stock: 36, lowStockThreshold: 20, supplierId: "supplier-002" },
  { id: 'material-006', name: 'Cabinet Handle - Modern', category: 'hardware', unit: 'pc', unitPrice: 65, description: 'Brushed nickel 128mm handle', stock: 80, lowStockThreshold: 40, supplierId: "supplier-002" },
  { id: 'material-007', name: 'HPL Laminate Sheet', category: 'finishing', unit: 'sheet', unitPrice: 2200, description: '4x8 high-pressure laminate', stock: 12, lowStockThreshold: 6, supplierId: "supplier-003" },
  { id: 'material-008', name: 'Edge Banding PVC', category: 'finishing', unit: 'roll', unitPrice: 180, description: '50m roll, 22mm width', stock: 3, lowStockThreshold: 5, supplierId: "supplier-003" },
  { id: 'material-009', name: 'Wood Glue', category: 'adhesive', unit: 'gallon', unitPrice: 450, description: 'Industrial wood adhesive', stock: 10, lowStockThreshold: 4, supplierId: "supplier-004" },
  { id: 'material-010', name: 'Contact Cement', category: 'adhesive', unit: 'gallon', unitPrice: 380, description: 'For laminate bonding', stock: 2, lowStockThreshold: 4, supplierId: "supplier-004" },
  { id: "material-011", name: "Melamine Board 18mm", category: "wood", unit: "sheet", unitPrice: 750, description: "4x8 woodgrain melamine carcass board", stock: 30, lowStockThreshold: 10, supplierId: "supplier-001" },
  { id: "material-012", name: "Backing Board 4mm", category: "wood", unit: "sheet", unitPrice: 180, description: "4x8 white melamine backing", stock: 20, lowStockThreshold: 8, supplierId: "supplier-001" },
  { id: "material-013", name: "Shelf Support Pin", category: "hardware", unit: "pc", unitPrice: 5, description: "5mm nickel shelf pin", stock: 400, lowStockThreshold: 100, supplierId: "supplier-002" },
];

const bom = (prefix: string, rows: [materialId: string, quantity: number][]): FurnitureBOMItem[] =>
  rows.map(([materialId, quantity], i) => ({ id: `${prefix}-${i + 1}`, materialId, quantity }));

const furnitureTemplates: FurnitureTemplate[] = [
  {
    id: 'template-001', code: 'BU-1D2S', name: 'Base Unit — 1 Drawer 2 Swing Doors', category: 'base-unit', image: '', createdAt: '2024-02-01',
    description: 'Standard kitchen/cabinet base unit with one top drawer and two swing doors below.',
    variants: [
      { id: 'variant-001', name: 'Small', width: 600, height: 720, depth: 560, items: bom('v001', [['material-003', 2], ['material-002', 1], ['material-004', 4], ['material-005', 1], ['material-006', 3]]) },
      { id: 'variant-002', name: 'Medium', width: 800, height: 720, depth: 560, items: bom('v002', [['material-003', 3], ['material-002', 1], ['material-004', 4], ['material-005', 1], ['material-006', 3]]) },
      { id: 'variant-003', name: 'Large', width: 1000, height: 720, depth: 560, items: bom('v003', [['material-003', 3], ['material-001', 1], ['material-004', 6], ['material-005', 2], ['material-006', 4]]) },
    ],
  },
  {
    id: 'template-002', code: 'WU-2S', name: 'Wall Unit — 2 Swing Doors', category: 'wall-unit', image: '', createdAt: '2024-02-03',
    description: 'Standard overhead wall cabinet with two swing doors. Suitable for kitchen and storage areas.',
    variants: [
      { id: 'variant-004', name: 'Small', width: 600, height: 720, depth: 320, items: bom('v004', [['material-003', 2], ['material-004', 4], ['material-006', 2], ['material-008', 1], ['material-009', 1]]) },
      { id: 'variant-005', name: 'Medium', width: 900, height: 720, depth: 320, items: bom('v005', [['material-003', 3], ['material-004', 4], ['material-006', 2], ['material-008', 1], ['material-009', 1]]) },
    ],
  },
  {
    id: 'template-003', code: 'WAR-2D', name: 'Wardrobe — 2 Doors', category: 'wardrobe', image: '', createdAt: '2024-02-10',
    description: '2-door full-height wardrobe with hanging rod, shelves, and adjustable shelf pins.',
    variants: [
      { id: 'variant-006', name: 'Small', width: 900, height: 1800, depth: 580, items: bom('v006', [['material-001', 4], ['material-002', 2], ['material-004', 6], ['material-006', 2], ['material-008', 2]]) },
      { id: 'variant-007', name: 'Medium', width: 1200, height: 2100, depth: 600, items: bom('v007', [['material-001', 5], ['material-002', 2], ['material-004', 8], ['material-006', 2], ['material-008', 2]]) },
      { id: 'variant-008', name: 'Large', width: 1500, height: 2400, depth: 600, items: bom('v008', [['material-001', 6], ['material-002', 3], ['material-004', 8], ['material-006', 2], ['material-008', 3]]) },
    ],
  },
  {
    id: 'template-004', code: 'TVC-2DR', name: 'TV Cabinet — 2 Drawers Open Shelf', category: 'tv-cabinet', image: '', createdAt: '2024-02-20',
    description: 'Low-profile TV console with two drawers and an open center shelf for media devices.',
    variants: [
      { id: 'variant-009', name: 'Standard', width: 1800, height: 500, depth: 400, items: bom('v009', [['material-003', 3], ['material-007', 1], ['material-005', 2], ['material-006', 2], ['material-008', 1]]) },
    ],
  },
];

/** Current material cost of one unit of a variant, using live material prices. */
export const getVariantCost = (variant: Pick<FurnitureVariant, 'items'>) =>
  variant.items.reduce((sum, item) => sum + (materials.find(m => m.id === item.materialId)?.unitPrice ?? 0) * item.quantity, 0);

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

const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-002', number: 'PO-2024-002', supplierId: 'supplier-002', expectedDate: '2024-03-25', status: 'received',
    items: [{ id: 'poline-003', materialId: 'material-005', quantity: 30, unitPrice: 320 }],
    notes: '', createdAt: '2024-03-12', receivedAt: '2024-03-24',
  },
  {
    id: 'po-001', number: 'PO-2024-001', supplierId: 'supplier-001', expectedDate: '2024-03-20', status: 'received',
    items: [
      { id: 'poline-001', materialId: 'material-001', quantity: 20, unitPrice: 1850 },
      { id: 'poline-002', materialId: 'material-002', quantity: 15, unitPrice: 1450 },
    ],
    notes: 'Urgent restock for active projects', createdAt: '2024-03-12', receivedAt: '2024-03-19',
  },
];

const invoices: Invoice[] = [
  {
    id: 'invoice-001', number: 'INV-2024-001', customerId: 'customer-001', projectId: 'project-001',
    issueDate: '2024-03-13', dueDate: '2024-04-12',
    items: [
      { id: 'line-001', description: 'Kitchen Upper & Lower Cabinets - Labor & Materials', quantity: 1, unitPrice: 45000 },
      { id: 'line-002', description: 'Installation & Finishing', quantity: 1, unitPrice: 8500 },
    ],
    discountPercent: 5, vatPercent: 12, notes: 'Payment due within 30 days.', status: 'sent', payments: [], createdAt: '2024-03-13',
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

  // Material categories
  getCategories: () => [...categories],
  getCategory: (id: string) => categories.find(c => c.id === id),
  addCategory: (data: Omit<Category, 'id'>) => {
    const c: Category = { ...data, id: genId('category') };
    categories.push(c);
    store.addActivity({ action: 'created', entity: 'category', entityId: c.id, details: `Created material category ${c.name}` });
    return c;
  },
  updateCategory: (id: string, data: Partial<Omit<Category, 'id'>>) => {
    const i = categories.findIndex(c => c.id === id);
    if (i >= 0) { categories[i] = { ...categories[i], ...data }; return categories[i]; }
    return null;
  },
  /** Refuses to delete a category that is still assigned to materials or suppliers. */
  deleteCategory: (id: string) => {
    if (materials.some(m => m.category === id) || suppliers.some(s => s.categoryId === id)) return false;
    const i = categories.findIndex(c => c.id === id);
    if (i >= 0) categories.splice(i, 1);
    return i >= 0;
  },

  // Suppliers
  getSuppliers: () => [...suppliers],
  getSupplier: (id: string) => suppliers.find(s => s.id === id),
  addSupplier: (data: Omit<Supplier, 'id' | 'createdAt'>) => {
    const s: Supplier = { ...data, id: genId('supplier'), createdAt: new Date().toISOString().split('T')[0] };
    suppliers.push(s);
    store.addActivity({ action: 'created', entity: 'supplier', entityId: s.id, details: `Added supplier ${s.name}` });
    return s;
  },
  updateSupplier: (id: string, data: Partial<Omit<Supplier, 'id' | 'createdAt'>>) => {
    const i = suppliers.findIndex(s => s.id === id);
    if (i >= 0) { suppliers[i] = { ...suppliers[i], ...data }; return suppliers[i]; }
    return null;
  },
  /** Refuses to delete a supplier that is still linked to materials. */
  deleteSupplier: (id: string) => {
    if (materials.some(m => m.supplierId === id) || purchaseOrders.some(p => p.supplierId === id)) return false;
    const i = suppliers.findIndex(s => s.id === id);
    if (i >= 0) suppliers.splice(i, 1);
    return i >= 0;
  },

  // Furniture templates
  getTemplates: () => [...furnitureTemplates],
  getTemplate: (id: string) => furnitureTemplates.find(t => t.id === id),
  addTemplate: (data: Omit<FurnitureTemplate, 'id' | 'createdAt'>) => {
    const t: FurnitureTemplate = { ...data, id: genId('template'), createdAt: new Date().toISOString().split('T')[0] };
    furnitureTemplates.push(t);
    store.addActivity({ action: 'created', entity: 'template', entityId: t.id, details: `Created furniture template ${t.code}` });
    return t;
  },
  updateTemplate: (id: string, data: Partial<Omit<FurnitureTemplate, 'id' | 'createdAt'>>) => {
    const i = furnitureTemplates.findIndex(t => t.id === id);
    if (i >= 0) { furnitureTemplates[i] = { ...furnitureTemplates[i], ...data }; return furnitureTemplates[i]; }
    return null;
  },
  deleteTemplate: (id: string) => {
    const i = furnitureTemplates.findIndex(t => t.id === id);
    if (i >= 0) furnitureTemplates.splice(i, 1);
  },
  /** Number of templates whose BOM references the material. */
  countTemplatesUsingMaterial: (materialId: string) =>
    furnitureTemplates.filter(t => t.variants.some(v => v.items.some(i => i.materialId === materialId))).length,

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

  // Purchase orders
  getPurchaseOrders: () => [...purchaseOrders],
  getPurchaseOrder: (id: string) => purchaseOrders.find(p => p.id === id),
  addPurchaseOrder: (data: Omit<PurchaseOrder, 'id' | 'number' | 'status' | 'createdAt' | 'receivedAt'>) => {
    const createdAt = todayISO();
    const prefix = `PO-${createdAt.slice(0, 4)}-`;
    const seq = purchaseOrders
      .filter(p => p.number.startsWith(prefix))
      .reduce((max, p) => Math.max(max, Number(p.number.slice(prefix.length)) || 0), 0) + 1;
    const po: PurchaseOrder = { ...data, id: genId('po'), number: `${prefix}${String(seq).padStart(3, '0')}`, status: 'pending', createdAt };
    purchaseOrders.unshift(po);
    store.addActivity({ action: 'created', entity: 'purchase-order', entityId: po.id, details: `Created purchase order ${po.number} (${formatCurrency(purchaseOrderTotal(po))})` });
    return po;
  },
  updatePurchaseOrder: (id: string, data: Partial<Omit<PurchaseOrder, 'id' | 'number' | 'createdAt'>>) => {
    const i = purchaseOrders.findIndex(p => p.id === id);
    if (i >= 0) { purchaseOrders[i] = { ...purchaseOrders[i], ...data }; return purchaseOrders[i]; }
    return null;
  },
  deletePurchaseOrder: (id: string) => {
    const i = purchaseOrders.findIndex(p => p.id === id);
    if (i >= 0) purchaseOrders.splice(i, 1);
  },
  /** Marks an open order as received and adds its quantities to material stock. */
  receivePurchaseOrder: (id: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po || !isOpenPurchaseOrder(po)) return null;
    for (const item of po.items) {
      const m = materials.find(mat => mat.id === item.materialId);
      if (m) m.stock += item.quantity;
    }
    po.status = 'received';
    po.receivedAt = todayISO();
    store.addActivity({ action: 'updated', entity: 'purchase-order', entityId: po.id, details: `Received ${po.number} — stock updated` });
    return po;
  },

  // Invoices
  getInvoices: () => [...invoices],
  getInvoice: (id: string) => invoices.find(i => i.id === id),
  addInvoice: (data: Omit<Invoice, 'id' | 'number' | 'payments' | 'createdAt'>) => {
    const year = data.issueDate.slice(0, 4) || String(new Date().getFullYear());
    const prefix = `INV-${year}-`;
    const seq = invoices
      .filter(i => i.number.startsWith(prefix))
      .reduce((max, i) => Math.max(max, Number(i.number.slice(prefix.length)) || 0), 0) + 1;
    const inv: Invoice = { ...data, id: genId('invoice'), number: `${prefix}${String(seq).padStart(3, '0')}`, payments: [], createdAt: todayISO() };
    invoices.unshift(inv);
    store.addActivity({ action: 'created', entity: 'invoice', entityId: inv.id, details: `Created invoice ${inv.number}` });
    return inv;
  },
  updateInvoice: (id: string, data: Partial<Omit<Invoice, 'id' | 'number' | 'createdAt'>>) => {
    const i = invoices.findIndex(inv => inv.id === id);
    if (i >= 0) { invoices[i] = { ...invoices[i], ...data }; return invoices[i]; }
    return null;
  },
  deleteInvoice: (id: string) => {
    const i = invoices.findIndex(inv => inv.id === id);
    if (i >= 0) invoices.splice(i, 1);
  },
  recordPayment: (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return null;
    inv.payments = [...inv.payments, { ...payment, id: genId('payment') }];
    if (inv.status === 'draft') inv.status = 'sent';
    store.addActivity({ action: 'updated', entity: 'invoice', entityId: inv.id, details: `Recorded ${formatCurrency(payment.amount)} payment on ${inv.number}` });
    return inv;
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
  addRole: (data: Omit<Role, 'id' | 'isSystem'>) => {
    const r: Role = { ...data, id: genId('role') };
    roles.push(r);
    store.addActivity({ action: 'created', entity: 'role', entityId: r.id, details: `Created role ${r.label}` });
    return r;
  },
  updateRole: (id: string, data: Partial<Omit<Role, 'id' | 'isSystem'>>) => {
    const i = roles.findIndex(r => r.id === id);
    if (i < 0) return null;
    // System roles keep their key and full permission set
    const safe = roles[i].isSystem ? { ...data, name: roles[i].name, permissions: roles[i].permissions } : data;
    roles[i] = { ...roles[i], ...safe };
    return roles[i];
  },
  /** Refuses to delete system roles or roles still assigned to users. */
  deleteRole: (id: string) => {
    const i = roles.findIndex(r => r.id === id);
    if (i < 0 || roles[i].isSystem || users.some(u => u.roleId === id)) return false;
    store.addActivity({ action: 'deleted', entity: 'role', entityId: id, details: `Deleted role ${roles[i].label}` });
    roles.splice(i, 1);
    return true;
  },
  countUsersInRole: (id: string) => users.filter(u => u.roleId === id).length,
  /** Role permissions, extra direct grants, and the combined effective set for a user. */
  getUserPermissions: (userId: string) => {
    const user = users.find(u => u.id === userId);
    const fromRole = roles.find(r => r.id === user?.roleId)?.permissions ?? [];
    const direct = (user?.directPermissions ?? []).filter(p => !fromRole.includes(p));
    return { fromRole, direct, effective: [...new Set([...fromRole, ...direct])] };
  },
  /** Permission check by name, e.g. store.userCan(id, 'materials.edit') */
  userCan: (userId: string, permissionName: string) => {
    const perm = permissions.find(p => p.name === permissionName);
    return !!perm && store.getUserPermissions(userId).effective.includes(perm.id);
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
