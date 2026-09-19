"use client";

type ErrorMessageProps = {
  message?: string;
};

export default function ErrorMessage({
  message,
}: ErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="sg-error-message"
      role="alert"
    >
      <span>!</span>

      <p>{message}</p>
    </div>
  );
}
