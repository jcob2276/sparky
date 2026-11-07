-- Narzedzia do strojenia indeksow (Supabase Query Performance / index_advisor).
-- Instalowane w schemacie extensions, nie w public (zgodnie z ostrzezeniami doradcy bezpieczenstwa).
create extension if not exists hypopg with schema extensions;
create extension if not exists index_advisor with schema extensions;
