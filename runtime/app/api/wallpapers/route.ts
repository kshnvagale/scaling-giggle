import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const WALLPAPER_DIR = path.join(process.cwd(), "wallpaper");
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function getWallpaperNames() {
  const entries = await fs.readdir(WALLPAPER_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((left, right) => left.localeCompare(right));
}

function getContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedName = searchParams.get("name");
  const wallpaperNames = await getWallpaperNames();

  if (requestedName) {
    if (!wallpaperNames.includes(requestedName)) {
      return NextResponse.json({ error: "Wallpaper not found." }, { status: 404 });
    }

    const filePath = path.join(WALLPAPER_DIR, requestedName);
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": getContentType(requestedName),
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    wallpaperNames.map((name, index) => ({
      id: index,
      name,
      url: `/api/wallpapers?name=${encodeURIComponent(name)}`,
    })),
  );
}
