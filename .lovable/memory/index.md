Design system: Figtree font, amber/gold primary (#D4952E HSL 35 85% 55%), cool neutral grays, shadow-card layered shadows, tabular-nums for prices, label-caps utility.

Architecture: In-memory data store (src/lib/data.ts) with CRUD ops + activity log. Will migrate to Lovable Cloud when user requests persistence.

Pages: Dashboard (with charts, KPIs, activity feed), Customers (list + detail), Projects (list + detail with approved value), Materials, Quotations (list + builder with BOM/OPEX/discount/margin + approve/reject flow), Employees (list + detail with commission tracking), Users, Roles & Permissions (Spatie-style matrix).

Entities: Customer, Project, Material, Quotation, BOMItem, Employee, User, Role, Permission, ActivityLog.

Roles: Admin (full), Manager (no user delete/role manage), Agent (customer/project/quotation ops), Staff (view only).

Quotation approval links to project (approvedQuotationId + approvedValue). Agents earn commission on approved quotations.

Currency: PHP (₱) using Intl.NumberFormat.

Design brief: Professional tool aesthetic, no decorative dashboards, concentric radius (8px inputs, 16px cards, 24px modals), shadow-based not border-based components.
