import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function uploadFile(bucket: string, path: string, file: File | Blob) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return data;
}

export async function getFileUrl(bucket: string, path: string) {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw error;
  return true;
}
