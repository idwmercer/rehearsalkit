export interface LookupOption {
  label: string;
  value: string;
}

/** Named lists of related records, keyed by the `lookup` name a field uses. */
export type Lookups = Record<string, LookupOption[]>;

type Rec<F> = { fieldData: F }[];

/**
 * The related records a tab has loaded. A tab passes whatever its query
 * returned; any list it didn't load just produces no options.
 */
export interface LookupSource {
  castMembers?: Rec<{ id: string; NameFirst: string; NameLast: string }>;
  characters?: Rec<{ id: string; CharacterName: string; idProduction: string }>;
  productions?: Rec<{ id: string; Title: string }>;
  rosterMembers?: Rec<{ id: string; nameFirst: string; nameLast: string }>;
  theatres?: Rec<{ id: string; TheatreName: string }>;
}

/**
 * Turns a list of records into dropdown options: the value is the record's
 * `id` (what the foreign-key field stores), the label is what a person
 * recognises. Sorted by label.
 */
const toOptions = <F extends { id: string }>(
  records: Rec<F> | undefined,
  label: (fieldData: F) => string
): LookupOption[] =>
  (records ?? [])
    .map((r) => ({
      label: label(r.fieldData).trim() || r.fieldData.id,
      value: r.fieldData.id,
    }))
    .toSorted((a, b) => a.label.localeCompare(b.label));

/**
 * Dropdown lists for the relation fields on the edit / create forms. Lookup
 * names: castMembers, characters (labelled with their show), productions,
 * rosterMembers, theatres.
 */
export const buildLookups = (source: LookupSource | undefined): Lookups => {
  const showTitles = new Map(
    (source?.productions ?? []).map((p) => [p.fieldData.id, p.fieldData.Title])
  );
  return {
    castMembers: toOptions(
      source?.castMembers,
      (f) => `${f.NameFirst} ${f.NameLast}`
    ),
    characters: toOptions(
      source?.characters,
      (f) =>
        `${f.CharacterName} — ${showTitles.get(f.idProduction) ?? "no show"}`
    ),
    productions: toOptions(source?.productions, (f) => f.Title),
    rosterMembers: toOptions(
      source?.rosterMembers,
      (f) => `${f.nameFirst} ${f.nameLast}`
    ),
    theatres: toOptions(source?.theatres, (f) => f.TheatreName),
  };
};
