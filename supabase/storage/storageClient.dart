// supabase/storage/storageClient.dart
// Cross-platform Supabase Storage client for Flutter/Dart
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';

/// Pre-induction bucket name - used for private document storage.
const String preInductionBucket = 'pre-induction';

/// Extracts the storage path from a pre-induction value (path or full Supabase storage URL).
/// Returns the path for use with createSignedUrl/remove. Returns null if invalid.
String? extractPreInductionPath(String pathOrUrl) {
  final trimmed = pathOrUrl.trim();
  if (trimmed.isEmpty) return null;
  // Already a path (no scheme) - expect "userId/section/file"
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }
  // Full URL - extract path after "pre-induction/"
  try {
    final uri = Uri.parse(trimmed);
    final path = uri.path;
    final idx = path.indexOf('pre-induction/');
    if (idx != -1) {
      return Uri.decodeComponent(path.substring(idx + 'pre-induction/'.length));
    }
    // Fallback: /storage/v1/object/public|sign|authenticated/[bucket]/(.+)
    final match = RegExp(r'/storage/v1/object/(?:public|sign|authenticated)/[^/]+/(.+)$')
        .firstMatch(path);
    if (match != null) {
      final g = match.group(1);
      if (g != null && g.isNotEmpty) return Uri.decodeComponent(g);
    }
  } catch (_) {}
  return null;
}

class StorageClient {
  final SupabaseClient _client = Supabase.instance.client;

  /// Uploads a file. Returns the storage path on success. Throws on error.
  Future<String> uploadFile(String bucket, String path, File file) async {
    return await _client.storage.from(bucket).upload(path, file, fileOptions: const FileOptions(upsert: true));
  }

  /// Use for public buckets only. For pre-induction (private bucket), use [createPreInductionSignedUrl].
  String getFileUrl(String bucket, String path) {
    return _client.storage.from(bucket).getPublicUrl(path);
  }

  /// Creates a signed URL for viewing pre-induction documents. Required because the
  /// pre-induction bucket is private - getPublicUrl returns URLs that return 403.
  /// [pathOrUrl] can be storage path ("userId/section/file.pdf") or full Supabase storage URL.
  Future<String> createPreInductionSignedUrl(String pathOrUrl, {int expiresInSeconds = 3600}) async {
    if (pathOrUrl.isEmpty) throw ArgumentError('pathOrUrl cannot be empty');
    final path = extractPreInductionPath(pathOrUrl);
    if (path == null || path.isEmpty) {
      throw Exception('Could not extract storage path from: $pathOrUrl');
    }
    final signedUrl = await _client.storage.from(preInductionBucket).createSignedUrl(path, expiresInSeconds);
    if (signedUrl.isEmpty) throw Exception('Failed to create signed URL for pre-induction file');
    return signedUrl;
  }

  /// Deletes a pre-induction file. [pathOrUrl] can be storage path or full Supabase storage URL.
  Future<void> deletePreInductionFile(String pathOrUrl) async {
    final path = extractPreInductionPath(pathOrUrl);
    if (path == null || path.isEmpty) {
      throw Exception('Could not extract storage path for delete from: $pathOrUrl');
    }
    await _client.storage.from(preInductionBucket).remove([path]);
  }

  Future<void> deleteFile(String bucket, String path) async {
    await _client.storage.from(bucket).remove([path]);
  }
}
