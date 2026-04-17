import { logoutAction } from "@/app/login/actions";

export function LogoutButtonChild() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="h-14 w-full lg:w-auto px-8 rounded-2xl bg-yellow-400 text-slate-900 text-4xl font-semibold hover:bg-yellow-500 focus:ring-4 focus:ring-yellow-300 focus:ring-offset-2 focus:outline-none"
      >
        Abmelden
      </button>
    </form>
  );
}
