"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type VerificationCodeInputProps = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  length?: number;
};

export default function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
  length = 6,
}: VerificationCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(
    Array.from({ length }, (_, index) => value[index] ?? ""),
  );

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setDigits(Array.from({ length }, (_, index) => value[index] ?? ""));
  }, [length, value]);

  function updateDigits(nextDigits: string[]) {
    setDigits(nextDigits);
    onChange(nextDigits.join(""));
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
    index: number,
  ) {
    const inputValue = event.target.value.replace(/\D/g, "");

    if (!inputValue) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      updateDigits(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = inputValue.at(-1) ?? "";

    updateDigits(nextDigits);

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const pastedCode = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);

    if (!pastedCode) {
      return;
    }

    const nextDigits = Array.from(
      { length },
      (_, index) => pastedCode[index] ?? "",
    );

    updateDigits(nextDigits);

    const lastFilledIndex = Math.min(pastedCode.length, length) - 1;
    inputRefs.current[lastFilledIndex]?.focus();
  }

  return (
    <div
      className="flex justify-between gap-2"
      aria-label="Kod potwierdzający"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(event, index)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={handlePaste}
          aria-label={`Cyfra ${index + 1} kodu`}
          className="
            h-14 min-w-0 flex-1
            rounded-xl
            border border-slate-700
            bg-slate-950
            text-center text-xl font-semibold text-white
            outline-none
            transition-colors
            caret-blue-400
            focus:border-blue-500
            focus:ring-4
            focus:ring-blue-500/10
            disabled:cursor-not-allowed
            disabled:border-slate-800
            disabled:bg-slate-900
            disabled:text-slate-500
          "
        />
      ))}
    </div>
  );
}