import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, FileText, FileImage, FileArchive, File as FileIcon } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { StorageFile, DownloadResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) return FileImage;
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return FileArchive;
  if (["txt", "md", "pdf", "doc", "docx"].includes(ext)) return FileText;
  return FileIcon;
}

export default function FileTable() {
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery<StorageFile[]>({
    queryKey: ["files"],
    queryFn: async () => {
      const { data } = await api.get<StorageFile[]>("/files");
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      await api.delete(`/files/${encodeURIComponent(filename)}`);
    },
    onSuccess: (_, filename) => {
      toast.success(`${filename} deleted`);
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
    onError: () => toast.error("Failed to delete file"),
  });

  const handleDownload = async (filename: string) => {
    try {
      const { data } = await api.get<DownloadResponse>(`/download/${encodeURIComponent(filename)}`);
      window.open(data.download_url, "_blank");
    } catch {
      toast.error("Failed to generate download link");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!files?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileIcon className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">No files yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Upload a file to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">Size</th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">Modified</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {files.map((file) => {
            const Icon = getFileIcon(file.name);
            return (
              <tr key={file.name} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-primary/70" />
                    <span className="truncate text-sm font-medium text-foreground">{file.name}</span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">{formatBytes(file.size_bytes)}</td>
                <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                  {new Date(file.last_modified).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleDownload(file.name)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {file.name}?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone. The file will be permanently removed.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(file.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
