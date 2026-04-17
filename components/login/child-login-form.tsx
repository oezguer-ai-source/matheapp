"use client";

import { useActionState, useState } from "react";
import { childLogin, type LoginActionState } from "@/app/login/actions";
import { PinInput } from "./pin-input";
import { AuthErrorAlertChild } from "./auth-error-alert";

const initialState: LoginActionState = { error: null };

export function ChildLoginForm() {
  const [state, action, pending] = useActionState(childLogin, initialState);
  const [pin, setPin] = useState("");

  return (
    <form
      action={action}
      id="login-panel-child"
      role="tabpanel"
      aria-labelledby="role-tab-child"
      className="flex flex-col gap-6"
    >
      <p className="text-xl text-slate-700 text-center">
        Melde dich an, um zu üben.
      </p>

      <label className="flex flex-col gap-2">
        <span className="text-lg font-semibold text-slate-900">
          Benutzername
        </span>
        <input
          type="text"
          name="username"
          autoComplete="username"
          placeholder="z. B. mia.k"
          required
          className="h-14 px-4 text-4xl rounded-2xl border-2 border-slate-300 bg-white text-slate-900 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 focus:outline-none hover:border-slate-400"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-lg font-semibold text-slate-900">
          Dein PIN (4 Ziffern)
        </span>
        <PinInput value={pin} onChange={setPin} error={Boolean(state.error)} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-2xl bg-yellow-400 text-slate-900 text-4xl font-semibold hover:bg-yellow-500 focus:ring-4 focus:ring-yellow-300 focus:ring-offset-2 focus:outline-none disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        {pending ? "Anmelden\u2026" : "Einloggen"}
      </button>

      {state.error && <AuthErrorAlertChild message={state.error} />}
    </form>
  );
}
