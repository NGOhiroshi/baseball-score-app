import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppHeader } from "./_components/AppHeader";

export const metadata: Metadata = {
  title: "草野球スコア管理",
  description: "草野球チームのスコア・成績を管理するアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 描画前に保存済みテーマを適用してチラつき（FOUC）を防ぐ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
