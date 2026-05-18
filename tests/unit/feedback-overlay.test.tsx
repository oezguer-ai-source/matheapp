import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedbackOverlay } from "@/components/child/feedback-overlay";

describe("FeedbackOverlay", () => {
  it("renders correct feedback with points when correct=true", () => {
    render(
      <FeedbackOverlay correct={true} pointsEarned={10} correctAnswer={5} />
    );

    expect(screen.getByText("Richtig!")).toBeInTheDocument();
    expect(screen.getByText("+10 Punkte")).toBeInTheDocument();
  });

  it("has green border class when correct=true", () => {
    render(
      <FeedbackOverlay correct={true} pointsEarned={10} correctAnswer={5} />
    );

    const container = screen.getByTestId("feedback-overlay");
    expect(container.className).toContain("border-green-200");
  });

  it("renders incorrect feedback with correct answer when correct=false", () => {
    render(
      <FeedbackOverlay correct={false} pointsEarned={0} correctAnswer={42} />
    );

    expect(screen.getByText("Leider falsch")).toBeInTheDocument();
    expect(screen.getByText(/Die richtige Antwort ist:/)).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("has red border class when correct=false", () => {
    render(
      <FeedbackOverlay correct={false} pointsEarned={0} correctAnswer={42} />
    );

    const container = screen.getByTestId("feedback-overlay");
    expect(container.className).toContain("border-red-200");
  });
});
