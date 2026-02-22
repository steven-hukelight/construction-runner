// supabase/auth/mobile/supabaseAuthClient.dart
// Dart/Flutter Supabase Auth client for mobile integration

import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseAuthClient {
  static final SupabaseAuthClient _instance = SupabaseAuthClient._internal();
  factory SupabaseAuthClient() => _instance;
  SupabaseAuthClient._internal();

  final supabase = Supabase.instance.client;

  Future<AuthResponse> signUp(String email, String password) {
    return supabase.auth.signUp(email: email, password: password);
  }

  Future<AuthResponse> signIn(String email, String password) {
    return supabase.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signOut() {
    return supabase.auth.signOut();
  }

  User? get currentUser => supabase.auth.currentUser;
  Session? get currentSession => supabase.auth.currentSession;

  Stream<AuthState> get onAuthStateChange => supabase.auth.onAuthStateChange;
}
