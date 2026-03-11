export class ApiServiceError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiServiceError";
    this.status = status;
  }
}

const buildHeaders = (headers?: HeadersInit) => ({
  Accept: "application/json",
  ...headers,
});

export const fetchJson = async <T>(
  input: string,
  init?: RequestInit & { errorMessage?: string },
): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: buildHeaders(init?.headers),
  });

  if (!response.ok) {
    throw new ApiServiceError(
      init?.errorMessage ?? `Requête API indisponible (${response.status})`,
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiServiceError("La réponse API n'est pas exploitable.");
  }
};
