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

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const { data } = await api.post<PresignedPostResponse>("/upload-url", {
        file_name: file.name,
        content_type: file.type,
      });

      const formData = new FormData();
      Object.entries(data.fields).forEach(([key, value]) => formData.append(key, value));
      formData.append("file", file);

      await fetch(data.url, { method: "POST", body: formData });

      toast.success(`${file.name} uploaded successfully`, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch {
      toast.error(`Failed to upload ${file.name}`, { id: toastId });
    } finally {
      setUploading(false);
    }
  }, [queryClient]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, [uploadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(uploadFile);
  }, [uploadFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
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
        <p className="mt-1 text-xs text-muted-foreground">Any file type supported</p>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
        <Upload className="h-4 w-4" />
        Browse Files
        <input type="file" multiple className="hidden" onChange={handleFileInput} />
      </label>
    </div>
  );
}
