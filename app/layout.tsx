import "./globals.css";

export const metadata = {
  title: "RF Guild CRM",
  description: "Standalone RF Online guild management dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
