import DarkModeToggle from "@/app/dashboard/components/DarkModeToggle";

export default function DisplaySettings() {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Display Preferences</h2>
      {/* Dark mode test box */}
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-4 rounded mb-4 border">
        This box will change color in dark mode.
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold text-gray-900">Dark Mode</p>
            <p className="text-sm text-gray-600">Switch between light and dark theme</p>
          </div>
          <DarkModeToggle />
        </div>
      </div>
    </div>
  );
}
