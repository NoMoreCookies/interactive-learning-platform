"use client";

import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
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
  const [digits, setDigits] =
    useState<string[]>(() =>
      createDigits(value, length),
    );

  const inputRefs =
    useRef<
      Array<HTMLInputElement | null>
    >([]);

  useEffect(() => {
    setDigits(
      createDigits(value, length),
    );
  }, [length, value]);

  function updateDigits(
    nextDigits: string[],
  ) {
    setDigits(nextDigits);
    onChange(nextDigits.join(""));
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
    index: number,
  ) {
    const inputValue =
      event.target.value.replace(
        /\D/g,
        "",
      );

    const nextDigits = [...digits];

    nextDigits[index] =
      inputValue.at(-1) ?? "";

    updateDigits(nextDigits);

    if (
      inputValue &&
      index < length - 1
    ) {
      inputRefs.current[
        index + 1
      ]?.focus();
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (
      event.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      inputRefs.current[
        index - 1
      ]?.focus();
      return;
    }

    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      inputRefs.current[
        index - 1
      ]?.focus();
      return;
    }

    if (
      event.key === "ArrowRight" &&
      index < length - 1
    ) {
      inputRefs.current[
        index + 1
      ]?.focus();
    }
  }

  function handlePaste(
    event: ClipboardEvent<HTMLInputElement>,
  ) {
    event.preventDefault();

    const pastedCode =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, length);

    if (!pastedCode) {
      return;
    }

    updateDigits(
      createDigits(
        pastedCode,
        length,
      ),
    );

    const lastFilledIndex =
      Math.min(
        pastedCode.length,
        length,
      ) - 1;

    inputRefs.current[
      lastFilledIndex
    ]?.focus();
  }

  return (
    <div
      className="flex justify-between gap-2"
      role="group"
      aria-label="Kod potwierdzający"
    >
      {digits.map(
        (digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] =
                element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={
              index === 0
                ? "one-time-code"
                : "off"
            }
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(event) =>
              handleChange(
                event,
                index,
              )
            }
            onKeyDown={(event) =>
              handleKeyDown(
                event,
                index,
              )
            }
            onPaste={handlePaste}
            aria-label={`Cyfra ${
              index + 1
            } kodu`}
            className="h-14 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 text-center text-xl font-semibold text-zinc-100 outline-none transition-colors caret-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-500"
          />
        ),
      )}
    </div>
  );
}

function createDigits(
  value: string,
  length: number,
): string[] {
  return Array.from(
    { length },
    (_, index) =>
      value[index] ?? "",
  );
}
