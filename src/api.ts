import type { Stock, Supply, SupplyInput } from './types.js';

const BASE_URL = 'http://localhost:3000/supplies';
const TIMEOUT_MS = 8000;

const HTTP_MESSAGES: Record<number, string> = {
  400: 'The server rejected the submitted data.',
  404: 'This supply item no longer exists.',
  500: 'Server error. Please try again later.',
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Could not reach the API. Make sure JSON Server is running on port 3000.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ApiError(
      HTTP_MESSAGES[response.status] ?? `Request failed with status ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export const getSupplies = (): Promise<Supply[]> => request<Supply[]>('');

export const createSupply = (input: SupplyInput): Promise<Supply> =>
  request<Supply>('', { method: 'POST', body: JSON.stringify(input) });

export const updateSupply = (id: number, input: SupplyInput): Promise<Supply> =>
  request<Supply>(`/${id}`, { method: 'PUT', body: JSON.stringify(input) });

export const updateStock = (id: number, stock: Stock): Promise<Supply> =>
  request<Supply>(`/${id}`, { method: 'PATCH', body: JSON.stringify({ stock }) });

export const deleteSupply = async (id: number): Promise<void> => {
  await request<unknown>(`/${id}`, { method: 'DELETE' });
};
