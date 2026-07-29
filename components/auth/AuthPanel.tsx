"use client";

import { useState } from "react";

import {
  PageContainer,
  Surface,
} from "@/components/ui";

import AuthSidebar from "./AuthSidebar";
import ConfirmSignUpForm from "./ConfirmSignUpForm";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

type AuthMode =
  | "login"
  | "register"
  | "confirm";

export default function AuthPanel() {
  const [mode, setMode] =
    useState<AuthMode>("login");

  const [
    registeredEmail,
    setRegisteredEmail,
  ] = useState("");

  function showLogin() {
    setMode("login");
  }

  function showRegister() {
    setMode("register");
  }

  function showConfirmation(
    email: string,
  ) {
    setRegisteredEmail(email);
    setMode("confirm");
  }

  return (
    <main className="min-h-screen bg-[#020617] text-zinc-100">
      <PageContainer
        size="default"
        className="grid min-h-screen grid-cols-1 lg:grid-cols-[0.8fr_1.2fr]"
      >
        <AuthSidebar />

        <section className="flex items-center justify-center py-12 lg:pl-12">
          <Surface
            variant="elevated"
            className="w-full max-w-md p-6 sm:p-8"
          >
            {mode !== "confirm" && (
              <div
                role="tablist"
                aria-label="Tryb uwierzytelniania"
                className="mb-8 grid grid-cols-2 border-b border-zinc-800"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    mode === "login"
                  }
                  onClick={showLogin}
                  className={[
                    "border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                    mode === "login"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  Logowanie
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    mode === "register"
                  }
                  onClick={showRegister}
                  className={[
                    "border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                    mode === "register"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  Rejestracja
                </button>
              </div>
            )}

            {mode === "login" && (
              <LoginForm
                defaultEmail={
                  registeredEmail
                }
                onRegisterClick={
                  showRegister
                }
              />
            )}

            {mode === "register" && (
              <RegisterForm
                onLoginClick={showLogin}
                onConfirmationRequired={
                  showConfirmation
                }
              />
            )}

            {mode === "confirm" && (
              <ConfirmSignUpForm
                email={registeredEmail}
                onBack={showRegister}
                onConfirmed={showLogin}
              />
            )}
          </Surface>
        </section>
      </PageContainer>
    </main>
  );
}
