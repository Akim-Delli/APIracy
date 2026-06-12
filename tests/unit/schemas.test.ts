import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import {
  parseQuery,
  parseTimeToSeconds,
  processQuerySchema,
  videoThumbnailQuerySchema,
} from "@/lib/schemas";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("processQuerySchema", () => {
  it("parses a full valid query", () => {
    const result = parseQuery(
      processQuerySchema,
      params("url=https://example.com/a.jpg&width=500&height=300&format=webp&quality=80&crop=fill"),
    );
    expect(result).toEqual({
      url: "https://example.com/a.jpg",
      width: 500,
      height: 300,
      format: "webp",
      quality: 80,
      crop: "fill",
    });
  });

  it("accepts url alone (proxy mode)", () => {
    const result = parseQuery(processQuerySchema, params("url=https://example.com/a.jpg"));
    expect(result.url).toBe("https://example.com/a.jpg");
    expect(result.width).toBeUndefined();
  });

  it("requires url", () => {
    expect(() => parseQuery(processQuerySchema, params("width=100"))).toThrowError(ApiError);
    try {
      parseQuery(processQuerySchema, params("width=100"));
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError.status).toBe(400);
      expect(apiError.details?.[0]?.param).toBe("url");
    }
  });

  it.each(["ftp://example.com/a.jpg", "not a url", "file:///etc/passwd", "//example.com/a.jpg"])(
    "rejects non-http(s) url %s",
    (url) => {
      expect(() =>
        parseQuery(processQuerySchema, params(`url=${encodeURIComponent(url)}`)),
      ).toThrowError(ApiError);
    },
  );

  it.each([
    ["width=0", "width"],
    ["width=-5", "width"],
    ["width=12.5", "width"],
    ["width=9999", "width"],
    ["width=abc", "width"],
    ["height=0", "height"],
    ["quality=0", "quality"],
    ["quality=101", "quality"],
    ["format=bmp", "format"],
    ["crop=zoom", "crop"],
  ])("rejects invalid %s", (query, param) => {
    try {
      parseQuery(processQuerySchema, params(`url=https://example.com/a.jpg&${query}`));
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError).toBeInstanceOf(ApiError);
      expect(apiError.status).toBe(400);
      expect(apiError.details?.some((d) => d.param === param)).toBe(true);
    }
  });

  it("treats empty values as absent", () => {
    const result = parseQuery(
      processQuerySchema,
      params("url=https://example.com/a.jpg&width=&format="),
    );
    expect(result.width).toBeUndefined();
    expect(result.format).toBeUndefined();
  });

  it("accepts jpg as an alias for jpeg", () => {
    const result = parseQuery(processQuerySchema, params("url=https://example.com/a.jpg&format=jpg"));
    expect(result.format).toBe("jpeg");
  });

  it("rejects crop without dimensions", () => {
    expect(() =>
      parseQuery(processQuerySchema, params("url=https://example.com/a.jpg&crop=fill")),
    ).toThrowError(ApiError);
  });

  it("coerces numeric strings", () => {
    const result = parseQuery(processQuerySchema, params("url=https://example.com/a.jpg&width=42"));
    expect(result.width).toBe(42);
  });
});

describe("parseTimeToSeconds", () => {
  it.each([
    ["0", 0],
    ["15", 15],
    ["12.5", 12.5],
    ["1:30", 90],
    ["0:05", 5],
    ["01:02:03", 3723],
    ["1:02:03.5", 3723.5],
  ])("parses %s as %d seconds", (input, expected) => {
    expect(parseTimeToSeconds(input)).toBe(expected);
  });

  it.each(["abc", "-5", "1:99", "::", "1:2:3:4"])("returns null for %s", (input) => {
    expect(parseTimeToSeconds(input)).toBeNull();
  });
});

describe("videoThumbnailQuerySchema", () => {
  it("defaults time to 0", () => {
    const result = parseQuery(videoThumbnailQuerySchema, params("url=https://example.com/v.mp4"));
    expect(result.time).toBe(0);
  });

  it("parses mm:ss time", () => {
    const result = parseQuery(
      videoThumbnailQuerySchema,
      params("url=https://example.com/v.mp4&time=1:30"),
    );
    expect(result.time).toBe(90);
  });

  it("rejects invalid time", () => {
    expect(() =>
      parseQuery(videoThumbnailQuerySchema, params("url=https://example.com/v.mp4&time=abc")),
    ).toThrowError(ApiError);
  });
});
