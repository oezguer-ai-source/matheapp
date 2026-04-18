import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar, DashboardStats } from "@/components/child/dashboard-stats";

describe("ProgressBar", () => {
  it("renders 0/500 label when currentPoints=0", () => {
    render(<ProgressBar currentPoints={0} />);
    expect(screen.getByText("0/500 Punkte bis zum Spiel")).toBeInTheDocument();
  });

  it("renders 250/500 label and 50% width when currentPoints=250", () => {
    render(<ProgressBar currentPoints={250} />);
    expect(
      screen.getByText("250/500 Punkte bis zum Spiel")
    ).toBeInTheDocument();

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("renders remaining points message when below threshold", () => {
    render(<ProgressBar currentPoints={250} />);
    expect(screen.getByText("Noch 250 Punkte!")).toBeInTheDocument();
  });

  it("renders 'Spiel freigeschaltet!' when currentPoints >= 500", () => {
    render(<ProgressBar currentPoints={500} />);
    expect(screen.getByText("Spiel freigeschaltet!")).toBeInTheDocument();
  });

  it("caps progress bar width at 100% when currentPoints > 500", () => {
    render(<ProgressBar currentPoints={700} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveStyle({ width: "100%" });
  });
});

describe("DashboardStats", () => {
  const defaultProps = {
    totalPoints: 120,
    exerciseCount: 15,
    gradeLevel: 2,
    displayName: "Max",
  };

  it("renders display name in greeting", () => {
    render(<DashboardStats {...defaultProps} />);
    expect(screen.getByText("Hallo, Max!")).toBeInTheDocument();
  });

  it("renders grade level", () => {
    render(<DashboardStats {...defaultProps} />);
    expect(screen.getByText("Klasse 2")).toBeInTheDocument();
  });

  it("renders total points", () => {
    render(<DashboardStats {...defaultProps} />);
    expect(screen.getByText("120 Punkte")).toBeInTheDocument();
  });

  it("renders exercise count", () => {
    render(<DashboardStats {...defaultProps} />);
    expect(screen.getByText("15 Aufgaben geloest")).toBeInTheDocument();
  });
});
