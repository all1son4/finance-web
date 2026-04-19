import { SettingsClient } from "@/components/settings-client";
import { requireUserPage } from "@/lib/auth";
import {
  ensureWorkspaceStarterCategories,
  serializeStarterCategory,
} from "@/lib/settings";

export default async function SettingsPage() {
  const user = await requireUserPage();
  const workspace = await ensureWorkspaceStarterCategories(user.activeWorkspace.id);

  return (
    <SettingsClient
      activeWorkspace={user.activeWorkspace}
      settings={user.activeWorkspace.settings}
      starterCategories={workspace.starterCategories.map(serializeStarterCategory)}
      workspaces={user.workspaces}
    />
  );
}
