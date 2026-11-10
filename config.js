// Use a separate reader project. Never put a service-role key here.
window.READER_CONFIG = {
  supabaseUrl: 'https://zkffujfbzbxoexohcmwk.supabase.co',
  supabaseKey: 'sb_publishable_ezInlE8peNqibDp4xmhtDw_uEvhUJhJ',
  appUrl: 'https://shrg182.github.io/reader-notes/',
  // Enable only after sharing.sql is installed and its policies verified.
  sharingEnabled: true,
  migrationEnabled: true,
  richEditorEnabled: true,
  // Enable after supabase/pdf-library.sql is installed and verified.
  pdfLibraryEnabled: true,
  linkImportEnabled: true,
  organizeEnabled: true,
  demoLibraryEnabled: true
};
