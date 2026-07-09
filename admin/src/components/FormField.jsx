export default function FormField({ label, children }) {
  return (
    <label className="field">
      {label}
      {children}
    </label>
  );
}
