import sharp from "sharp";
import { ApiError } from "@/lib/errors";
import { OUTPUT_FORMATS, type CropMode, type OutputFormat } from "@/lib/schemas";

export const CONTENT_TYPES: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export interface TransformOptions {
  width?: number;
  height?: number;
  format?: OutputFormat;
  quality?: number;
  crop?: CropMode;
}

export interface TransformResult {
  data: Buffer;
  contentType: string;
  format: OutputFormat;
  width: number;
  height: number;
}

/** Cloudinary-style crop modes mapped onto sharp's fit strategies. */
const FIT_BY_CROP: Record<Exclude<CropMode, "crop">, keyof sharp.FitEnum> = {
  fill: "cover", // fill the exact box, cropping overflow (no distortion)
  fit: "inside", // fit within the box, preserving aspect ratio
  scale: "fill", // stretch to the exact box, ignoring aspect ratio
};

function isOutputFormat(format: string | undefined): format is OutputFormat {
  return OUTPUT_FORMATS.includes(format as OutputFormat);
}

/**
 * Decodes, transforms and re-encodes an image.
 *
 * - `crop=crop` extracts a centered region without scaling (clamped to the
 *   source dimensions); every other mode resizes.
 * - When no output format is requested the source format is kept if we can
 *   encode it, otherwise (gif/tiff/svg/...) the result falls back to png.
 * - EXIF orientation is always applied so rotated photos come out upright.
 */
export async function transformImage(
  input: Buffer,
  options: TransformOptions,
): Promise<TransformResult> {
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch {
    throw ApiError.unsupportedMediaType("The source could not be decoded as an image");
  }

  const { width, height, quality, crop = "fill" } = options;
  let pipeline = sharp(input).rotate();

  if (width !== undefined || height !== undefined) {
    if (crop === "crop") {
      const sourceWidth = metadata.width ?? 0;
      const sourceHeight = metadata.height ?? 0;
      const regionWidth = Math.min(width ?? sourceWidth, sourceWidth);
      const regionHeight = Math.min(height ?? sourceHeight, sourceHeight);
      pipeline = pipeline.extract({
        left: Math.floor((sourceWidth - regionWidth) / 2),
        top: Math.floor((sourceHeight - regionHeight) / 2),
        width: regionWidth,
        height: regionHeight,
      });
    } else {
      pipeline = pipeline.resize({ width, height, fit: FIT_BY_CROP[crop] });
    }
  }

  const format = options.format ?? (isOutputFormat(metadata.format) ? metadata.format : "png");
  // png is lossless: quality only applies with palette quantization
  const encodeOptions =
    quality === undefined ? {} : format === "png" ? { quality, palette: true } : { quality };
  pipeline = pipeline.toFormat(format, encodeOptions);

  try {
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      data,
      contentType: CONTENT_TYPES[format],
      format,
      width: info.width,
      height: info.height,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    throw ApiError.processingFailed(`Image processing failed: ${reason}`);
  }
}
