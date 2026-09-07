import React from "react";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  center?: boolean;
}

export default function Section({
  children,
  className = "",
  center = false,
}: SectionProps) {
  return (
    <section
      className={`py-12 md:py-20 ${center ? "flex items-center justify-center" : ""} ${className}`}
    >
      {children}
    </section>
  );
}
