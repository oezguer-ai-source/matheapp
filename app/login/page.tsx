import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Matheapp — Anmelden",
};

export default function LoginPage() {
  return <LoginClient />;
}
