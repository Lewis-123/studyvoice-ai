import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyVoice AI",
  description:
    "An AI-powered study assistant that transforms topics, notes, and voice recordings into interactive learning materials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}