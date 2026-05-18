import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * ChildCard — bündelt das im Kinder-Bereich wiederkehrende
 * Glass-Card-Pattern (`glass-card rounded-* shadow-* …`).
 *
 * Statt das Muster in jeder View handzuschreiben, liefert diese
 * Komponente konsistente Radien, Schatten und Hover-Verhalten.
 */
const childCardVariants = cva(
  "glass-card animate-fade-in",
  {
    variants: {
      radius: {
        md: "rounded-2xl",
        lg: "rounded-3xl",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
        xl: "p-8",
      },
      elevation: {
        sm: "shadow-sm",
        md: "shadow-md",
        lg: "shadow-lg shadow-orange-100/30",
      },
      interactive: {
        true: "transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      radius: "md",
      padding: "md",
      elevation: "md",
      interactive: false,
    },
  }
);

type ChildCardProps<T extends React.ElementType> = {
  as?: T;
} & VariantProps<typeof childCardVariants> &
  Omit<React.ComponentPropsWithoutRef<T>, "as">;

function ChildCard<T extends React.ElementType = "div">({
  as,
  radius,
  padding,
  elevation,
  interactive,
  className,
  ...props
}: ChildCardProps<T>) {
  const Comp = (as ?? "div") as React.ElementType;
  return (
    <Comp
      data-slot="child-card"
      className={cn(
        childCardVariants({ radius, padding, elevation, interactive }),
        className
      )}
      {...props}
    />
  );
}

export { ChildCard, childCardVariants };
