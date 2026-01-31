-- =============================================
-- DATABASE INDEXES
-- Performance optimization indexes
-- =============================================

-- =============================================
-- USERS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON public.users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- =============================================
-- LOCATION TABLES INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries(name);
CREATE INDEX IF NOT EXISTS idx_states_country_id ON public.states(country_id);
CREATE INDEX IF NOT EXISTS idx_states_name ON public.states(name);
CREATE INDEX IF NOT EXISTS idx_cities_state_id ON public.cities(state_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_pincodes_city_id ON public.pincodes(city_id);
CREATE INDEX IF NOT EXISTS idx_pincodes_code ON public.pincodes(code);

-- =============================================
-- HOSPITALS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_hospitals_name ON public.hospitals(name);
CREATE INDEX IF NOT EXISTS idx_hospitals_hospital_type ON public.hospitals(hospital_type);
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON public.hospitals(status);
CREATE INDEX IF NOT EXISTS idx_hospitals_city_id ON public.hospitals(city_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_state_id ON public.hospitals(state_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON public.hospitals(latitude, longitude);

-- =============================================
-- PATIENTS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_primary_hospital_id ON public.patients(primary_hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_city_id ON public.patients(city_id);
CREATE INDEX IF NOT EXISTS idx_patients_blood_group ON public.patients(blood_group);

-- =============================================
-- TRANSPORT COMPANIES TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_transport_companies_user_id ON public.transport_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_transport_companies_company_name ON public.transport_companies(company_name);
CREATE INDEX IF NOT EXISTS idx_transport_companies_city_id ON public.transport_companies(city_id);
CREATE INDEX IF NOT EXISTS idx_transport_companies_rating ON public.transport_companies(rating);

-- =============================================
-- DRIVERS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_transport_company_id ON public.drivers(transport_company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_is_available ON public.drivers(is_available);
CREATE INDEX IF NOT EXISTS idx_drivers_current_request_id ON public.drivers(current_request_id);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON public.drivers(current_latitude, current_longitude);
CREATE INDEX IF NOT EXISTS idx_drivers_rating ON public.drivers(rating);

-- =============================================
-- EMERGENCY CONTACTS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_patient_id ON public.emergency_contacts(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_is_primary ON public.emergency_contacts(is_primary);

-- =============================================
-- SOS REQUESTS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_sos_requests_patient_id ON public.sos_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_sos_requests_status ON public.sos_requests(status);
CREATE INDEX IF NOT EXISTS idx_sos_requests_assigned_driver_id ON public.sos_requests(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_sos_requests_destination_hospital_id ON public.sos_requests(destination_hospital_id);
CREATE INDEX IF NOT EXISTS idx_sos_requests_priority ON public.sos_requests(priority);
CREATE INDEX IF NOT EXISTS idx_sos_requests_created_at ON public.sos_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_sos_requests_location ON public.sos_requests(latitude, longitude);

-- =============================================
-- SOS REQUEST ASSIGNED TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_sos_request_assigned_sos_request_id ON public.sos_request_assigned(sos_request_id);
CREATE INDEX IF NOT EXISTS idx_sos_request_assigned_driver_id ON public.sos_request_assigned(driver_id);
CREATE INDEX IF NOT EXISTS idx_sos_request_assigned_status ON public.sos_request_assigned(status);
CREATE INDEX IF NOT EXISTS idx_sos_request_assigned_assigned_at ON public.sos_request_assigned(assigned_at);

-- =============================================
-- SUBSCRIPTION PLANS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON public.subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_price ON public.subscription_plans(price);

-- =============================================
-- PATIENT SUBSCRIPTIONS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_patient_id ON public.patient_subscriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_plan_id ON public.patient_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_status ON public.patient_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_start_date ON public.patient_subscriptions(start_date);
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_end_date ON public.patient_subscriptions(end_date);

-- =============================================
-- BILLING HISTORY TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON public.billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_payment_status ON public.billing_history(payment_status);
CREATE INDEX IF NOT EXISTS idx_billing_history_payment_date ON public.billing_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_billing_history_transaction_id ON public.billing_history(transaction_id);

-- =============================================
-- CONFIGURATIONS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_configurations_key ON public.configurations(key);

-- =============================================
-- ANNOUNCEMENTS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON public.announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_start_at ON public.announcements(start_at);
CREATE INDEX IF NOT EXISTS idx_announcements_end_at ON public.announcements(end_at);

-- =============================================
-- PENDING CSV IMPORTS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pending_csv_imports_email ON public.pending_csv_imports(email);
CREATE INDEX IF NOT EXISTS idx_pending_csv_imports_role ON public.pending_csv_imports(role);
CREATE INDEX IF NOT EXISTS idx_pending_csv_imports_processed ON public.pending_csv_imports(processed);

-- =============================================
-- END OF INDEX DEFINITIONS
-- =============================================

