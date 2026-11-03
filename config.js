// Konfiguration für die geräteübergreifende Synchronisierung (Supabase).
// Leer lassen = App läuft rein lokal (Lernstand nur im Browser + Export/Import).
// Der anon-Key ist ÖFFENTLICH und darf im Frontend stehen – geschützt wird über Row Level Security
// (siehe supabase/schema.sql). NIEMALS den service_role-Key hier eintragen!
window.KLY_CONFIG = {
  supabaseUrl: 'https://unkmvjdvcehkweutzyqw.supabase.co',
  supabaseAnonKey: 'sb_publishable_Q3xnTS5dXfL3osWHp6evKA_WSIdwTDl',
  // Nachtfalter-Konto (eigenes Supabase-Projekt, siehe supabase/konto-schema.sql). Publishable Key = öffentlich.
  kontoUrl: 'https://sxapebxzxmathkvtuuvn.supabase.co',
  kontoKey: 'sb_publishable_04l6lOd2uIPsErdWDOMvew_U6vsFGbn',
  // Online-Labs (Arena, siehe arena/README.md). Leer = Knopf „Online spielen“ ausgeblendet.
  arenaUrl: '',
};
