import { AppNavigation } from "@/components/app-navigation";
import { HelpModal } from "@/components/help-modal";
import { LogoutButton } from "@/components/logout-button";
import { APP_TAGLINE } from "@/lib/app-config";
import { requireUserPage } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUserPage();
  const workspace = user.activeWorkspace;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <p className="eyebrow">Пространство: {workspace.name}</p>
          <h1>{APP_TAGLINE}</h1>
        </div>
        <div className="header-meta">
          <div className="user-summary">
            <strong>{workspace.name}</strong>
            <span>{workspace.members.length} участников учета</span>
            <span>{user.name}</span>
          </div>
          <HelpModal />
          <LogoutButton />
        </div>
      </header>
      <AppNavigation />
      <main className="page-frame">{children}</main>
    </div>
  );
}
