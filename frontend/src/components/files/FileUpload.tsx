import { useCallback, useState } from "react";
import { Upload, CloudUpload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import type { PresignedPostResponse } from "@/types";
import { cn } from "@/lib/utils";

export default function FileUpload() {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      const toastId = toast.loading(`Uploading ${file.name}...`);

      try {
        // STEP 1: Request presigned POST URL from backend
        const { data: presignedData } = await api.post<PresignedPostResponse>("/upload-url", {
          file_name: file.name,
          content_type: file.type,
        });

        // STEP 2: Create FormData instance
        const formData = new FormData();

        // STEP 3: Iterate through fields and append to FormData
        Object.entries(presignedData.fields).forEach(([key, value]) => {
          formData.append(key, value as string);
        });

        // STEP 4: Append the actual file LAST with 'file' key
        formData.append("file", file);

        // STEP 5: Send POST request to MinIO endpoint
        const uploadResponse = await fetch(presignedData.url, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }

        // Success notification and invalidate cache
        toast.success(`${file.name} uploaded successfully`, { id: toastId });
        queryClient.invalidateQueries({ queryKey: ["files"] });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        toast.error(message, { id: toastId });
        console.error("Upload error:", error);
      } finally {
        setUploading(false);
      }
    },
    [queryClient]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      files.forEach(uploadFile);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      files.forEach(uploadFile);
      // Reset input value to allow re-uploading the same file
      e.currentTarget.value = "";
    },
    [uploadFile]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30",
        uploading && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <CloudUpload className="h-6 w-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {uploading ? "Uploading..." : "Drop files here or click to upload"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, PDF, ZIP and more (Max 10MB per file)</p>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
        <Upload className="h-4 w-4" />
        Browse Files
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
          disabled={uploading}
          accept="*/*"
        />
      </label>
    </div>
  );
}
