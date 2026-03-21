# Mobile — Privacy & Security Implementation Guide

This guide covers embedding the combined **Privacy & Security Master Policy** in the Flutter mobile app. The mobile repo is separate from the admin web app; apply these changes in your Flutter codebase.

---

## 1. Settings Screen — New List Tile

**Location:** `lib/screens/settings/settings_screen.dart` (or equivalent)

Add a new list tile that navigates to the Privacy & Security screen:

```dart
ListTile(
  leading: Icon(Icons.shield),
  title: Text('Privacy & Security'),
  subtitle: Text('How we handle your data'),
  onTap: () {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PrivacySecurityScreen(),
      ),
    );
  },
)
```

---

## 2. Privacy & Security Screen

**Create:** `lib/screens/settings/privacy_security_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class PrivacySecurityScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Privacy & Security'),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Section(title: 'Intro', text: 'Your data is collected for site access, safety compliance, induction, RAMS acceptance, and legal H&S obligations. Not used for marketing or profiling.'),
            SizedBox(height: 20),
            _Section(title: 'What data we collect', text: 'Personal details (name, email, phone, optional address), NI number (optional), emergency contact, right-to-work docs (expiry + file only), medical info (optional), certifications, RAMS acceptance, induction records.'),
            SizedBox(height: 20),
            _Section(title: 'Why we collect it', text: 'Site access, safety compliance, pre-induction and site induction, RAMS tracking, legal H&S obligations only.'),
            SizedBox(height: 20),
            _Section(title: 'Who can see your data', text: 'Your employer, site supervisors, main contractor admins, authorised administrators. Sensitive fields (NI, medical notes) restricted to you and admins only.'),
            SizedBox(height: 20),
            _Section(title: 'How long we keep it', text: 'Induction: 3 years. RAMS: 6 years. Training: 3 years. Accident records: 6 years. Pre-Induction: 3 years after last activity. Deleted accounts: 90 days.'),
            SizedBox(height: 20),
            _Section(title: 'Your rights', text: 'Access: Download your data. Rectification: Edit name, phone, address, emergency contact. Erasure: Request deletion (H&S records retained). Restrict processing: Toggle in Profile.'),
            SizedBox(height: 20),
            _Section(title: 'Security', text: 'HTTPS, access control, audit logging, 12-hour session timeout (Supabase Auth), file type/size limits (jpg, png, pdf, 10MB).'),
            SizedBox(height: 24),
            TextButton.icon(
              icon: Icon(Icons.open_in_browser),
              label: Text('View Full Policy Online'),
              onPressed: () async {
                final url = Uri.parse('https://[YOUR-DOMAIN]/legal/privacy-and-security');
                if (await canLaunchUrl(url)) {
                  await launchUrl(url, mode: LaunchMode.externalApplication);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final String text;

  _Section({required this.title, required this.text});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        SizedBox(height: 8),
        Text(text, style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
  }
}
```

**Note:** Replace `[YOUR-DOMAIN]` with your production web domain (e.g. `app.construction-runner.com`).

---

## 3. Onboarding / First-Time Login Flow

**Location:** Final step of onboarding or first-time login (e.g. before "Continue" or "Finish" button)

Add a small text block at the bottom:

```dart
RichText(
  textAlign: TextAlign.center,
  text: TextSpan(
    style: TextStyle(color: Colors.grey, fontSize: 12),
    children: [
      TextSpan(text: 'By continuing, you agree to Construction Runner\'s '),
      TextSpan(
        text: 'Privacy & Security Policy',
        style: TextStyle(color: Colors.blue, decoration: TextDecoration.underline),
        recognizer: TapGestureRecognizer()
          ..onTap = () {
            // Option A: Navigate to in-app screen
            Navigator.push(context, MaterialPageRoute(builder: (_) => PrivacySecurityScreen()));
            // Option B: Open web in browser
            // launchUrl(Uri.parse('https://[YOUR-DOMAIN]/legal/privacy-and-security'), mode: LaunchMode.externalApplication);
          },
      ),
      TextSpan(text: '.'),
    ],
  ),
)
```

If using `TapGestureRecognizer`, add:
```dart
import 'package:flutter/gestures.dart';
```

---

## 4. URL for Full Policy

The full policy is available at:
```
https://[YOUR-DOMAIN]/legal/privacy-and-security
```

Use your deployed web app domain. The page is the same as the web version and can be opened in an in-app WebView or external browser.

---

## 5. Checklist

- [ ] Add ListTile to Settings screen
- [ ] Create `PrivacySecurityScreen` widget
- [ ] Add "View full policy on web" link (with correct domain)
- [ ] Add agreement text to onboarding / first-time login final step
- [ ] Test navigation and URL launch
