import { APP_MARKETING_COPY, APP_NAME, APP_SUPPORT_COPY } from "@/lib/app-config";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <div className="auth-hero-copy">
          <p className="eyebrow">{APP_NAME}</p>
          <h2>{APP_MARKETING_COPY}</h2>
          <p className="muted-copy">{APP_SUPPORT_COPY}</p>
        </div>
      </section>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
