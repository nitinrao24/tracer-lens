import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TracerLens — LLM Cost & Latency Observability",
  description:
    "OpenTelemetry-backed cost and latency observability for Claude and OpenAI workloads."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
