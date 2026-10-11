"use client";

import { useActionState } from "react";

import { Field } from "@/components/field";

import { signup, type SignupState } from "./actions";

const initialState: SignupState = { error: null, pending: null };

export function SignupForm() {
  const [state, formAction, submitting] = useActionState(signup, initialState);

  if (state.pending) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <h2 className="text-base font-semibold tracking-tight">
          Check your email
        </h2>
        <p className="text-[13px] leading-relaxed text-muted">
          We sent a confirmation link to{" "}
          <span className="font-mono text-fg">{state.pending.email}</span>.
          Click it to finish creating{" "}
          <span className="text-gold-soft">{state.pending.username}</span>, then
          sign in.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <Field
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        placeholder="ken"
        hint="3–20 characters"
        pattern="[A-Za-z0-9_]{3,20}"
        autoFocus
        required
      />

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        hint="8 characters minimum"
        minLength={8}
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
        disabled={submitting}
        className="mt-1 h-11 rounded-full bg-fg text-sm font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
