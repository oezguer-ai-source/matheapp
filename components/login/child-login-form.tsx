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
      <p className="text-xl text-slate-600 text-center font-medium">
        Melde dich an, um zu üben! 🚀
      </p>

      <label className="flex flex-col gap-2">
        <span className="text-lg font-bold text-slate-800">
          👤 Benutzername
        </span>
        <input
          type="text"
          name="username"
          autoComplete="username"
          placeholder="z. B. mia.müller"
          required
          className="h-14 px-4 text-2xl rounded-2xl border-2 border-orange-200 bg-orange-50/50 text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 focus:outline-none hover:border-orange-300 transition-all"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-lg font-bold text-slate-800">
          🔢 Dein PIN (4 Ziffern)
        </span>
        <PinInput value={pin} onChange={setPin} error={Boolean(state.error)} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-16 rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-400 text-white text-2xl font-bold shadow-lg shadow-orange-200/50 hover:shadow-xl hover:shadow-orange-300/50 hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-orange-300 focus:ring-offset-2 focus:outline-none disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
      >
        {pending ? "Anmelden…" : "Los geht's! 🎯"}
      </button>

      {state.error && <AuthErrorAlertChild message={state.error} />}
    </form>
  );
}
