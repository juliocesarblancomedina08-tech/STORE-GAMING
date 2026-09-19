"use client";

import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <main className={`sg-page-container ${className}`}>
      {children}
    </main>
  );
}
