-- Run as jungletribe_preview_owner on the isolated staging database only.
-- Create the login separately through Neon as a scoped read_write role.
GRANT USAGE ON SCHEMA auth TO jungletribe_staging_auth_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth
  TO jungletribe_staging_auth_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE jungletribe_preview_owner IN SCHEMA auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jungletribe_staging_auth_runtime;
