import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "@/services/apiClient";

describe("fetchJson", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fails with a timeout error when the request exceeds the timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      ),
    );

    const request = fetchJson("https://example.test/slow", {
      timeoutMs: 100,
    });
    const assertion = expect(request).rejects.toMatchObject({
      code: "timeout",
      message: "La requ\u00eate a expir\u00e9.",
    });

    await vi.advanceTimersByTimeAsync(100);

    await assertion;
  });

  it("surfaces caller initiated aborts separately from timeouts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      ),
    );

    const controller = new AbortController();
    const request = fetchJson("https://example.test/abort", {
      signal: controller.signal,
      timeoutMs: 1_000,
    });

    controller.abort();

    await expect(request).rejects.toMatchObject({
      code: "aborted",
      message: "La requ\u00eate a \u00e9t\u00e9 interrompue.",
    });
  });
});
