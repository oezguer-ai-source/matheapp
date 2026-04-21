import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { BalloonGame } from "@/components/child/balloon-game";
import { Balloon } from "@/components/child/balloon";
import { GameOverScreen } from "@/components/child/game-over-screen";

vi.mock("@/app/(child)/kind/spiel/actions", () => ({
  saveGameScoreAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe("BalloonGame", () => {
  it("rendert Spielstart-Screen im idle State", () => {
    render(<BalloonGame />);

    expect(
      screen.getByRole("heading", { name: /Ballonplatzen/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Los geht/i })
    ).toBeInTheDocument();
  });

  it("zeigt Score-Counter und Timer nach Spielstart", () => {
    render(<BalloonGame />);

    fireEvent.click(screen.getByRole("button", { name: /Los geht/i }));

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("60s")).toBeInTheDocument();
  });

  it("importiert nicht direkt von Supabase (SC-5)", () => {
    const source = readFileSync(
      resolve(__dirname, "../../components/child/balloon-game.tsx"),
      "utf-8"
    );
    expect(source).not.toMatch(/from\s+["']@\/lib\/supabase/);
    expect(source).not.toMatch(/from\s+["']@supabase/);
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
  it("zeigt Score, Einheit und Nochmal-Button", () => {
    const onRestart = vi.fn();
    render(
      <GameOverScreen
        gameKey="balloon"
        score={15}
        scoreUnit="Ballons"
        onRestart={onRestart}
      />
    );

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Ballons")).toBeInTheDocument();
    expect(screen.getByText("Geschafft!")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Nochmal/i })
    ).toBeInTheDocument();
  });

  it("ruft onRestart beim Klick auf Nochmal-Button", () => {
    const onRestart = vi.fn();
    render(
      <GameOverScreen
        gameKey="balloon"
        score={0}
        scoreUnit="Ballons"
        onRestart={onRestart}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Nochmal/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
