type UploadProgressProps = {
  progress: number;
  isUploading: boolean;
  statusMessage: string;
  uploadedPath: string;
};

export default function UploadProgress({
  progress,
  isUploading,
  statusMessage,
  uploadedPath,
}: UploadProgressProps) {
  return (
    <>
      {isUploading && (
        <div>
          <div className="mb-2 flex justify-between text-sm text-zinc-400">
            <span>Postęp wysyłania</span>
            <span>{progress}%</span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-white transition-[width] duration-200"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="rounded-xl border border-zinc-700 bg-black p-4">
          <p className="text-sm text-zinc-300">
            {statusMessage}
          </p>
        </div>
      )}

      {uploadedPath && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-sm font-medium text-green-300">
            Zapisana ścieżka:
          </p>

          <code className="mt-2 block break-all text-sm text-green-200">
            {uploadedPath}
          </code>
        </div>
      )}
    </>
  );
}