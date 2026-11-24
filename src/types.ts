export const CATEGORIES = ['Beverages', 'Food', 'Stationery', 'Cleaning', 'Other'] as const;
export const UNITS = ['piece', 'box', 'pack', 'bottle', 'bag', 'roll'] as const;

export type Category = (typeof CATEGORIES)[number];
export type Unit = (typeof UNITS)[number];
export type StockStatus = 'ok' | 'low' | 'out';
export type CategoryFilter = Category | 'all';
export type MessageKind = 'success' | 'danger';

export interface Stock {
  quantity: number;
  minimum: number;
  unit: Unit;
}

export interface Supplier {
  name: string;
}

export interface Supply {
  readonly id: number;
  name: string;
  category: Category;
  stock: Stock;
  supplier?: Supplier;
  notes?: string;
}

export type SupplyInput = Omit<Supply, 'id'>;

export interface SupplyFilters {
  search: string;
  category: CategoryFilter;
  lowStockOnly: boolean;
}

export interface SupplyDraft {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  minimum: string;
  supplier: string;
  notes: string;
}

export type FieldName = 'name' | 'category' | 'quantity' | 'unit' | 'minimum';
export type FieldErrors = Partial<Record<FieldName, string>>;

export type ParseResult =
  | { ok: true; value: SupplyInput }
  | { ok: false; errors: FieldErrors };

export interface Summary {
  total: number;
  lowStock: number;
  outOfStock: number;
  categories: number;
}
