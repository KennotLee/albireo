"use client";

import { useActionState } from "react";

import { Field } from "@/components/field";

import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <Field
        label="Email or username"
        name="identifier"
        type="text"
        autoComplete="username"
        placeholder="ken"
        autoFocus
        required
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3.5 py-2.5 text-[13px] leading-relaxed text-red-600 dark:text-red-400"
        >
          <span aria-hidden="true" className="mt-0.5 font-mono">
            !
          </span>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-11 rounded-full bg-fg text-sm font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
