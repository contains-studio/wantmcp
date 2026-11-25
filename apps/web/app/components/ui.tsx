/**
 * The shared form controls (docs/design-standards.md). Every field, select and button in the
 * app goes through these, so heights, label placement, focus and error states stay the same on
 * every page and in every theme.
 *
 *   <Field label="Title" hint="…" error={err}>{(p) => <Input {...p} name="title" />}</Field>
 *
 * Field wires the label, hint and error to the control by id. In a row of controls, either
 * every control has a visible label or none do (use `labelHidden` on all of them).
 */
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export type Size = "sm" | "md";

type ControlProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: true };

export function Field({
  label,
  hint,
  error,
  labelHidden = false,
  className = "",
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  labelHidden?: boolean;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id} className={labelHidden ? "sr-only" : "label"}>
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, ...(error ? { "aria-invalid": true as const } : {}) })}
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ size = "md", className = "", ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { size?: Size }) {
  return <input className={`input ${size === "sm" ? "input-sm" : ""} ${className}`} {...rest} />;
}

export function Select({ size = "md", className = "", ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & { size?: Size }) {
  return <select className={`select ${size === "sm" ? "input-sm" : ""} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`textarea ${className}`} {...rest} />;
}

export type ButtonVariant = "primary" | "secondary" | "plain" | "danger";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "btn-want",
  secondary: "", // solid ink
  plain: "btn-ghost",
  danger: "btn-danger",
};

/** One primary action per view; everything else is secondary or plain. */
export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "submit",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: Size | "lg" }) {
  const s = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  return <button type={type} className={`btn ${VARIANT[variant]} ${s} ${className}`} {...rest} />;
}
