import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedbackOverlay } from "@/components/child/feedback-overlay";

describe("FeedbackOverlay", () => {
  it("renders correct feedback with points when correct=true", () => {
    render(
      <FeedbackOverlay correct={true} pointsEarned={10} correctAnswer={5} />
    );

    expect(screen.getByText("Richtig! +10 Punkte")).toBeInTheDocument();
  });

  it("has green background class when correct=true", () => {
    render(
      <FeedbackOverlay correct={true} pointsEarned={10} correctAnswer={5} />
    );

    const container = screen.getByTestId("feedback-overlay");
    expect(container.className).toContain("bg-green-100");
  });

  it("renders incorrect feedback with correct answer when correct=false", () => {
    render(
      <FeedbackOverlay correct={false} pointsEarned={0} correctAnswer={42} />
    );

    expect(
      screen.getByText("Leider falsch. Die Antwort ist: 42")
    ).toBeInTheDocument();
  });

  it("has red background class when correct=false", () => {
    render(
      <FeedbackOverlay correct={false} pointsEarned={0} correctAnswer={42} />
    );

    const container = screen.getByTestId("feedback-overlay");
    expect(container.className).toContain("bg-red-100");
  });
});
