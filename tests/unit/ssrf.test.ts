import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { assertPublicHost, isPrivateAddress } from "@/lib/fetch-source";

afterEach(() => {
  delete process.env.SSRF_ALLOW_PRIVATE;
});

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "127.255.255.254",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata endpoint
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:192.168.0.1",
  ])("flags %s as private", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(["1.1.1.1", "8.8.8.8", "93.184.215.14", "172.32.0.1", "2606:4700:4700::1111"])(
    "allows public address %s",
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );

  it("treats garbage as private", () => {
    expect(isPrivateAddress("not-an-ip")).toBe(true);
  });
});

describe("assertPublicHost", () => {
  it.each([
    "http://localhost/x.jpg",
    "http://sub.localhost/x.jpg",
    "http://printer.local/x.jpg",
    "http://127.0.0.1/x.jpg",
    "http://[::1]/x.jpg",
    "http://169.254.169.254/latest/meta-data",
    "http://192.168.0.10/cam.jpg",
  ])("rejects %s", async (url) => {
    await expect(assertPublicHost(new URL(url))).rejects.toThrowError(ApiError);
  });

  it("allows private hosts when SSRF_ALLOW_PRIVATE=true", async () => {
    process.env.SSRF_ALLOW_PRIVATE = "true";
    await expect(assertPublicHost(new URL("http://127.0.0.1/x.jpg"))).resolves.toBeUndefined();
  });

  it("rejects hostnames that do not resolve", async () => {
    await expect(
      assertPublicHost(new URL("http://definitely-not-a-real-host.invalid/x.jpg")),
    ).rejects.toThrowError(ApiError);
  });
});
