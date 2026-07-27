import type { ChangeEvent } from "react";

type FilePickerProps = {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  disabled?: boolean;
  inputKey?: number;
  onFileChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
};

export default function FilePicker({
  id,
  label,
  accept,
  file,
  disabled = false,
  inputKey,
  onFileChange,
}: FilePickerProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-zinc-200"
      >
        {label}
      </label>

      <input
        key={inputKey}
        id={id}
        type="file"
        accept={accept}
        onChange={onFileChange}
        disabled={disabled}
        className="block w-full cursor-pointer rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-zinc-300 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-medium file:text-black disabled:cursor-not-allowed disabled:opacity-50"
      />

      {file && (
        <div className="mt-3 text-sm text-zinc-400">
          <p>
            Wybrany plik:{" "}
            <span className="text-zinc-200">
              {file.name}
            </span>
          </p>

          <p>
            Rozmiar:{" "}
            {(
              file.size /
              1024 /
              1024
            ).toFixed(2)}{" "}
            MB
          </p>
        </div>
      )}
    </div>
  );
}