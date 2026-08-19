import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "screenshots",
);

export async function saveScreenshot(
  websiteId: string,
  buffer: Buffer,
): Promise<string> {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const filename = `${websiteId}-${nanoid(8)}.jpg`;
  await writeFile(path.join(SCREENSHOT_DIR, filename), buffer);
  return `/uploads/screenshots/${filename}`;
}
