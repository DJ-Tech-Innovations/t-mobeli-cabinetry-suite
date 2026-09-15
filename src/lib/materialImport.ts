import * as XLSX from "xlsx";
import { store, CATEGORY_COLORS, type Category, type Material } from "@/lib/data";

type Field = "name" | "category" | "unit" | "unitPrice" | "stock" | "lowStockThreshold" | "supplier" | "description";

export interface ImportColumn {
  field: Field;
  header: string;
  required: boolean;
  format: string;
  description: string;
  example: string;
  /** Other header spellings accepted, already normalized (lowercase, letters and digits only) */
  aliases: string[];
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { field: "name", header: "Name", required: true, format: "Text", description: "Material name. If it matches an existing material (not case-sensitive), that material is updated instead of duplicated.", example: 'Marine Plywood 1/4"', aliases: ["materialname", "material"] },
  { field: "category", header: "Category", required: true, format: "Text", description: "Category name. Existing categories are matched by name (not case-sensitive); new names are created automatically.", example: "Wood", aliases: ["categoryname"] },
  { field: "unit", header: "Unit", required: true, format: "Text", description: "Unit of measure, e.g. sheet, pc, roll, gallon.", example: "sheet", aliases: ["uom", "unitofmeasure"] },
  { field: "unitPrice", header: "Unit Price", required: true, format: "Number ≥ 0", description: "Price per unit in pesos. ₱ signs and thousands separators are allowed.", example: "650", aliases: ["price", "cost", "unitcost"] },
  { field: "stock", header: "Stock", required: false, format: "Number ≥ 0", description: "Current quantity on hand. Defaults to 0 for new materials.", example: "30", aliases: ["currentstock", "quantity", "qty", "onhand"] },
  { field: "lowStockThreshold", header: "Low Stock Threshold", required: false, format: "Number ≥ 0", description: "Stock level that triggers a low-stock alert. Defaults to 10 for new materials.", example: "10", aliases: ["threshold", "minstock", "minimumstock", "reorderlevel"] },
  { field: "supplier", header: "Supplier", required: false, format: "Text", description: "Supplier name as it appears on the Suppliers page (not case-sensitive). Unknown suppliers are ignored, so add them on the Suppliers page first.", example: "PH Wood Supply Co.", aliases: ["suppliername", "vendor"] },
  { field: "description", header: "Description", required: false, format: "Text", description: "Short description shown under the material name.", example: "4×8 marine plywood", aliases: ["desc", "details"] },
];

const TEMPLATE_ROWS: (string | number)[][] = [
  ['Marine Plywood 1/4"', "Wood", "sheet", 650, 30, 10, "PH Wood Supply Co.", "4×8 marine plywood"],
  ["Laminate Sheet White Gloss", "Laminates", "sheet", 1200, 8, 5, "", "4×8 high-pressure laminate"],
];

export class ImportFileError extends Error {}

export interface ImportRow {
  /** Row number as shown in the spreadsheet */
  rowNumber: number;
  name: string;
  categoryName: string;
  unit: string;
  unitPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  supplierName: string;
  supplierId?: string;
  description?: string;
  /** Matched existing category; undefined means it will be created */
  categoryId?: string;
  existingMaterialId?: string;
  errors: string[];
  warnings: string[];
}

export type RowAction = "create" | "update" | "skip" | "error";

const normalizeHeader = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
/** Case- and whitespace-insensitive key used to match names */
export const nameKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export const getRowAction = (row: ImportRow, updateExisting: boolean): RowAction =>
  row.errors.length > 0 ? "error" : row.existingMaterialId ? (updateExisting ? "update" : "skip") : "create";

export async function readImportFile(file: File): Promise<ImportRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["csv", "xlsx", "xls"].includes(ext)) {
    throw new ImportFileError("Unsupported file type. Upload a .csv, .xlsx or .xls file.");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = ext === "csv"
      ? XLSX.read(await file.text(), { type: "string" })
      : XLSX.read(await file.arrayBuffer(), { type: "array" });
  } catch {
    throw new ImportFileError("Couldn't read this file. Make sure it's a valid CSV or Excel file.");
  }

  const sheetName =
    workbook.SheetNames.find(n => normalizeHeader(n) === "materials") ??
    workbook.SheetNames.find(n => normalizeHeader(n) !== "instructions");
  if (!sheetName) throw new ImportFileError("The file doesn't contain any sheets.");

  const grid = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", blankrows: true, raw: true });
  return parseGrid(grid);
}

export function parseGrid(grid: unknown[][]): ImportRow[] {
  const isBlank = (row: unknown[] | undefined) => !row || row.every(c => String(c ?? "").trim() === "");
  const headerIndex = grid.findIndex(r => !isBlank(r));
  if (headerIndex < 0) throw new ImportFileError("The file is empty.");

  const header = grid[headerIndex].map(normalizeHeader);
  const columnIndex: Partial<Record<Field, number>> = {};
  for (const col of IMPORT_COLUMNS) {
    const names = [normalizeHeader(col.header), ...col.aliases];
    const i = header.findIndex(h => names.includes(h));
    if (i >= 0) columnIndex[col.field] = i;
  }
  const missing = IMPORT_COLUMNS.filter(c => c.required && columnIndex[c.field] === undefined).map(c => c.header);
  if (missing.length > 0) {
    throw new ImportFileError(`Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Download the template to get the correct headers.`);
  }

  const categories = store.getCategories();
  const suppliers = store.getSuppliers();
  const materials = store.getMaterials();
  const seenNames = new Map<string, number>();
  const rows: ImportRow[] = [];

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i];
    if (isBlank(cells)) continue;

    const rowNumber = i + 1;
    const errors: string[] = [];
    const warnings: string[] = [];
    const cell = (field: Field) => (columnIndex[field] === undefined ? "" : cells[columnIndex[field]!]);
    const text = (field: Field) => String(cell(field) ?? "").trim();
    const number = (field: Field, label: string, required: boolean) => {
      const raw = cell(field);
      let value: number;
      if (typeof raw === "number") {
        value = raw;
      } else {
        const cleaned = String(raw ?? "").replace(/php|₱|,|\s/gi, "");
        if (!cleaned) {
          if (required) errors.push(`${label} is required`);
          return undefined;
        }
        value = Number(cleaned);
      }
      if (!Number.isFinite(value)) {
        errors.push(`${label} must be a number`);
        return undefined;
      }
      if (value < 0) errors.push(`${label} can't be negative`);
      return value;
    };

    const name = text("name");
    const categoryName = text("category");
    const unit = text("unit");
    if (!name) errors.push("Name is required");
    if (!categoryName) errors.push("Category is required");
    if (!unit) errors.push("Unit is required");
    const unitPrice = number("unitPrice", "Unit Price", true);
    const stock = number("stock", "Stock", false);
    const lowStockThreshold = number("lowStockThreshold", "Low Stock Threshold", false);

    if (name) {
      const firstRow = seenNames.get(nameKey(name));
      if (firstRow) errors.push(`Duplicate of row ${firstRow}`);
      else seenNames.set(nameKey(name), rowNumber);
    }

    const supplierName = text("supplier");
    let supplierId: string | undefined;
    if (supplierName) {
      supplierId = suppliers.find(s => nameKey(s.name) === nameKey(supplierName))?.id;
      if (!supplierId) warnings.push(`Supplier "${supplierName}" not found, so it won't be set`);
    }

    rows.push({
      rowNumber,
      name,
      categoryName,
      unit,
      unitPrice,
      stock,
      lowStockThreshold,
      supplierName,
      supplierId,
      description: text("description") || undefined,
      categoryId: categoryName ? categories.find(c => nameKey(c.name) === nameKey(categoryName))?.id : undefined,
      existingMaterialId: name ? materials.find(m => nameKey(m.name) === nameKey(name))?.id : undefined,
      errors,
      warnings,
    });
  }

  if (rows.length === 0) throw new ImportFileError("No material rows found below the header row.");
  return rows;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  categoriesCreated: string[];
}

export function applyImport(rows: ImportRow[], updateExisting: boolean): ImportResult {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, categoriesCreated: [] };
  const resolvedCategories = new Map<string, Category>();

  for (const row of rows) {
    const action = getRowAction(row, updateExisting);
    if (action === "error" || action === "skip") {
      result.skipped++;
      continue;
    }

    // Upsert the category: reuse an existing one by name, otherwise create it once
    let categoryId = row.categoryId;
    if (!categoryId) {
      const key = nameKey(row.categoryName);
      let category = resolvedCategories.get(key) ?? store.getCategories().find(c => nameKey(c.name) === key);
      if (!category) {
        category = store.addCategory({
          name: row.categoryName,
          description: "",
          color: CATEGORY_COLORS[store.getCategories().length % CATEGORY_COLORS.length],
        });
        result.categoriesCreated.push(category.name);
      }
      resolvedCategories.set(key, category);
      categoryId = category.id;
    }

    if (action === "update") {
      // Blank optional cells keep the material's current values
      const patch: Partial<Material> = { name: row.name, category: categoryId, unit: row.unit, unitPrice: row.unitPrice! };
      if (row.stock !== undefined) patch.stock = row.stock;
      if (row.lowStockThreshold !== undefined) patch.lowStockThreshold = row.lowStockThreshold;
      if (row.supplierId !== undefined) patch.supplierId = row.supplierId;
      if (row.description !== undefined) patch.description = row.description;
      store.updateMaterial(row.existingMaterialId!, patch);
      result.updated++;
    } else {
      store.addMaterial({
        name: row.name,
        category: categoryId,
        unit: row.unit,
        unitPrice: row.unitPrice!,
        stock: row.stock ?? 0,
        lowStockThreshold: row.lowStockThreshold ?? 10,
        supplierId: row.supplierId ?? "",
        description: row.description ?? "",
      });
      result.created++;
    }
  }

  if (result.created + result.updated > 0) {
    const newCats = result.categoriesCreated.length;
    store.addActivity({
      action: "imported",
      entity: "material",
      entityId: "",
      details: `Imported materials: ${result.created} added, ${result.updated} updated${newCats ? `, ${newCats} new ${newCats === 1 ? "category" : "categories"}` : ""}`,
    });
  }

  return result;
}

export function downloadTemplate(format: "xlsx" | "csv") {
  const materialsSheet = XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS.map(c => c.header), ...TEMPLATE_ROWS]);
  materialsSheet["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 24 }, { wch: 32 }];

  if (format === "csv") {
    // BOM so Excel opens the file as UTF-8 (keeps ₱, × and quotes intact)
    const blob = new Blob(["﻿" + XLSX.utils.sheet_to_csv(materialsSheet)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "materials-import-template.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const categoryNames = store.getCategories().map(c => c.name).join(", ");
  const supplierNames = store.getSuppliers().filter(s => s.status === "active").map(s => s.name).join(", ");
  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ["Materials Import: Instructions"],
    [],
    ["How to use"],
    ['1. Fill in the "Materials" sheet, one material per row. Keep the header row as it is.'],
    ["2. Delete the example rows before importing."],
    ["3. Save the file, then on the Materials page click Import and upload it (.xlsx, .xls or .csv)."],
    ["4. Review the preview. Rows with errors are skipped, and nothing is saved until you confirm."],
    [],
    ["Columns"],
    ["Column", "Required", "Format", "Description", "Example"],
    ...IMPORT_COLUMNS.map(c => [c.header, c.required ? "Yes" : "No", c.format, c.description, c.example]),
    [],
    ["Rules"],
    ["• Categories are matched by name, ignoring upper/lower case. A category that doesn't exist yet is created automatically."],
    ["• A row whose Name matches an existing material updates that material (you can turn this off in the preview). Blank optional cells keep current values."],
    ["• Suppliers must already exist on the Suppliers page. Unknown supplier names are ignored."],
    ["• Numbers may include ₱ signs and thousands separators, e.g. ₱1,850.00."],
    ["• Each material name can appear only once in the file."],
    [],
    ["Current categories", categoryNames || "(none)"],
    ["Active suppliers", supplierNames || "(none)"],
  ]);
  instructionsSheet["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 90 }, { wch: 22 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
  XLSX.utils.book_append_sheet(workbook, materialsSheet, "Materials");
  XLSX.writeFile(workbook, "materials-import-template.xlsx");
}
