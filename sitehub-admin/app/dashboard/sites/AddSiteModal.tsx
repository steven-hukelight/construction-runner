"use client";

import { useState } from "react";
import Button from "../components/ui/Button";
import AddSiteForm from "./AddSiteForm";

/** Standalone add-site control. The Sites table uses `AddSiteForm` in its toolbar. */
export default function AddSiteModal() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <Button type="button" size="sm" onClick={() => setOpen((v) => !v)}>
        {open ? "Close" : "Add Site"}
      </Button>
      {open ? (
        <AddSiteForm
          onCancel={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
