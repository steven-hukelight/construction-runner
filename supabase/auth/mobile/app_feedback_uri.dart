// Copy into the Construction Runner worker app.
// With url_launcher: await launchUrl(appFeedbackMailUri, mode: LaunchMode.externalApplication);

/// Opens info@construction-runner.com with a prefilled subject.
final Uri appFeedbackMailUri = Uri(
  scheme: 'mailto',
  path: 'info@construction-runner.com',
  queryParameters: {
    'subject': 'Construction Runner — app feedback',
  },
);
