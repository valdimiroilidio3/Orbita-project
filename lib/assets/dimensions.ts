/**
 * Minimal, dependency-free image dimension detection.
 * Supports PNG, JPEG, WEBP and SVG (via attributes/viewBox).
 * Used by the asset manager to store real width/height (and by quality checks).
 */

export type Dimensions = { width: number; height: number };

function jpegSize(b: Buffer): Dimensions | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < b.length) {
    if (b[off] !== 0xff) {
      off += 1;
      continue;
    }
    const marker = b[off + 1];
    // SOF0–SOF15 (skip DHT C4, JPG C8, DAC CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = b.readUInt16BE(off + 5);
      const width = b.readUInt16BE(off + 7);
      if (width > 0 && height > 0) return { width, height };
    }
    const size = b.readUInt16BE(off + 2);
    if (size < 2) return null;
    off += 2 + size;
  }
  return null;
}

function webpSize(b: Buffer): Dimensions | null {
  if (b.length < 30) return null;
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    const width = b.readUInt16LE(20) & 0x3fff;
    const height = b.readUInt16LE(22) & 0x3fff;
    return width && height ? { width, height } : null;
  }
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = b.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  if (chunk === "VP8X") {
    const width = b.readUIntLE(24, 3) + 1;
    const height = b.readUIntLE(27, 3) + 1;
    return { width, height };
  }
  return null;
}

function svgSize(text: string): Dimensions | null {
  const viewBox = text.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
  const w = text.match(/width=["']\s*([\d.]+)/i);
  const h = text.match(/height=["']\s*([\d.]+)/i);
  const width = w ? Number(w[1]) : viewBox ? Number(viewBox[1]) : null;
  const height = h ? Number(h[1]) : viewBox ? Number(viewBox[2]) : null;
  if (width && height && Number.isFinite(width) && Number.isFinite(height)) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  return null;
}

export function detectDimensions(buffer: Buffer, mimeType: string): Dimensions | null {
  if (mimeType === "image/png" || buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    if (buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    return null;
  }
  if (mimeType === "image/jpeg") return jpegSize(buffer);
  if (mimeType === "image/webp") return webpSize(buffer);
  if (mimeType === "image/svg+xml") return svgSize(buffer.toString("utf8"));
  return null;
}
