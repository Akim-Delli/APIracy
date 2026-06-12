import { z } from "zod";
import { ApiError, type ErrorDetail } from "@/lib/errors";

export const OUTPUT_FORMATS = ["jpeg", "png", "webp", "avif"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const CROP_MODES = ["fill", "fit", "scale", "crop"] as const;
export type CropMode = (typeof CROP_MODES)[number];

export const MAX_DIMENSION = 4096;

/** Treats empty query values ("?width=") the same as absent ones. */
function emptyToUndefined(value: unknown): unknown {
  return value === "" || value === null ? undefined : value;
}

const httpUrl = z
  .string({ error: "url is required" })
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "must be a valid absolute http(s) URL");

const dimension = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "must be a number" })
    .int("must be an integer")
    .min(1, "must be at least 1")
    .max(MAX_DIMENSION, `must be at most ${MAX_DIMENSION}`)
    .optional(),
);

const quality = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "must be a number" })
    .int("must be an integer")
    .min(1, "must be between 1 and 100")
    .max(100, "must be between 1 and 100")
    .optional(),
);

const format = z.preprocess(
  (value) => emptyToUndefined(value === "jpg" ? "jpeg" : value),
  z.enum(OUTPUT_FORMATS, { error: `must be one of: ${OUTPUT_FORMATS.join(", ")} (or jpg)` }).optional(),
);

const crop = z.preprocess(
  emptyToUndefined,
  z.enum(CROP_MODES, { error: `must be one of: ${CROP_MODES.join(", ")}` }).optional(),
);

export const processQuerySchema = z
  .object({
    url: httpUrl,
    width: dimension,
    height: dimension,
    format,
    quality,
    crop,
  })
  .superRefine((value, ctx) => {
    if (value.crop && value.width === undefined && value.height === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["crop"],
        message: "crop requires width and/or height",
      });
    }
  });

export type ProcessParams = z.infer<typeof processQuerySchema>;

/** Parses "15", "15.5", "mm:ss" or "hh:mm:ss" into seconds. Returns null when invalid. */
export function parseTimeToSeconds(value: string): number | null {
  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number.parseFloat(value);
  }
  const match = /^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d(?:\.\d+)?)$/.exec(value);
  if (!match) return null;
  const [, hours, minutes, seconds] = match;
  return (
    (hours ? Number.parseInt(hours, 10) * 3600 : 0) +
    Number.parseInt(minutes, 10) * 60 +
    Number.parseFloat(seconds)
  );
}

const time = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return 0;
      const seconds = parseTimeToSeconds(value);
      if (seconds === null || seconds > 86_400) {
        ctx.addIssue({
          code: "custom",
          message: 'must be seconds (e.g. "15" or "12.5") or a timestamp (e.g. "1:30")',
        });
        return z.NEVER;
      }
      return seconds;
    }),
);

export const videoThumbnailQuerySchema = z.object({
  url: httpUrl,
  time,
  width: dimension,
  height: dimension,
  format,
  quality,
  crop,
});

export type VideoThumbnailParams = z.infer<typeof videoThumbnailQuerySchema>;

/**
 * Validates URL query params against a schema, turning zod issues into a 400
 * ApiError whose details name the offending parameter.
 */
export function parseQuery<T extends z.ZodType>(
  schema: T,
  searchParams: URLSearchParams,
): z.infer<T> {
  const input: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (!(key in input)) input[key] = value;
  }
  const result = schema.safeParse(input);
  if (!result.success) {
    const details: ErrorDetail[] = result.error.issues.map((issue) => ({
      param: issue.path.join(".") || undefined,
      message: issue.message,
    }));
    throw ApiError.invalidParams("Invalid query parameters", details);
  }
  return result.data;
}
