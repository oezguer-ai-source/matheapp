import type { Metadata } from "next";
import Link from "next/link";
import { upgradeSubscriptionAction } from "./actions";

export const metadata: Metadata = {
  title: "Matheapp — Abo auswaehlen",
};

const packages = [
  {
    tier: "grundschule",
    name: "Grundschulniveau",
    price: "9,99",
    description: "Alle Aufgaben fuer Klasse 4",
    color: "bg-child-green",
    hoverColor: "hover:bg-child-green/90",
    ringColor: "focus:ring-child-green/50",
    borderColor: "border-child-green",
    textColor: "text-white",
  },
  {
    tier: "foerderung",
    name: "Foerderung",
    price: "14,99",
    description: "Zusaetzliche Uebungen und Erklaerungen",
    color: "bg-child-yellow",
    hoverColor: "hover:bg-child-yellow/90",
    ringColor: "focus:ring-child-yellow/50",
    borderColor: "border-child-yellow",
    textColor: "text-slate-900",
  },
  {
    tier: "experte",
    name: "Experte",
    price: "19,99",
    description: "Alle Inhalte und Premium-Features",
    color: "bg-slate-800",
    hoverColor: "hover:bg-slate-700",
    ringColor: "focus:ring-slate-800/50",
    borderColor: "border-slate-800",
    textColor: "text-white",
  },
] as const;

export default function UpgradePage() {
  return (
    <main className="min-h-dvh bg-white p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          Deine Schule braucht ein Abo
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Fuer Klasse 4 brauchst du eines dieser Pakete.
        </p>
      </div>

      {/* Paket-Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.tier}
            className={`rounded-2xl border-2 ${pkg.borderColor} p-6 flex flex-col items-center gap-4`}
          >
            <h2 className="text-2xl font-bold text-slate-900">{pkg.name}</h2>
            <p className="text-xl text-slate-600">{pkg.description}</p>
            <p className="text-3xl font-bold text-slate-900">
              {pkg.price} <span className="text-lg font-normal">Euro/Monat</span>
            </p>
            <form action={upgradeSubscriptionAction}>
              <input type="hidden" name="tier" value={pkg.tier} />
              <button
                type="submit"
                className={`h-14 px-8 rounded-2xl ${pkg.color} ${pkg.hoverColor} ${pkg.textColor} text-xl font-semibold focus:ring-4 ${pkg.ringColor} focus:ring-offset-2 focus:outline-none transition-colors`}
              >
                Jetzt freischalten
              </button>
            </form>
          </div>
        ))}
      </div>

      {/* Zurueck-Link */}
      <Link
        href="/kind/dashboard"
        className="text-center text-lg text-slate-500 underline hover:text-slate-700"
      >
        Zurueck zur Startseite
      </Link>
    </main>
  );
}
