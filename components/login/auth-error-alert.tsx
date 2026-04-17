"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AuthErrorAlertChild({ message }: { message: string }) {
  // Raw Tailwind (D-17) — no shadcn import here.
  return (
    <div
      role="alert"
      className="mt-4 p-4 rounded-2xl bg-white border-2 border-red-600 text-red-700 text-lg"
    >
      {message}
    </div>
  );
}

export function AuthErrorAlertTeacher({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="mt-4" role="alert">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
