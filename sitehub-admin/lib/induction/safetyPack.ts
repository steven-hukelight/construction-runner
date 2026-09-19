export type SafetySection = {
  id: string;
  title: string;
  body: string;
};

export function defaultInductionSafetySections(): SafetySection[] {
  return [
    {
      id: "ppe",
      title: "PPE",
      body: "List the PPE required on this site (hard hat, boots, hi-vis, eye protection, and any extras). Edit this text for the site.",
    },
    {
      id: "emergency",
      title: "Emergency procedures",
      body: "Assembly point, first aid, fire, and who to call. Edit this text for the site.",
    },
    {
      id: "welfare",
      title: "Welfare",
      body: "Toilets, drinking water, rest areas, and smoking rules. Edit this text for the site.",
    },
    {
      id: "access",
      title: "Access and egress",
      body: "Site hours, signing in, vehicle routes, and pedestrian routes. Edit this text for the site.",
    },
    {
      id: "hazards",
      title: "Site hazards",
      body: "Main hazards on this site and the controls that apply. Edit this text for the site.",
    },
  ];
}

export function normalizeSafetySections(raw: unknown): SafetySection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const title = String(row.title ?? "").trim();
      const body = String(row.body ?? "").trim();
      const id = String(row.id ?? "").trim() || `section-${index + 1}`;
      return { id, title, body };
    })
    .filter((section) => section.title.length > 0);
}

export function safetyPackHasContent(sections: SafetySection[]): boolean {
  return sections.some((section) => section.title.trim() && section.body.trim());
}
