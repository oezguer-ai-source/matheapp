import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberPad } from "@/components/child/number-pad";

describe("NumberPad", () => {
  it("renders all 12 buttons (digits 0-9, delete, confirm)", () => {
    render(
      <NumberPad onDigit={vi.fn()} onDelete={vi.fn()} onConfirm={vi.fn()} />
    );

    // Digits 0-9
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }

    // Delete button (arrow symbol)
    expect(screen.getByLabelText("Loeschen")).toBeInTheDocument();

    // Confirm button
    expect(screen.getByText("OK")).toBeInTheDocument();

    // Total: 12 buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(12);
  });

  it('calls onDigit("5") when digit 5 is clicked', () => {
    const onDigit = vi.fn();
    render(
      <NumberPad onDigit={onDigit} onDelete={vi.fn()} onConfirm={vi.fn()} />
    );

    fireEvent.click(screen.getByText("5"));
    expect(onDigit).toHaveBeenCalledWith("5");
    expect(onDigit).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <NumberPad onDigit={vi.fn()} onDelete={onDelete} onConfirm={vi.fn()} />
    );

    fireEvent.click(screen.getByLabelText("Loeschen"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when OK button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <NumberPad onDigit={vi.fn()} onDelete={vi.fn()} onConfirm={onConfirm} />
    );

    fireEvent.click(screen.getByText("OK"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("all buttons are disabled when disabled=true", () => {
    render(
      <NumberPad
        onDigit={vi.fn()}
        onDelete={vi.fn()}
        onConfirm={vi.fn()}
        disabled={true}
      />
    );

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('all buttons have type="button" (not submit)', () => {
    render(
      <NumberPad onDigit={vi.fn()} onDelete={vi.fn()} onConfirm={vi.fn()} />
    );

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
