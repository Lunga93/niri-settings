interface SettingsRowProps {
  readonly title: string;
  readonly description?: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
}

const SettingsRow = ({
  title,
  description,
  hint,
  children,
}: SettingsRowProps): React.JSX.Element => (
  <div className="flex items-center justify-between gap-4 px-5 py-3.5">
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium text-text-body">{title}</div>
      {description !== undefined && (
        <div className="text-[11px] text-text-subtitle mt-0.5 leading-relaxed">{description}</div>
      )}
      {hint !== undefined && hint !== "" && (
        <div className="text-[10px] text-accent mt-1 italic">{hint}</div>
      )}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export default SettingsRow;
