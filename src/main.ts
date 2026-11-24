import {
  ApiError,
  createSupply,
  deleteSupply,
  getSupplies,
  updateStock,
  updateSupply,
} from './api.js';
import { changeQuantity, filterSupplies, isCategory, parseDraft, summarize } from './supplies.js';
import type { Supply, SupplyFilters } from './types.js';
import * as ui from './ui.js';

interface AppState {
  supplies: Supply[];
  filters: SupplyFilters;
  editingId: number | null;
  pending: Set<number>;
}

const state: AppState = {
  supplies: [],
  filters: { search: '', category: 'all', lowStockOnly: false },
  editingId: null,
  pending: new Set<number>(),
};

const errorText = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

const render = (): void => {
  ui.renderSummary(summarize(state.supplies));
  ui.renderSupplies(filterSupplies(state.supplies, state.filters), state.supplies.length);
};

const findSupply = (id: number): Supply | undefined =>
  state.supplies.find((supply) => supply.id === id);

const replaceSupply = (updated: Supply): void => {
  state.supplies = state.supplies.map((supply) => (supply.id === updated.id ? updated : supply));
};

const stopEditing = (): void => {
  state.editingId = null;
  ui.resetForm();
};

async function loadSupplies(): Promise<void> {
  ui.showLoading();
  try {
    state.supplies = await getSupplies();
    render();
  } catch (error) {
    ui.showLoadError(errorText(error));
  }
}

async function handleSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const result = parseDraft(ui.readDraft());
  if (!result.ok) {
    ui.showFieldErrors(result.errors);
    return;
  }

  ui.clearFieldErrors();
  ui.setSubmitting(true);
  try {
    if (state.editingId === null) {
      const created = await createSupply(result.value);
      state.supplies = [...state.supplies, created];
      ui.showMessage(`${created.name} was added.`);
    } else {
      const updated = await updateSupply(state.editingId, result.value);
      replaceSupply(updated);
      ui.showMessage(`${updated.name} was updated.`);
    }
    stopEditing();
    render();
  } catch (error) {
    ui.showMessage(errorText(error), 'danger');
  } finally {
    ui.setSubmitting(false);
  }
}

async function adjustQuantity(supply: Supply, delta: number): Promise<void> {
  if (state.pending.has(supply.id)) return;
  state.pending.add(supply.id);
  try {
    const updated = await updateStock(supply.id, changeQuantity(supply.stock, delta));
    replaceSupply(updated);
    render();
  } catch (error) {
    ui.showMessage(errorText(error), 'danger');
  } finally {
    state.pending.delete(supply.id);
  }
}

async function removeSupply(supply: Supply): Promise<void> {
  if (!window.confirm(`Delete "${supply.name}" from the supplies list?`)) return;
  try {
    await deleteSupply(supply.id);
    state.supplies = state.supplies.filter((item) => item.id !== supply.id);
    if (state.editingId === supply.id) stopEditing();
    render();
    ui.showMessage(`${supply.name} was deleted.`);
  } catch (error) {
    ui.showMessage(errorText(error), 'danger');
  }
}

function handleTableClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>('button[data-action]');
  if (!button) return;

  const action = button.dataset['action'];
  if (action === 'retry') {
    void loadSupplies();
    return;
  }

  const supply = findSupply(Number(button.dataset['id']));
  if (!supply) return;

  switch (action) {
    case 'increase':
      void adjustQuantity(supply, 1);
      break;
    case 'decrease':
      void adjustQuantity(supply, -1);
      break;
    case 'edit':
      state.editingId = supply.id;
      ui.fillForm(supply);
      break;
    case 'delete':
      void removeSupply(supply);
      break;
  }
}

const bindFilters = (): void => {
  ui.elements.search.addEventListener('input', () => {
    state.filters.search = ui.elements.search.value;
    render();
  });

  ui.elements.categoryFilter.addEventListener('change', () => {
    const value = ui.elements.categoryFilter.value;
    state.filters.category = isCategory(value) ? value : 'all';
    render();
  });

  ui.elements.lowStockOnly.addEventListener('change', () => {
    state.filters.lowStockOnly = ui.elements.lowStockOnly.checked;
    render();
  });

  ui.elements.resetFilters.addEventListener('click', () => {
    state.filters = { search: '', category: 'all', lowStockOnly: false };
    ui.elements.search.value = '';
    ui.elements.categoryFilter.value = 'all';
    ui.elements.lowStockOnly.checked = false;
    render();
  });
};

const init = (): void => {
  ui.populateSelects();
  bindFilters();
  ui.elements.body.addEventListener('click', handleTableClick);
  ui.elements.form.addEventListener('submit', (event) => void handleSubmit(event));
  ui.elements.cancel.addEventListener('click', stopEditing);
  void loadSupplies();
};

init();
