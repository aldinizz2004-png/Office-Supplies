import { CATEGORIES, UNITS } from './types.js';
import type {
  Category,
  FieldErrors,
  ParseResult,
  Stock,
  StockStatus,
  Summary,
  Supply,
  SupplyDraft,
  SupplyFilters,
  SupplyInput,
  Unit,
} from './types.js';

export const isCategory = (value: string): value is Category =>
  (CATEGORIES as readonly string[]).includes(value);

export const isUnit = (value: string): value is Unit =>
  (UNITS as readonly string[]).includes(value);

export const getStatus = ({ quantity, minimum }: Stock): StockStatus => {
  if (quantity === 0) return 'out';
  return quantity < minimum ? 'low' : 'ok';
};

export const needsRestock = (supply: Supply): boolean => getStatus(supply.stock) !== 'ok';

export const shortfall = ({ quantity, minimum }: Stock): number => Math.max(0, minimum - quantity);

export const changeQuantity = (stock: Stock, delta: number): Stock => ({
  ...stock,
  quantity: Math.max(0, stock.quantity + delta),
});

export const filterSupplies = (
  supplies: readonly Supply[],
  { search, category, lowStockOnly }: SupplyFilters,
): Supply[] => {
  const term = search.trim().toLowerCase();
  return supplies.filter(
    (supply) =>
      (term === '' || supply.name.toLowerCase().includes(term)) &&
      (category === 'all' || supply.category === category) &&
      (!lowStockOnly || needsRestock(supply)),
  );
};

export const summarize = (supplies: readonly Supply[]): Summary => ({
  total: supplies.length,
  lowStock: supplies.filter((supply) => getStatus(supply.stock) === 'low').length,
  outOfStock: supplies.filter((supply) => getStatus(supply.stock) === 'out').length,
  categories: new Set(supplies.map((supply) => supply.category)).size,
});

const parseCount = (raw: string): number | null => {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
};

export const parseDraft = (draft: SupplyDraft): ParseResult => {
  const errors: FieldErrors = {};
  const name = draft.name.trim();
  const quantity = parseCount(draft.quantity);
  const minimum = parseCount(draft.minimum);

  if (name === '') errors.name = 'Item name is required.';
  else if (name.length > 60) errors.name = 'Item name must be 60 characters or fewer.';

  if (!isCategory(draft.category)) errors.category = 'Choose a category.';
  if (!isUnit(draft.unit)) errors.unit = 'Choose a unit.';
  if (quantity === null) errors.quantity = 'Enter a whole number, 0 or more.';
  if (minimum === null) errors.minimum = 'Enter a whole number, 0 or more.';

  if (
    Object.keys(errors).length > 0 ||
    !isCategory(draft.category) ||
    !isUnit(draft.unit) ||
    quantity === null ||
    minimum === null
  ) {
    return { ok: false, errors };
  }

  const supplier = draft.supplier.trim();
  const notes = draft.notes.trim();
  const value: SupplyInput = {
    name,
    category: draft.category,
    stock: { quantity, minimum, unit: draft.unit },
    ...(supplier !== '' && { supplier: { name: supplier } }),
    ...(notes !== '' && { notes }),
  };

  return { ok: true, value };
};
