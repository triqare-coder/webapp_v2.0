-- =============================================
-- SEED DATA: SUBSCRIPTION PLANS
-- Default subscription plans
-- =============================================

INSERT INTO public.subscription_plans (name, description, price, billing_cycle, features, is_active) VALUES
    (
        'Basic',
        'Essential emergency response services',
        0.00,
        'monthly',
        '{"max_sos_requests": 5, "priority_support": false, "ambulance_tracking": true, "emergency_contacts": 2, "hospital_network": "basic"}'::jsonb,
        true
    ),
    (
        'Premium',
        'Enhanced emergency services with priority support',
        499.00,
        'monthly',
        '{"max_sos_requests": 20, "priority_support": true, "ambulance_tracking": true, "emergency_contacts": 5, "hospital_network": "premium", "24x7_support": true, "health_monitoring": true}'::jsonb,
        true
    ),
    (
        'Family',
        'Complete family protection plan',
        999.00,
        'monthly',
        '{"max_sos_requests": 50, "priority_support": true, "ambulance_tracking": true, "emergency_contacts": 10, "hospital_network": "premium", "24x7_support": true, "health_monitoring": true, "family_members": 5, "annual_checkup": true}'::jsonb,
        true
    ),
    (
        'Enterprise',
        'Corporate emergency response solution',
        4999.00,
        'monthly',
        '{"max_sos_requests": -1, "priority_support": true, "ambulance_tracking": true, "emergency_contacts": -1, "hospital_network": "premium", "24x7_support": true, "health_monitoring": true, "dedicated_support": true, "custom_integration": true, "analytics_dashboard": true}'::jsonb,
        true
    )
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    billing_cycle = EXCLUDED.billing_cycle,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =============================================
-- END OF SUBSCRIPTION PLANS SEED DATA
-- =============================================

