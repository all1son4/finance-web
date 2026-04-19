import { SettingsClient } from "@/components/settings-client";
import { requireUserPage } from "@/lib/auth";
import {
  ensureUserSettings,
  serializeStarterCategory,
} from "@/lib/settings";

export default async function SettingsPage() {
  const user = await requireUserPage();
  const settings = await ensureUserSettings(user.id);

  return (
    <SettingsClient
      settings={user.settings}
      starterCategories={settings.starterCategories.map(serializeStarterCategory)}
    />
  );
}
