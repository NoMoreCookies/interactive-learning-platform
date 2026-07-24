"use client";

import { useState } from "react";

import AuthSidebar from "./AuthSidebar";
import ConfirmSignUpForm from "./ConfirmSignUpForm";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

type AuthMode = "login" | "register" | "confirm";

export default function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [registeredEmail, setRegisteredEmail] = useState("");

  function showLogin() {
    setMode("login");
  }

  function showRegister() {
    setMode("register");
  }

  function showConfirmation(email: string) {
    setRegisteredEmail(email);
    setMode("confirm");
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[0.75fr_1.25fr]">
        <AuthSidebar />

        <section className="flex items-center justify-center px-5 py-12 sm:px-8 lg:px-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#050914] p-6 shadow-2xl shadow-black/30 sm:p-8">
            {mode !== "confirm" && (
              <div className="mb-8 grid grid-cols-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={showLogin}
                  className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    mode === "login"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-200"
                  }`}
                >
                  Logowanie
                </button>

                <button
                  type="button"
                  onClick={showRegister}
                  className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    mode === "register"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-200"
                  }`}
                >
                  Rejestracja
                </button>
              </div>
            )}

            {mode === "login" && (
              <LoginForm
                defaultEmail={registeredEmail}
                onRegisterClick={showRegister}
              />
            )}

            {mode === "register" && (
              <RegisterForm
                onLoginClick={showLogin}
                onConfirmationRequired={showConfirmation}
              />
            )}

            {mode === "confirm" && (
              <ConfirmSignUpForm
                email={registeredEmail}
                onBack={showRegister}
                onConfirmed={showLogin}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}