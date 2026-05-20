"use client";

import { useCallback, useRef, useState } from "react";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string[];
  maxSizeMB: number;
  currentFile: File | null;
  onRemove: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAcceptedFormats(acceptedFormats: string[]) {
  return acceptedFormats.map((format) => format.toUpperCase()).join(" · ");
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.at(-1)?.toLowerCase() ?? "" : "";
}

export default function FileUploader({
  onFileSelect,
  acceptedFormats,
  maxSizeMB,
  currentFile,
  onRemove,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);

      const maxBytes = maxSizeMB * 1024 * 1024;
      const extension = getFileExtension(file.name);

      if (!acceptedFormats.includes(extension)) {
        setError(
          `Use one of the approved formats: ${formatAcceptedFormats(acceptedFormats)}.`,
        );
        return;
      }

      if (file.size > maxBytes) {
        setError(`File exceeds the ${maxSizeMB} MB size limit.`);
        return;
      }

      onFileSelect(file);
    },
    [acceptedFormats, maxSizeMB, onFileSelect],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      const file = event.dataTransfer.files[0];
      if (file) {
        validateAndSelect(file);
      }
    },
    [validateAndSelect],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        validateAndSelect(file);
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [validateAndSelect],
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  if (currentFile) {
    return (
      <div className="rounded-xl border border-[#ddd3c4] bg-[#faf8f3] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#231d15]">
              {currentFile.name}
            </p>
            <p className="mt-1 text-sm text-[#625a4e]">
              {formatFileSize(currentFile.size)} · {getFileExtension(currentFile.name).toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openFilePicker}
              className="rounded-lg border border-[#ddd3c4] bg-white px-3 py-2 text-sm text-[#231d15] transition-colors hover:bg-[#f5f1ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3758a5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f3]"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg border border-[#ddd3c4] bg-white px-3 py-2 text-sm text-[#6f4d42] transition-colors hover:bg-[#faf5f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3758a5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f3]"
            >
              Remove
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptedFormats.map((format) => `.${format}`).join(",")}
          onChange={handleInputChange}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose a file to upload"
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          rounded-xl border-2 border-dashed p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3758a5] focus-visible:ring-offset-2 focus-visible:ring-offset-white
          ${isDragOver
            ? "border-[#988468] bg-[#f5f0e7]"
            : "border-[#d8cdbd] bg-[#faf8f3] hover:bg-[#f7f4ee]"
          }
        `}
      >
        <p className="text-sm font-medium text-[#231d15]">Drop a file here or browse</p>
        <p className="mt-2 text-sm leading-6 text-[#625a4e]">
          Accepted: {formatAcceptedFormats(acceptedFormats)}. Max {maxSizeMB} MB.
        </p>
        <span className="mt-4 inline-flex rounded-lg border border-[#ddd3c4] bg-white px-3 py-2 text-sm text-[#231d15]">
          Browse files
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={acceptedFormats.map((format) => `.${format}`).join(",")}
        onChange={handleInputChange}
      />

      {error && (
        <p className="mt-3 rounded-lg border border-[#ead2cb] bg-[#fff8f6] px-3 py-2 text-sm text-[#8b4337]">
          {error}
        </p>
      )}
    </div>
  );
}
