// supabase/storage/storageClient.dart
// Cross-platform Supabase Storage client for Flutter/Dart
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';

class StorageClient {
  final SupabaseClient _client = Supabase.instance.client;

  Future<void> uploadFile(String bucket, String path, File file) async {
    final response = await _client.storage.from(bucket).upload(path, file, fileOptions: const FileOptions(upsert: true));
    if (response.error != null) throw response.error!;
  }

  String getFileUrl(String bucket, String path) {
    final url = _client.storage.from(bucket).getPublicUrl(path);
    return url;
  }

  Future<void> deleteFile(String bucket, String path) async {
    final response = await _client.storage.from(bucket).remove([path]);
    if (response.error != null) throw response.error!;
  }
}
