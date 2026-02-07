import { Platform } from "react-native";

function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workout";
}

export async function saveAndShare(
  filename: string,
  contents: string,
  mimeType = "application/octet-stream",
  platform: string = Platform.OS
): Promise<void> {
  const safeName = sanitizeFileName(filename);

  if (platform === "web") {
    if (typeof document === "undefined") return;
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return;
  }

  const FileSystem = await import("expo-file-system");
  const Sharing = await import("expo-sharing");

  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error("No writable directory found for export");
  }

  const fileUri = `${baseDir}${safeName}`;
  await FileSystem.writeAsStringAsync(fileUri, contents, {
    encoding: FileSystem.EncodingType.UTF8
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: `Share ${safeName}`
    });
  }
}
