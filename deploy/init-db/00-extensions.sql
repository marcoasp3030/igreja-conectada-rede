-- Extensões básicas usadas pelo schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid, crypt
CREATE EXTENSION IF NOT EXISTS citext;     -- emails case-insensitive
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- busca por similaridade
