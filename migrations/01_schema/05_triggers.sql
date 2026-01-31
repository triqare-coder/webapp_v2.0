-- =============================================
-- TRIGGERS AND FUNCTIONS
-- Automated database operations
-- =============================================

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp';

-- =============================================
-- APPLY UPDATED_AT TRIGGER TO ALL TABLES
-- =============================================

-- Users
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Countries
DROP TRIGGER IF EXISTS update_countries_updated_at ON public.countries;
CREATE TRIGGER update_countries_updated_at
    BEFORE UPDATE ON public.countries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- States
DROP TRIGGER IF EXISTS update_states_updated_at ON public.states;
CREATE TRIGGER update_states_updated_at
    BEFORE UPDATE ON public.states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cities
DROP TRIGGER IF EXISTS update_cities_updated_at ON public.cities;
CREATE TRIGGER update_cities_updated_at
    BEFORE UPDATE ON public.cities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Pincodes
DROP TRIGGER IF EXISTS update_pincodes_updated_at ON public.pincodes;
CREATE TRIGGER update_pincodes_updated_at
    BEFORE UPDATE ON public.pincodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Hospitals
DROP TRIGGER IF EXISTS update_hospitals_updated_at ON public.hospitals;
CREATE TRIGGER update_hospitals_updated_at
    BEFORE UPDATE ON public.hospitals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Patients
DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Transport Companies
DROP TRIGGER IF EXISTS update_transport_companies_updated_at ON public.transport_companies;
CREATE TRIGGER update_transport_companies_updated_at
    BEFORE UPDATE ON public.transport_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drivers
DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Emergency Contacts
DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON public.emergency_contacts;
CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON public.emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SOS Requests
DROP TRIGGER IF EXISTS update_sos_requests_updated_at ON public.sos_requests;
CREATE TRIGGER update_sos_requests_updated_at
    BEFORE UPDATE ON public.sos_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SOS Request Assigned
DROP TRIGGER IF EXISTS update_sos_request_assigned_updated_at ON public.sos_request_assigned;
CREATE TRIGGER update_sos_request_assigned_updated_at
    BEFORE UPDATE ON public.sos_request_assigned
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Subscription Plans
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Patient Subscriptions
DROP TRIGGER IF EXISTS update_patient_subscriptions_updated_at ON public.patient_subscriptions;
CREATE TRIGGER update_patient_subscriptions_updated_at
    BEFORE UPDATE ON public.patient_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Billing History
DROP TRIGGER IF EXISTS update_billing_history_updated_at ON public.billing_history;
CREATE TRIGGER update_billing_history_updated_at
    BEFORE UPDATE ON public.billing_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Configurations
DROP TRIGGER IF EXISTS update_configurations_updated_at ON public.configurations;
CREATE TRIGGER update_configurations_updated_at
    BEFORE UPDATE ON public.configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Announcements
DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Pending CSV Imports
DROP TRIGGER IF EXISTS update_pending_csv_imports_updated_at ON public.pending_csv_imports;
CREATE TRIGGER update_pending_csv_imports_updated_at
    BEFORE UPDATE ON public.pending_csv_imports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- END OF TRIGGER DEFINITIONS
-- =============================================

