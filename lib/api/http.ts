export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  // FormData bodies need the browser to set their own multipart boundary —
  // forcing application/json here would break upload parsing server-side.
  const isFormData = options.body instanceof FormData;

  const response = await fetch(url, {
    ...options,
    headers: isFormData
      ? options.headers
      : { "Content-Type": "application/json", ...options.headers },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.message ?? "Something went wrong. Please try again.",
    );
  }

  return body as T;
}
