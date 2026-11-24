import { getStatus, shortfall } from './supplies.js';
import { CATEGORIES, UNITS } from './types.js';
import type {
  FieldErrors,
  FieldName,
  MessageKind,
  Stock,
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
  restockList: byId<HTMLUListElement>('restockList'),
  restockCount: byId<HTMLElement>('restockCount'),
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
  if (status === 'out') return '<span class="status status-out">Out of stock</span>';
  if (status === 'low') return '<span class="status status-low">Low stock</span>';
  return '<span class="status status-ok">In stock</span>';
};

const editIcon =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.5 3.5l3 3L7 16H4v-3z"/><path d="M11.5 5.5l3 3"/></svg>';
const deleteIcon =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12"/><path d="M8 6V4h4v2"/><path d="M5.5 6l.8 10h7.4l.8-10"/></svg>';

const stockLevel = ({ quantity, minimum }: Stock): number =>
  minimum === 0 ? 100 : Math.min(100, Math.round((quantity / (minimum * 2)) * 100));

const rowHtml = (supply: Supply): string => {
  const { id, name, category, stock, supplier } = supply;
  const label = escapeHtml(name);
  const status = getStatus(stock);
  return `
    <tr class="row-${status}">
      <td>
        <span class="item-name">${label}</span>
        ${supplier ? `<span class="item-meta">${escapeHtml(supplier.name)}</span>` : ''}
      </td>
      <td><span class="cat cat-${category.toLowerCase()}">${category}</span></td>
      <td>
        <div class="d-flex align-items-center">
          <div class="stepper">
            <button type="button" data-action="decrease" data-id="${id}"
              aria-label="Decrease quantity of ${label}" ${stock.quantity === 0 ? 'disabled' : ''}>&minus;</button>
            <output aria-label="Quantity of ${label}">${stock.quantity}</output>
            <button type="button" data-action="increase" data-id="${id}"
              aria-label="Increase quantity of ${label}">+</button>
          </div>
          <span class="unit">${stock.unit}</span>
        </div>
        <div class="level level-${status}" aria-hidden="true"><span style="width: ${stockLevel(stock)}%"></span></div>
      </td>
      <td>${stock.minimum} <span class="unit ms-0">${stock.unit}</span></td>
      <td>${statusHtml(supply)}</td>
      <td class="text-end">
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="edit" data-id="${id}"
            aria-label="Edit ${label}" title="Edit">${editIcon}</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${id}"
            aria-label="Delete ${label}" title="Delete">${deleteIcon}</button>
        </div>
      </td>
    </tr>`;
};

const restockItemHtml = (supply: Supply): string => {
  const { id, name, stock } = supply;
  const label = escapeHtml(name);
  const missing = shortfall(stock);
  const note =
    stock.quantity === 0
      ? `<span class="out">Out of stock</span>, buy ${missing} ${stock.unit}`
      : `<span>${stock.quantity} left, buy ${missing} ${stock.unit}</span>`;
  return `
    <li>
      <div class="shopping-item">
        <strong>${label}</strong>
        <span>${note}</span>
      </div>
      <button type="button" class="btn-restock" data-action="restock" data-id="${id}"
        aria-label="Restock ${label} to ${stock.minimum} ${stock.unit}">Restock</button>
    </li>`;
};

export const renderRestock = (items: readonly Supply[]): void => {
  elements.restockCount.textContent = String(items.length);
  elements.restockList.innerHTML =
    items.length === 0
      ? '<li class="shopping-empty">Everything is above its minimum. Nothing to buy.</li>'
      : items.map(restockItemHtml).join('');
};

const messageRow = (text: string, extra = ''): string =>
  `<tr><td colspan="6" class="empty-row">${text}${extra}</td></tr>`;

export const renderSupplies = (visible: readonly Supply[], total: number): void => {
  elements.count.textContent =
    visible.length === total ? `${total} items` : `${visible.length} of ${total} items`;
  if (visible.length === 0) {
    elements.body.innerHTML = messageRow(
      total === 0 ? 'No supplies yet. Add the first item using the form.' : 'No items match these filters.',
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
    `<span class="d-block mb-2 text-danger" role="alert">${escapeHtml(message)}</span>`,
    '<button type="button" class="btn-restock" data-action="retry">Try again</button>',
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
  alert.className = kind === 'danger' ? 'toast-msg toast-danger' : 'toast-msg';
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
