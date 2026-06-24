import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sketchline — draw together, live",
  description: "A real-time collaborative whiteboard. Open a room, share the link, draw together — every stroke syncs instantly over WebSockets.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

const themeScript = `(function(){try{var s=localStorage.getItem('sketchline-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(s?s==='dark':d)document.documentElement.classList.add('dark')}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
