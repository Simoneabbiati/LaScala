"use client";
import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      duration={8000}
      toastOptions={{
        style: { fontFamily: "var(--font-sans)" },
      }}
    />
  );
}
