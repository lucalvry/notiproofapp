-- Add new integration types to the enum
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'calendly';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'woocommerce';
