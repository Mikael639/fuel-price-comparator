import { describe, expect, it } from "vitest";
import { formatFuelFillCost, formatMoney, formatPrice } from "@/utils/format";

describe("format utils", () => {
  it("formats prices and fill cost in french locale", () => {
    expect(formatPrice(1.699)).toBe("1,699 \u20ac/L");
    expect(formatMoney(12.5)).toBe("12,50 \u20ac");
    expect(formatFuelFillCost(1.699)).toBe("84,95 \u20ac pour 50L");
  });

  it("returns fallback copy when the fill cost cannot be computed", () => {
    expect(formatFuelFillCost(null)).toBe("Plein indisponible");
  });
});
