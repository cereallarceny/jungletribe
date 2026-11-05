-- Run as jungletribe_owner on the production database only.
-- Create the login separately through Neon as a scoped read_write role.
GRANT USAGE ON SCHEMA auth TO jungletribe_production_auth_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth
  TO jungletribe_production_auth_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE jungletribe_owner IN SCHEMA auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jungletribe_production_auth_runtime;
