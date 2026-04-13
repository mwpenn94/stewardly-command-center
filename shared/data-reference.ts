/**
 * Stewardly Command Center — Merged Data Reference
 *
 * This file provides permanent CDN URLs and metadata for all merged data files
 * produced by the Google Drive extraction pipeline. These files are the canonical
 * source of truth for contacts extracted from the strategic partners/COIs and
 * COI events workbooks.
 *
 * Last updated: 2026-04-13
 */

export const DATA_SOURCES = {
  /**
   * All 2,313 contacts extracted from Google Drive workbooks with full POC data.
   * Includes: firstName, lastName, email, phone, companyName, website, city, state,
   *           region, pocTitle, tags, source, customFields
   */
  GDRIVE_CONTACTS_WITH_POC: {
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663357378777/A4Cm9uy3mBsPbcfeWYdf2k/gdrive_contacts_with_poc_12b8b3f0.csv',
    records: 2313,
    description: 'All Google Drive contacts with POC (point of contact) data',
    sources: [
      { sheet: 'CPAs & Tax Advisors', count: 329, tags: ['Strategic-Partner-COI', 'CPA-Tax'] },
      { sheet: 'Estate & Trust Attorneys', count: 177, tags: ['Strategic-Partner-COI', 'Estate-Attorney'] },
      { sheet: 'Nonprofits & Foundations', count: 204, tags: ['Strategic-Partner-COI', 'Nonprofit-Foundation'] },
      { sheet: 'HR & Benefits Consultants', count: 74, tags: ['Strategic-Partner-COI', 'HR-Benefits'] },
      { sheet: 'Agricultural Clients', count: 302, tags: ['Strategic-Partner-COI', 'Agricultural'] },
      { sheet: 'Referring Agencies', count: 128, tags: ['Strategic-Partner-COI', 'Referring-Agency'] },
      { sheet: 'Master Event Schedule', count: 645, tags: ['COI-Event', 'Master-Event-Schedule'] },
      { sheet: 'Opportunity Organizations', count: 158, tags: ['COI-Event', 'Opportunity-Organization'] },
      { sheet: 'Recruiting Pipeline', count: 126, tags: ['COI-Event', 'Recruiting-Pipeline'] },
      { sheet: 'Organizations Directory', count: 170, tags: ['COI-Event', 'Organizations-Directory'] },
    ],
  },

  /**
   * 2,025 contacts that have email or phone (syncable to GHL).
   * Subset of GDRIVE_CONTACTS_WITH_POC.
   */
  GDRIVE_CONTACTS_SYNCABLE: {
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663357378777/A4Cm9uy3mBsPbcfeWYdf2k/gdrive_contacts_syncable_5d69bb9e.csv',
    records: 2025,
    description: 'Contacts with email or phone — ready for GHL sync',
  },

  /**
   * 288 organization/event records with no email or phone.
   * These are org-level records (events, organizations) that lack individual POC contact info.
   */
  GDRIVE_ORGS_NO_CONTACT: {
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663357378777/A4Cm9uy3mBsPbcfeWYdf2k/gdrive_orgs_no_contact_a0767108.csv',
    records: 288,
    description: 'Organization/event records without individual contact info',
  },
} as const;

/**
 * CSV column schema for all Google Drive contact files.
 */
export const GDRIVE_CSV_COLUMNS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'companyName',
  'website',
  'city',
  'state',
  'region',
  'pocTitle',
  'tags',
  'source',
  'customFields',
] as const;

/**
 * Extraction pipeline metadata.
 */
export const EXTRACTION_METADATA = {
  extractionScript: 'extract_with_poc.py',
  sourceFiles: {
    strategicPartners: '/home/ubuntu/master_db/partners/strategic_partners_cois.xlsx',
    coiEvents: '/home/ubuntu/master_db/coi_events/coi_events.xlsx',
  },
  stats: {
    totalRaw: 2313,
    withEmail: 1718,
    withPhone: 1968,
    withEitherEmailOrPhone: 2025,
    withNeither: 288,
    withPocName: 1394,
  },
  syncResults: {
    firstRun: { created: 948, updated: 354, errors: 485, note: 'Before POC re-extraction' },
    // secondRun will be populated after re-sync with POC data
  },
} as const;
