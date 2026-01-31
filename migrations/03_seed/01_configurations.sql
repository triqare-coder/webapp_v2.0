-- =============================================
-- SEED DATA: CONFIGURATIONS
-- System configuration defaults
-- =============================================

INSERT INTO public.configurations (key, value) VALUES
    ('search_radius_km', '10'),
    ('max_drivers_per_request', '5'),
    ('default_request_timeout_minutes', '30'),
    ('emergency_contact_required', 'true'),
    ('auto_assign_drivers', 'true'),
    ('driver_location_update_interval_seconds', '30'),
    ('sos_priority_levels', '["low", "medium", "high", "critical"]'),
    ('supported_languages', '["en", "hi", "ml", "ta", "te"]'),
    ('app_version', '1.0.0'),
    ('maintenance_mode', 'false')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- =============================================
-- END OF CONFIGURATION SEED DATA
-- =============================================

