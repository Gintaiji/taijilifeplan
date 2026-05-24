import type { BackupData } from "./backup";
import { getSupabaseBrowserClient } from "./supabase";

const CLOUD_BACKUP_TABLE = "taiji_app_data";

export type CloudBackup = {
  data: unknown;
  updated_at: string | null;
};

export async function getCloudBackup(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from(CLOUD_BACKUP_TABLE)
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as CloudBackup | null;
}

export async function saveCloudBackup(userId: string, backupData: BackupData) {
  const updatedAt = new Date().toISOString();
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from(CLOUD_BACKUP_TABLE)
    .upsert(
      {
        user_id: userId,
        data: backupData,
        updated_at: updatedAt,
      },
      { onConflict: "user_id" },
    )
    .select("updated_at")
    .single();

  if (error) {
    throw error;
  }

  return typeof data?.updated_at === "string" ? data.updated_at : updatedAt;
}
