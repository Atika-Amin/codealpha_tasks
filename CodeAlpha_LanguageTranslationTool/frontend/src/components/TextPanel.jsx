export default function TextPanel({
  value,
  onChange,
  placeholder,
  readOnly = false,
  maxLength,
  footer,
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40">
      <textarea
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        maxLength={maxLength}
        rows={7}
        className={`w-full resize-none bg-transparent p-4 text-base outline-none placeholder:text-slate-500 ${
          readOnly ? "text-slate-300" : "text-slate-100"
        }`}
      />
      <div className="flex items-center justify-between border-t border-slate-700 px-3 py-2 text-xs text-slate-400">
        {footer}
      </div>
    </div>
  );
}
