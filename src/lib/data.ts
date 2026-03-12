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
  createdAt: string;
}

// Helper
let counter = { customer: 3, project: 3, material: 10, quotation: 2 };
const genId = (prefix: string) => `${prefix}-${String(++counter[prefix as keyof typeof counter] || 0).padStart(3, '0')}`;

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
