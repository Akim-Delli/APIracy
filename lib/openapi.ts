import { CROP_MODES, MAX_DIMENSION, OUTPUT_FORMATS } from "@/lib/schemas";

const errorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: {
          type: "string",
          enum: [
            "INVALID_PARAMS",
            "FORBIDDEN_HOST",
            "SOURCE_FETCH_FAILED",
            "UNSUPPORTED_MEDIA_TYPE",
            "PROCESSING_FAILED",
            "INTERNAL_ERROR",
          ],
        },
        message: { type: "string" },
        details: {
          type: "array",
          items: {
            type: "object",
            required: ["message"],
            properties: {
              param: { type: "string", description: "The query parameter at fault" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const imageResponses = {
  "200": {
    description:
      "The processed image, streamed directly. Returned on a cache miss (`X-Cache: MISS`) or when the cache is not configured (`X-Cache: BYPASS`).",
    headers: {
      "X-Cache": {
        description: "Cache status: HIT, MISS or BYPASS",
        schema: { type: "string", enum: ["MISS", "BYPASS"] },
      },
      "X-Image-Width": { description: "Output width in pixels", schema: { type: "integer" } },
      "X-Image-Height": { description: "Output height in pixels", schema: { type: "integer" } },
      "X-Image-Format": { description: "Output format", schema: { type: "string" } },
    },
    content: {
      "image/jpeg": { schema: { type: "string", format: "binary" } },
      "image/png": { schema: { type: "string", format: "binary" } },
      "image/webp": { schema: { type: "string", format: "binary" } },
      "image/avif": { schema: { type: "string", format: "binary" } },
    },
  },
  "302": {
    description:
      "Cache hit (`X-Cache: HIT`): redirects to the cached object on the Supabase CDN. Browsers and HTTP clients follow this transparently.",
    headers: {
      Location: { description: "Public CDN URL of the cached result", schema: { type: "string" } },
      "X-Cache": { schema: { type: "string", enum: ["HIT"] } },
    },
  },
  "400": errorResponse("Invalid query parameters, or the source host is not allowed."),
  "415": errorResponse("The source was fetched but is not a decodable image/video."),
  "422": errorResponse(
    "The source could not be fetched (unreachable, non-2xx, too large, timed out) or processing failed.",
  ),
  "500": errorResponse("Unexpected server error."),
} as const;

const transformParams = (target: "image" | "thumbnail") => [
  {
    name: "width",
    in: "query",
    description: `Output width in pixels (1-${MAX_DIMENSION}). If only one dimension is given, aspect ratio is preserved.`,
    schema: { type: "integer", minimum: 1, maximum: MAX_DIMENSION },
    example: 500,
  },
  {
    name: "height",
    in: "query",
    description: `Output height in pixels (1-${MAX_DIMENSION}).`,
    schema: { type: "integer", minimum: 1, maximum: MAX_DIMENSION },
    example: 300,
  },
  {
    name: "format",
    in: "query",
    description: `Output format. \`jpg\` is accepted as an alias for \`jpeg\`.${
      target === "thumbnail"
        ? " Defaults to `jpeg` for thumbnails."
        : " Defaults to the source format (or `png` when the source format cannot be encoded, e.g. svg/gif/tiff)."
    }`,
    schema: { type: "string", enum: [...OUTPUT_FORMATS, "jpg"] },
    example: "webp",
  },
  {
    name: "quality",
    in: "query",
    description:
      "Encoding quality, 1-100. Applies to lossy formats (jpeg/webp/avif); for png it enables palette quantization.",
    schema: { type: "integer", minimum: 1, maximum: 100 },
    example: 80,
  },
  {
    name: "crop",
    in: "query",
    description:
      "How to fit the image into width x height. `fill` (default): cover the exact box, cropping overflow. `fit`: shrink to fit inside the box, preserving aspect ratio. `scale`: stretch to the exact box. `crop`: extract a centered region at the requested size without scaling. Requires width and/or height.",
    schema: { type: "string", enum: [...CROP_MODES], default: "fill" },
    example: "fill",
  },
];

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "APIracy — Image Processing API",
    version: "1.0.0",
    description: [
      "A Cloudinary-style image processing service: pass a public image URL and",
      "transformation parameters, get back a processed image. Results are cached",
      "in Supabase Storage — repeated requests redirect (302) to the CDN-cached object.",
      "",
      "No authentication is required; all endpoints are public.",
      "",
      "**Quick start:**",
      "```",
      "GET /api/process?url=https://example.com/image.jpg&width=500&height=300",
      "GET /api/process?url=https://example.com/image.png&format=jpeg&quality=80",
      "GET /api/video/thumbnail?url=https://example.com/video.mp4&time=15",
      "```",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "This deployment" }],
  tags: [
    { name: "Images", description: "Image transformation" },
    { name: "Videos", description: "Video thumbnail extraction" },
    { name: "Meta", description: "Service status" },
  ],
  paths: {
    "/api/process": {
      get: {
        tags: ["Images"],
        operationId: "processImage",
        summary: "Resize, crop and convert an image",
        description:
          "Fetches the image at `url`, applies the requested transformations and returns the result. With no transformation parameters the image is re-served as-is (proxy mode). Sources up to 20 MB are accepted; jpeg, png, webp, avif, gif, tiff and svg inputs are supported.",
        parameters: [
          {
            name: "url",
            in: "query",
            required: true,
            description:
              "Publicly reachable http(s) URL of the source image. Private/internal hosts are rejected.",
            schema: { type: "string", format: "uri" },
            example: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
          },
          ...transformParams("image"),
        ],
        "x-codeSamples": [
          {
            lang: "TypeScript",
            label: "fetch",
            source: `const params = new URLSearchParams({
  url: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
  width: "500",
  height: "300",
  format: "webp",
});

const res = await fetch(\`https://apiracy.vercel.app/api/process?\${params}\`);
if (!res.ok) throw new Error(\`Processing failed: \${res.status}\`);

const blob = await res.blob();
const objectUrl = URL.createObjectURL(blob); // e.g. assign to <img src>`,
          },
          {
            lang: "Shell",
            label: "cURL",
            source: `curl -L "https://apiracy.vercel.app/api/process?url=https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg&width=500&height=300&format=webp" -o output.webp`,
          },
        ],
        responses: imageResponses,
      },
    },
    "/api/video/thumbnail": {
      get: {
        tags: ["Videos"],
        operationId: "videoThumbnail",
        summary: "Extract a thumbnail frame from a video",
        description:
          "Fetches the video at `url`, grabs the frame at `time` and returns it as an image. All image transformation parameters also apply, so a resized webp thumbnail is a single request. Sources up to 50 MB are accepted.",
        parameters: [
          {
            name: "url",
            in: "query",
            required: true,
            description:
              "Publicly reachable http(s) URL of the source video (any format ffmpeg can decode, e.g. mp4/webm/mov).",
            schema: { type: "string", format: "uri" },
            example: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
          },
          {
            name: "time",
            in: "query",
            description:
              'Timestamp of the frame to extract: seconds (`"15"`, `"12.5"`) or `mm:ss` / `hh:mm:ss` (`"1:30"`). Defaults to 0 (first frame). Requesting a time past the end of the video returns a 422.',
            schema: { type: "string", default: "0" },
            example: "5",
          },
          ...transformParams("thumbnail"),
        ],
        "x-codeSamples": [
          {
            lang: "TypeScript",
            label: "fetch",
            source: `const params = new URLSearchParams({
  url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
  time: "5",
  width: "480",
  format: "jpeg",
});

const res = await fetch(\`https://apiracy.vercel.app/api/video/thumbnail?\${params}\`);
if (!res.ok) throw new Error(\`Thumbnail failed: \${res.status}\`);

const blob = await res.blob();
const objectUrl = URL.createObjectURL(blob);`,
          },
          {
            lang: "Shell",
            label: "cURL",
            source: `curl -L "https://apiracy.vercel.app/api/video/thumbnail?url=https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4&time=5&width=480&format=jpeg" -o thumbnail.jpg`,
          },
        ],
        responses: imageResponses,
      },
    },
    "/api/health": {
      get: {
        tags: ["Meta"],
        operationId: "health",
        summary: "Service health",
        responses: {
          "200": {
            description: "Service is up.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    cache: {
                      type: "string",
                      enum: ["supabase", "bypass"],
                      description: "Whether processed results are being cached",
                    },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: { Error: errorSchema },
  },
};
