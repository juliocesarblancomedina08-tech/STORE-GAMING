"use client";

type LoadingProps = {
  text?: string;
};

export default function Loading({
  text = "CARGANDO...",
}: LoadingProps) {
  return (
    <div className="sg-loading">
      <div className="sg-loading-spinner" />

      <span>{text}</span>
    </div>
  );
}
