"use client";
import { useState } from "react";
import { formatNumericInput, parseNumericInput } from "@/lib/number-input";
export function NumberInput({
  name,
  defaultValue,
  required,
  min = 0,
  integer = false,
}: {
  name: string;
  defaultValue: unknown;
  required?: boolean;
  min?: number;
  integer?: boolean;
}) {
  const [value, setValue] = useState(
    formatNumericInput(String(defaultValue ?? "")),
  );
  return (
    <input
      name={name}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      dir="ltr"
      required={required}
      value={value}
      pattern="[0-9,]+(\.[0-9]+)?"
      onChange={(e) => {
        const formatted = formatNumericInput(e.target.value),
          n = parseNumericInput(formatted);
        e.target.setCustomValidity(
          formatted &&
            (!Number.isFinite(n) ||
              n < min ||
              (integer && !Number.isInteger(n)))
            ? `Minimum: ${min}${integer ? " · Whole numbers only" : ""}`
            : "",
        );
        setValue(formatted);
      }}
    />
  );
}
