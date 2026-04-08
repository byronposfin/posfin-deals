import './globals.css';

export const metadata = {
  title: 'Posfin Capital — Your Deal',
  description: 'Live view of your bridging finance application.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
