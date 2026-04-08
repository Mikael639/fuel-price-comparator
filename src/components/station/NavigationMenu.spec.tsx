import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavigationMenu } from "@/components/station/NavigationMenu";

describe("NavigationMenu", () => {
  it("keeps navigation choices readable on standard cards", () => {
    render(<NavigationMenu lat={48.8566} lng={2.3522} />);

    const googleMapsLink = screen.getByRole("link", { name: /google maps/i });
    const wazeLink = screen.getByRole("link", { name: /waze/i });

    expect(googleMapsLink).toHaveClass("bg-slate-50");
    expect(wazeLink).toHaveClass("text-slate-700");
    expect(screen.getByText("Apple Maps")).toBeVisible();
  });

  it("supports inverse styling for dark promotional cards", () => {
    render(<NavigationMenu lat={48.8566} lng={2.3522} tone="inverse" />);

    expect(screen.getByRole("link", { name: /google maps/i })).toHaveClass("bg-white/10");
    expect(screen.getByRole("link", { name: /apple maps/i })).toHaveClass("text-white");
  });
});
