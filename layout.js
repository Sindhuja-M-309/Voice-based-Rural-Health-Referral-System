export const metadata = {
  title: "ASHA Voice Referral Bridge",
  description: "Voice-based clinical referral system for rural health workers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}