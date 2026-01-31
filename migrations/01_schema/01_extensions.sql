-- =============================================
-- EXTENSIONS
-- PostgreSQL extensions required for the application
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable PostGIS for geospatial queries (optional, for future use)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- Comments
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions';

