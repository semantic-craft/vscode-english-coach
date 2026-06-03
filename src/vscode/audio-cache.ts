import * as vscode from "vscode";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { AudioKeyParts, audioCacheKey } from "../core/cache";

export { audioCacheKey };
export type { AudioKeyParts };

function dir(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.joinPath(context.globalStorageUri, "audio-cache");
}

/** Return the cached file Uri if present, else write `bytes` and return the new Uri. */
export async function cacheAudio(
  context: vscode.ExtensionContext,
  key: string,
  ext: string,
  bytes: Buffer,
): Promise<vscode.Uri> {
  const folder = dir(context);
  await mkdir(folder.fsPath, { recursive: true });
  const file = vscode.Uri.joinPath(folder, `${key}.${ext}`);
  try {
    await readFile(file.fsPath);
  } catch {
    await writeFile(file.fsPath, bytes);
  }
  return file;
}

export function cachedAudioUri(
  context: vscode.ExtensionContext,
  key: string,
  ext: string,
): vscode.Uri {
  return vscode.Uri.joinPath(dir(context), `${key}.${ext}`);
}
