"use client";

import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
    console.log('HTML classList:', document.documentElement.className);
  }, [dark, mounted]);

  if (!mounted) {
    return (
      <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition">
        <Moon size={18} />
      </button>
    );
  }

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
