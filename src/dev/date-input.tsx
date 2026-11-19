// FileMaker's Data API returns and accepts dates as "MM/DD/YYYY" (and
// timestamps as "MM/DD/YYYY HH:MM:SS"); a browser date input works in
// "YYYY-MM-DD". These two helpers convert between them.
const FM_DATE = /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{4})/u;
const ISO_DATE = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u;

/** "10/13/2026" (or a timestamp starting with it) -> "2026-10-13"; "" if blank or unrecognised. */
export const toInputDate = (fileMakerDate: string): string => {
  const parts = FM_DATE.exec(fileMakerDate)?.groups;
  if (!parts) {
    return "";
  }
  return `${parts.year}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`;
};

/** "2026-10-13" -> "10/13/2026"; "" when cleared. */
export const fromInputDate = (inputDate: string): string => {
  const parts = ISO_DATE.exec(inputDate)?.groups;
  if (!parts) {
    return "";
  }
  return `${parts.month}/${parts.day}/${parts.year}`;
};

interface DateInputProps {
  className: string;
  id: string;
  /** The date as FileMaker stores it, "MM/DD/YYYY", or "" for none. */
  value: string;
  /** Called with the new date as "MM/DD/YYYY", or "" if the date was cleared. */
  onChange: (value: string) => void;
}

/** A calendar date picker that reads and writes FileMaker's date format. */
export const DateInput = ({
  className,
  id,
  value,
  onChange,
}: DateInputProps) => (
  <input
    id={id}
    type="date"
    className={className}
    value={toInputDate(value)}
    onChange={(e) => onChange(fromInputDate(e.target.value))}
  />
);
