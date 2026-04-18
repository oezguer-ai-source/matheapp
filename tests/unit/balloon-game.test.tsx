import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { BalloonGame } from "@/components/child/balloon-game";
import { Balloon } from "@/components/child/balloon";
import { GameOverScreen } from "@/components/child/game-over-screen";

// Mock startGameAction — returns success by default
vi.mock("@/app/(child)/kind/spiel/actions", () => ({
  startGameAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe("BalloonGame", () => {
  it("rendert Spielstart-Screen im idle State", () => {
    render(<BalloonGame currentPoints={600} />);

    expect(
      screen.getByRole("heading", { name: /Ballonplatzen!/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Spiel starten/i })
    ).toBeInTheDocument();
  });

  it("zeigt Score-Counter bei gameState playing", async () => {
    render(<BalloonGame currentPoints={600} />);

    const startButton = screen.getByRole("button", {
      name: /Spiel starten/i,
    });
    fireEvent.click(startButton);

    // After the action resolves, the game transitions to "playing" state
    // which shows score counter and timer
    await waitFor(() => {
      // Score counter shows "0"
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    // Timer shows seconds
    expect(screen.getByText("75s")).toBeInTheDocument();
  });

  it("importiert nicht direkt von Supabase (SC-5)", () => {
    const source = readFileSync(
      resolve(__dirname, "../../components/child/balloon-game.tsx"),
      "utf-8"
    );
    expect(source).not.toMatch(/from\s+["']@\/lib\/supabase/);
    expect(source).not.toMatch(/from\s+["']@supabase/);
  });

  it("zeigt Fehlermeldung wenn startGameAction fehlschlaegt", async () => {
    // Override mock for this test to return error
    const { startGameAction } = await import(
      "@/app/(child)/kind/spiel/actions"
    );
    vi.mocked(startGameAction).mockResolvedValueOnce({
      success: false,
      error: "Nicht genug Punkte.",
    });

    render(<BalloonGame currentPoints={600} />);

    const startButton = screen.getByRole("button", {
      name: /Spiel starten/i,
    });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText("Nicht genug Punkte.")).toBeInTheDocument();
    });

    // Should be back in idle state — start button visible again
    expect(
      screen.getByRole("button", { name: /Spiel starten/i })
    ).toBeInTheDocument();
  });
});

describe("Balloon", () => {
  it("rendert mit korrekten Props und aria-label", () => {
    const onPop = vi.fn();
    render(
      <Balloon
        id={1}
        x={50}
        color="bg-child-yellow"
        speed={5}
        onPop={onPop}
        popped={false}
      />
    );

    const balloon = screen.getByLabelText("Ballon platzen lassen");
    expect(balloon).toBeInTheDocument();
    expect(balloon.tagName).toBe("BUTTON");
  });

  it("ruft onPop mit korrekter ID beim Klick auf", () => {
    const onPop = vi.fn();
    render(
      <Balloon
        id={42}
        x={30}
        color="bg-child-green"
        speed={4}
        onPop={onPop}
        popped={false}
      />
    );

    fireEvent.click(screen.getByLabelText("Ballon platzen lassen"));
    expect(onPop).toHaveBeenCalledWith(42);
    expect(onPop).toHaveBeenCalledTimes(1);
  });
});

describe("GameOverScreen", () => {
  it("zeigt Score und Dashboard-Link", () => {
    render(<GameOverScreen score={15} />);

    expect(screen.getByText("15 Ballons geplatzt!")).toBeInTheDocument();
    expect(screen.getByText("Geschafft!")).toBeInTheDocument();

    const dashboardLink = screen.getByRole("link", {
      name: /Zurueck zum Dashboard/i,
    });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/kind/dashboard");
  });

  it("zeigt Score von 0 korrekt an", () => {
    render(<GameOverScreen score={0} />);

    expect(screen.getByText("0 Ballons geplatzt!")).toBeInTheDocument();
  });
});
