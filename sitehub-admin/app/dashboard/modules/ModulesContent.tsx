"use client";

import { useState } from "react";
import Messaging from "../companies/Messaging";
import AssetManagement from "../companies/AssetManagement";
import { MessageSquare, Package } from "lucide-react";

type Tab = "messaging" | "assets";

export default function ModulesContent({ companyId, canDeleteMessages = false }: { companyId: string; canDeleteMessages?: boolean }) {
  const [tab, setTab] = useState<Tab>("messaging");

  const tabs: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
    { id: "messaging", label: "Messaging", icon: MessageSquare },
    { id: "assets", label: "Assets", icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                tab === t.id
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Icon size={18} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "messaging" && <Messaging companyId={companyId} canDelete={canDeleteMessages} />}
      {tab === "assets" && <AssetManagement companyId={companyId} />}
    </div>
  );
}
