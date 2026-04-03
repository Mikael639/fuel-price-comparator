export type ApiServiceErrorCode = "http" | "network" | "invalid_json" | "timeout" | "aborted";

export class ApiServiceError extends Error {
  readonly status?: number;
  readonly code: ApiServiceErrorCode;

  constructor(message: string, options?: { status?: number; code?: ApiServiceErrorCode }) {
    super(message);
    this.name = "ApiServiceError";
    this.status = options?.status;
    this.code = options?.code ?? "network";
  }
}

interface FetchJsonOptions extends RequestInit {
  errorMessage?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

const buildHeaders = (headers?: HeadersInit) => ({
  Accept: "application/json",
  ...headers,
});

const isAbortException = (error: unknown) =>
  error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";

const createRequestSignal = (sourceSignal?: AbortSignal | null, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  let didTimeOut = false;

  const abortFromSource = () => {
    controller.abort(sourceSignal?.reason);
  };

  if (sourceSignal?.aborted) {
    abortFromSource();
  } else if (sourceSignal) {
    sourceSignal.addEventListener("abort", abortFromSource, { once: true });
  }

  const timeoutId =
    timeoutMs > 0
      ? globalThis.setTimeout(() => {
          didTimeOut = true;
          controller.abort(new DOMException("Request timed out", "TimeoutError"));
        }, timeoutMs)
      : null;

  return {
    signal: controller.signal,
    didTimeOut: () => didTimeOut,
    cleanup: () => {
      if (timeoutId != null) {
        globalThis.clearTimeout(timeoutId);
      }

      sourceSignal?.removeEventListener("abort", abortFromSource);
    },
  };
};

export const fetchJson = async <T>(input: string, init?: FetchJsonOptions): Promise<T> => {
  const { signal, didTimeOut, cleanup } = createRequestSignal(init?.signal, init?.timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal,
      headers: buildHeaders(init?.headers),
    });

    if (!response.ok) {
      throw new ApiServiceError(init?.errorMessage ?? `Requ\u00eate API indisponible (${response.status})`, {
        status: response.status,
        code: "http",
      });
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      console.error(`[apiClient] La r\u00e9ponse API n'est pas exploitable pour ${input}.`);
      console.error(`[apiClient] Contenu re\u00e7u (100 premiers car.) : ${text.slice(0, 100)}`);
      throw new ApiServiceError("La r\u00e9ponse API n'est pas exploitable.", {
        code: "invalid_json",
      });
    }
  } catch (error) {
    if (error instanceof ApiServiceError) {
      throw error;
    }

    if (isAbortException(error)) {
      throw new ApiServiceError(
        didTimeOut() ? "La requ\u00eate a expir\u00e9." : "La requ\u00eate a \u00e9t\u00e9 interrompue.",
        {
          code: didTimeOut() ? "timeout" : "aborted",
        },
      );
    }

    throw new ApiServiceError(init?.errorMessage ?? "La requ\u00eate r\u00e9seau a \u00e9chou\u00e9.", {
      code: "network",
    });
  } finally {
    cleanup();
  }
};
