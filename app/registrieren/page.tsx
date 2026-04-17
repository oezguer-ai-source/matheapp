import type { Metadata } from "next";
import { TeacherSignupForm } from "@/components/login/teacher-signup-form";

export const metadata: Metadata = {
  title: "Matheapp — Lehrkraft registrieren",
};

export default function RegistrierenPage() {
  return (
    <main className="min-h-dvh grid place-items-center bg-white px-6 py-16">
      <div className="w-full max-w-md bg-slate-100 rounded-3xl p-8 lg:p-12 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900 text-center mb-2">
          Lehrkraft-Konto erstellen
        </h1>
        <TeacherSignupForm />
      </div>
    </main>
  );
}
