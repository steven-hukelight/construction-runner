"use client";

import { useTheme } from "@/app/ThemeProvider";

export default function DisplaySettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Display Preferences</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <p className="font-semibold text-gray-900">Theme</p>
            <p className="text-sm text-gray-600">Choose light or dark theme</p>
          </div>
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === "light"}
                onChange={() => setTheme("light")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Light</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === "dark"}
                onChange={() => setTheme("dark")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Dark</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
