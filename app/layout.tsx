import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APIracy — Image Processing API",
  description:
    "Cloudinary-style image processing service: resize, crop and convert images (and grab video thumbnails) through a simple URL-based API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
