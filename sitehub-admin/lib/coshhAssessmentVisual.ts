import type { LucideIcon } from "lucide-react";
import {
  BatteryCharging,
  Cable,
  CloudFog,
  Droplets,
  Flame,
  FlaskConical,
  HardHat,
  Plug,
  Slice,
  Volume2,
  Wind,
  Zap,
} from "lucide-react";

export type CoshhVisualInput = {
  title?: string;
  substance?: string;
  ppe?: string;
  hazardSymbols?: string[];
};

function textBlob(input: CoshhVisualInput): string {
  const parts = [
    input.title,
    input.substance,
    input.ppe,
    ...(input.hazardSymbols ?? []),
  ].filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  return parts.join(" ").toLowerCase();
}

export type CoshhAssessmentVisual = {
  Icon: LucideIcon;
  /** Wrapper around the icon (rounded container) */
  containerClass: string;
  iconClass: string;
  /** Short label for tooltips / aria */
  label: string;
};

/**
 * Picks an icon + colours from free-text COSHH fields (title, substance, PPE, hazards).
 * First matching rule wins; tuned for common site scenarios (e.g. 110V leads).
 */
export function getCoshhAssessmentVisual(input: CoshhVisualInput): CoshhAssessmentVisual {
  const t = textBlob(input);

  const amberWrap = "bg-amber-100 dark:bg-amber-900/40";
  const amberIcon = "text-amber-700 dark:text-amber-300";

  if (
    /110\s*v|240\s*v|415\s*v|110v|240v|415v|extension\s*lead|lead\s+and\s+plug|cable\s*reel|plug\s*top|pat\s|portable\s*appliance|site\s*(?:transformer|power)|\brcd\b/.test(
      t
    )
  ) {
    return {
      Icon: Plug,
      containerClass: amberWrap,
      iconClass: amberIcon,
      label: "Electrical supply / leads",
    };
  }

  if (/\b(?:cable|cables)\b|armoured|flex\b/.test(t)) {
    return {
      Icon: Cable,
      containerClass: amberWrap,
      iconClass: amberIcon,
      label: "Cables",
    };
  }

  if (/battery|batteries|charger|charging|lithium|li-ion|cordless/.test(t)) {
    return {
      Icon: BatteryCharging,
      containerClass: amberWrap,
      iconClass: amberIcon,
      label: "Batteries / charging",
    };
  }

  if (/electric|electrical|power\s*tool|volt|\bamp\b|amperes|live\b/.test(t)) {
    return {
      Icon: Zap,
      containerClass: amberWrap,
      iconClass: amberIcon,
      label: "Electrical",
    };
  }

  if (/gas|propane|butane|lpg|fuel|diesel|petrol|flammable|combust/.test(t)) {
    return {
      Icon: Flame,
      containerClass: "bg-orange-100 dark:bg-orange-900/40",
      iconClass: "text-orange-700 dark:text-orange-300",
      label: "Flammable / fuel",
    };
  }

  if (/welding|weld\s*fume|fume\s*extraction/.test(t)) {
    return {
      Icon: Wind,
      containerClass: "bg-slate-200 dark:bg-slate-700",
      iconClass: "text-slate-700 dark:text-slate-200",
      label: "Fumes / ventilation",
    };
  }

  if (/cement|silica|dust|airborne|particulate|powder|respirable/.test(t)) {
    return {
      Icon: CloudFog,
      containerClass: "bg-stone-200 dark:bg-stone-800",
      iconClass: "text-stone-700 dark:text-stone-200",
      label: "Dust / particulates",
    };
  }

  if (/paint|solvent|thinners|degreas|oil\b|resin|adhesive|sealant/.test(t)) {
    return {
      Icon: Droplets,
      containerClass: "bg-sky-100 dark:bg-sky-900/40",
      iconClass: "text-sky-700 dark:text-sky-300",
      label: "Liquids / solvents",
    };
  }

  if (/acid|alkali|caustic|corrosive/.test(t)) {
    return {
      Icon: FlaskConical,
      containerClass: "bg-rose-100 dark:bg-rose-900/40",
      iconClass: "text-rose-700 dark:text-rose-300",
      label: "Corrosive",
    };
  }

  if (/sharp|blade|knife|cut\s*risk|abrasive/.test(t)) {
    return {
      Icon: Slice,
      containerClass: "bg-red-100 dark:bg-red-900/40",
      iconClass: "text-red-700 dark:text-red-300",
      label: "Cuts / sharps",
    };
  }

  if (/noise|hearing|decibel|dba|sound\b/.test(t)) {
    return {
      Icon: Volume2,
      containerClass: "bg-violet-100 dark:bg-violet-900/40",
      iconClass: "text-violet-700 dark:text-violet-300",
      label: "Noise",
    };
  }

  if (/fall|height|scaffold|ladder|roof|edge\b|fragile\s*roof/.test(t)) {
    return {
      Icon: HardHat,
      containerClass: "bg-yellow-100 dark:bg-yellow-900/40",
      iconClass: "text-yellow-800 dark:text-yellow-200",
      label: "Falls / heights",
    };
  }

  return {
    Icon: FlaskConical,
    containerClass: "bg-purple-100 dark:bg-purple-900/40",
    iconClass: "text-purple-600 dark:text-purple-300",
    label: "COSHH assessment",
  };
}

/** Icon for the page card header: most common category among listed assessments. */
export function getDominantCoshhVisual(
  items: CoshhVisualInput[]
): CoshhAssessmentVisual {
  if (!items.length) return getCoshhAssessmentVisual({});
  const tallies = new Map<string, number>();
  const byLabel = new Map<string, CoshhAssessmentVisual>();
  for (const row of items) {
    const v = getCoshhAssessmentVisual(row);
    tallies.set(v.label, (tallies.get(v.label) ?? 0) + 1);
    byLabel.set(v.label, v);
  }
  let bestLabel = "";
  let bestN = -1;
  for (const [label, n] of tallies) {
    if (n > bestN) {
      bestN = n;
      bestLabel = label;
    }
  }
  return byLabel.get(bestLabel) ?? getCoshhAssessmentVisual({});
}
