import { getStatus, shortfall } from './supplies.js';
import { CATEGORIES, UNITS } from './types.js';
import type {
  FieldErrors,
  FieldName,
  MessageKind,
  Summary,
  Supply,
  SupplyDraft,
} from './types.js';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
};

export const elements = {
  body: byId<HTMLTableSectionElement>('supplyBody'),
  count: byId<HTMLElement>('resultCount'),
  messages: byId<HTMLElement>('messages'),
  search: byId<HTMLInputElement>('searchInput'),
  categoryFilter: byId<HTMLSelectElement>('categoryFilter'),
  lowStockOnly: byId<HTMLInputElement>('lowStockOnly'),
  resetFilters: byId<HTMLButtonElement>('resetFilters'),
  form: byId<HTMLFormElement>('supplyForm'),
  formTitle: byId<HTMLElement>('formTitle'),
  submit: byId<HTMLButtonElement>('submitButton'),
  cancel: byId<HTMLButtonElement>('cancelEdit'),
  statTotal: byId<HTMLElement>('statTotal'),
  statLow: byId<HTMLElement>('statLow'),
  statOut: byId<HTMLElement>('statOut'),
  statCategories: byId<HTMLElement>('statCategories'),
};

const fields: Record<FieldName | 'supplier' | 'notes', HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> = {
  name: byId<HTMLInputElement>('name'),
  category: byId<HTMLSelectElement>('category'),
  quantity: byId<HTMLInputElement>('quantity'),
  unit: byId<HTMLSelectElement>('unit'),
  minimum: byId<HTMLInputElement>('minimum'),
  supplier: byId<HTMLInputElement>('supplier'),
  notes: byId<HTMLTextAreaElement>('notes'),
};

const fieldNames: FieldName[] = ['name', 'category', 'quantity', 'unit', 'minimum'];

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] ?? char;
  });

const optionsHtml = (values: readonly string[]): string =>
  values.map((value) => `<option value="${value}">${value}</option>`).join('');

export const populateSelects = (): void => {
  elements.categoryFilter.innerHTML = `<option value="all">All categories</option>${optionsHtml(CATEGORIES)}`;
  fields.category.innerHTML = `<option value="">Choose a category</option>${optionsHtml(CATEGORIES)}`;
  fields.unit.innerHTML = `<option value="">Choose a unit</option>${optionsHtml(UNITS)}`;
};

const statusHtml = (supply: Supply): string => {
  const status = getStatus(supply.stock);
  if (status === 'out') return '<span class="badge text-bg-danger">Out of stock</span>';
  if (status === 'low') {
    return `<span class="badge text-bg-warning">Low stock</span>
      <small class="d-block text-danger-emphasis">Needs ${shortfall(supply.stock)} more</small>`;
  }
  return '<span class="badge text-bg-success">In stock</span>';
};

const rowHtml = (supply: Supply): string => {
  const { id, name, category, stock, supplier } = supply;
  const label = escapeHtml(name);
  const rowClass = getStatus(stock) === 'ok' ? '' : 'table-warning';
  return `
    <tr class="${rowClass}">
      <td>
        <strong>${label}</strong>
        ${supplier ? `<small class="d-block text-secondary">${escapeHtml(supplier.name)}</small>` : ''}
      </td>
      <td>${category}</td>
      <td>
        <div class="qty-control">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-action="decrease" data-id="${id}"
            aria-label="Decrease quantity of ${label}" ${stock.quantity === 0 ? 'disabled' : ''}>-</button>
          <span class="qty-value" aria-label="Quantity of ${label}">${stock.quantity}</span>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-action="increase" data-id="${id}"
            aria-label="Increase quantity of ${label}">+</button>
        </div>
      </td>
      <td>${stock.unit}</td>
      <td>${stock.minimum}</td>
      <td>${statusHtml(supply)}</td>
      <td class="text-end text-nowrap">
        <button type="button" class="btn btn-outline-primary btn-sm" data-action="edit" data-id="${id}"
          aria-label="Edit ${label}">Edit</button>
        <button type="button" class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${id}"
          aria-label="Delete ${label}">Delete</button>
      </td>
    </tr>`;
};

const messageRow = (text: string, extra = ''): string =>
  `<tr><td colspan="7" class="text-center text-secondary py-4">${text}${extra}</td></tr>`;

export const renderSupplies = (visible: readonly Supply[], total: number): void => {
  elements.count.textContent = `Showing ${visible.length} of ${total} items`;
  if (visible.length === 0) {
    elements.body.innerHTML = messageRow(
      total === 0 ? 'No supplies yet. Add the first item using the form.' : 'No items match your filters.',
    );
    return;
  }
  elements.body.innerHTML = visible.map(rowHtml).join('');
};

export const showLoading = (): void => {
  elements.count.textContent = 'Loading...';
  elements.body.innerHTML = messageRow(
    '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading supplies...',
  );
};

export const showLoadError = (message: string): void => {
  elements.count.textContent = '';
  elements.body.innerHTML = messageRow(
    `<span class="text-danger d-block mb-2" role="alert">${escapeHtml(message)}</span>`,
    '<button type="button" class="btn btn-outline-primary btn-sm" data-action="retry">Try again</button>',
  );
};

export const renderSummary = (summary: Summary): void => {
  elements.statTotal.textContent = String(summary.total);
  elements.statLow.textContent = String(summary.lowStock + summary.outOfStock);
  elements.statOut.textContent = String(summary.outOfStock);
  elements.statCategories.textContent = String(summary.categories);
};

let messageTimer: number | undefined;

export const showMessage = (text: string, kind: MessageKind = 'success'): void => {
  window.clearTimeout(messageTimer);
  const alert = document.createElement('div');
  alert.className = `alert alert-${kind} py-2 mb-3`;
  alert.setAttribute('role', kind === 'danger' ? 'alert' : 'status');
  alert.textContent = text;
  elements.messages.replaceChildren(alert);
  messageTimer = window.setTimeout(() => elements.messages.replaceChildren(), 4000);
};

export const readDraft = (): SupplyDraft => ({
  name: fields.name.value,
  category: fields.category.value,
  quantity: fields.quantity.value,
  unit: fields.unit.value,
  minimum: fields.minimum.value,
  supplier: fields.supplier.value,
  notes: fields.notes.value,
});

export const clearFieldErrors = (): void => {
  for (const name of fieldNames) {
    fields[name].classList.remove('is-invalid');
    fields[name].removeAttribute('aria-invalid');
    byId<HTMLElement>(`${name}Error`).textContent = '';
  }
};

export const showFieldErrors = (errors: FieldErrors): void => {
  clearFieldErrors();
  let firstInvalid: HTMLElement | null = null;
  for (const name of fieldNames) {
    const message = errors[name];
    if (!message) continue;
    fields[name].classList.add('is-invalid');
    fields[name].setAttribute('aria-invalid', 'true');
    byId<HTMLElement>(`${name}Error`).textContent = message;
    firstInvalid ??= fields[name];
  }
  firstInvalid?.focus();
};

export const resetForm = (): void => {
  elements.form.reset();
  clearFieldErrors();
  elements.formTitle.textContent = 'Add supply item';
  elements.submit.textContent = 'Add item';
  elements.cancel.classList.add('d-none');
};

export const fillForm = (supply: Supply): void => {
  clearFieldErrors();
  fields.name.value = supply.name;
  fields.category.value = supply.category;
  fields.quantity.value = String(supply.stock.quantity);
  fields.unit.value = supply.stock.unit;
  fields.minimum.value = String(supply.stock.minimum);
  fields.supplier.value = supply.supplier?.name ?? '';
  fields.notes.value = supply.notes ?? '';
  elements.formTitle.textContent = `Edit ${supply.name}`;
  elements.submit.textContent = 'Save changes';
  elements.cancel.classList.remove('d-none');
  fields.name.focus();
};

export const setSubmitting = (busy: boolean): void => {
  elements.submit.disabled = busy;
};
