// supabase/storage/storageClient.ts
// Cross-platform Supabase Storage client for web (Node/React)
import { supabase } from '../auth/client'

export async function uploadFile(bucket: string, path: string, file: File | Blob) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  return data
}

export async function getFileUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
  return true
}
