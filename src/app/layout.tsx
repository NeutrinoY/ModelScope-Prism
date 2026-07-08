import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ModelScope Prism',
  description: 'A local-first ModelScope API-Inference workbench.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
