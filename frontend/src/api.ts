export interface CalculationRequest {
  expression: string;
}

export interface CalculationResponse {
  result: number;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function calculate(
  payload: CalculationRequest,
  signal?: AbortSignal,
): Promise<CalculationResponse> {
  const response = await fetch(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('result' in body) ||
    typeof body.result !== 'number' ||
    !Number.isFinite(body.result)
  ) {
    throw new Error('The API returned an invalid result.');
  }

  return { result: body.result };
}

export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, { signal });
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null && 'status' in body && body.status === 'ok';
  } catch {
    return false;
  }
}
