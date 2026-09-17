"use client";

import { Building2, MapPin, User } from "lucide-react";
import { CardSelect, type CardSelectItem } from "./CardSelect";

type PickerChrome = {
  disabled?: boolean;
  allowNone?: boolean;
  placeholder?: string;
  noneLabel?: string;
  noneValue?: string;
  variant?: "default" | "compact";
  className?: string;
};

export type SitePickerSite = { id?: string | null; name?: string | null };

export function SitePicker({
  sites,
  value,
  onChange,
  disabled = false,
  allowNone = false,
  placeholder = "Select site…",
  noneLabel = "— None —",
  noneValue = "",
  variant = "default",
  className,
  fieldLabel = "Site",
}: PickerChrome & {
  sites: SitePickerSite[];
  value: string;
  onChange: (id: string) => void;
  fieldLabel?: string;
}) {
  const items: CardSelectItem[] = sites
    .filter((s): s is { id: string; name?: string | null } => typeof s.id === "string" && s.id.length > 0)
    .map((s) => ({
      id: s.id,
      name: (s.name && s.name.trim()) || s.id,
    }));
  return (
    <CardSelect
      items={items}
      value={value}
      onChange={onChange}
      icon={MapPin}
      fieldLabel={fieldLabel}
      placeholder={placeholder}
      disabled={disabled}
      allowNone={allowNone}
      noneLabel={noneLabel}
      noneValue={noneValue}
      variant={variant}
      className={className}
      listLabel="Sites"
      searchPlaceholder="Search sites"
    />
  );
}

export type PersonPickerPerson = {
  id: string;
  name?: string;
  email?: string;
};

export function PersonPicker({
  people,
  value,
  onChange,
  disabled = false,
  allowNone = false,
  placeholder = "Select operative…",
  noneLabel = "— None —",
  noneValue = "",
  fieldLabel = "Operative",
  variant = "default",
  className,
}: PickerChrome & {
  people: PersonPickerPerson[];
  value: string;
  onChange: (id: string) => void;
  fieldLabel?: string;
}) {
  const items: CardSelectItem[] = people.map((p) => {
    const name = (p.name && p.name.trim()) || (p.email ? String(p.email).split("@")[0] : p.id);
    return {
      id: p.id,
      name,
      subtitle: p.email && p.email !== name ? p.email : undefined,
    };
  });
  return (
    <CardSelect
      items={items}
      value={value}
      onChange={onChange}
      icon={User}
      fieldLabel={fieldLabel}
      placeholder={placeholder}
      disabled={disabled}
      allowNone={allowNone}
      noneLabel={noneLabel}
      noneValue={noneValue}
      variant={variant}
      className={className}
      listLabel={fieldLabel}
      searchPlaceholder="Search people"
    />
  );
}

export type CompanyPickerCompany = { id: string; name?: string | null };

export function CompanyPicker({
  companies,
  value,
  onChange,
  disabled = false,
  allowNone = false,
  placeholder = "Select company…",
  noneLabel = "— None —",
  noneValue = "",
  fieldLabel = "Company",
  variant = "default",
  className,
}: PickerChrome & {
  companies: CompanyPickerCompany[];
  value: string;
  onChange: (id: string) => void;
  fieldLabel?: string;
}) {
  const items: CardSelectItem[] = companies.map((c) => ({
    id: c.id,
    name: (c.name && c.name.trim()) || c.id,
  }));
  return (
    <CardSelect
      items={items}
      value={value}
      onChange={onChange}
      icon={Building2}
      fieldLabel={fieldLabel}
      placeholder={placeholder}
      disabled={disabled}
      allowNone={allowNone}
      noneLabel={noneLabel}
      noneValue={noneValue}
      variant={variant}
      className={className}
      listLabel="Companies"
      searchPlaceholder="Search companies"
    />
  );
}
