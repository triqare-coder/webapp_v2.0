# 🚑 Emergency Response Management Platform - Role Functionality Guide

This document provides a comprehensive overview of what each user role can do within the Emergency Response Management Platform.

---

## Table of Contents
1. [Admin Role](#1-admin-role)
2. [ERT (Emergency Response Team) Role](#2-ert-emergency-response-team-role)
3. [Transport Company Role](#3-transport-company-role)
4. [Patient Role](#4-patient-role)
5. [Driver Role](#5-driver-role)

---

## 1. Admin Role

**Access Path:** `/admin/*`

The Admin role has full system access and is responsible for overall platform management, user administration, and system configuration.

### 1.1 Dashboard (`/admin/dashboard`)
- **System Overview Stats:**
  - Total users count with role distribution
  - Active SOS cases count
  - Total hospitals in network
  - Total ambulances in fleet
- **Recent Emergency Cases:** View latest SOS alerts with status
- **System Alerts:** Critical notifications requiring attention
- **Quick Actions:** Fast access to common administrative tasks
- **User Distribution Chart:** Visual breakdown of users by role

### 1.2 User Management (`/admin/users`)
- **View All Users:** Paginated list with search and filters
- **Add New Users:** Create users with role assignment
- **Edit Users:** Modify user details and roles
- **Delete Users:** Remove users from the system
- **Role Assignment:** Assign/change user roles (admin, ert, transport_company, patient, driver)
- **User Search:** Filter by name, email, role, status

### 1.3 Hospital Management (`/admin/hospitals`)
- **View All Hospitals:** List with capacity and status information
- **Add Hospitals:** Register new hospitals in the network
- **Edit Hospital Details:** Update capacity, specialties, contact info
- **Hospital Status:** Monitor active/inactive status
- **Location Filtering:** Filter by city, state, country

### 1.4 Patient Management (`/admin/patients`)
- **View All Patients:** Complete patient registry
- **Patient Details:** Medical info, emergency contacts, subscriptions
- **Edit Patient Records:** Update patient information
- **Subscription Status:** View patient subscription plans

### 1.5 Driver Management (`/admin/drivers`)
- **View All Drivers:** List of registered drivers
- **Driver Details:** License info, certifications, status
- **Verification Status:** Track driver verification
- **Company Assignment:** View which transport company drivers belong to

### 1.6 Transport Company Management (`/admin/transport-companies`)
- **View All Companies:** List of registered transport companies
- **Company Details:** Registration, license validity, fleet size
- **Verification Status:** Approve/verify companies
- **Driver Count:** Number of drivers per company

### 1.7 Accounting (`/admin/accounting`)
- **Financial Dashboard:**
  - Total revenue (all-time and monthly)
  - Active subscriptions count
  - Payment success rate
- **Subscription Plans:** Create and manage subscription tiers
- **Patient Subscriptions:** View/manage patient subscriptions
- **Payment History:** Transaction records with status tracking
- **Recent Transactions:** Latest payment activities

### 1.8 Reports & Analytics (`/admin/reports`)
- **Key Metrics:**
  - Total emergencies handled
  - Average response time
  - Success rate percentage
  - Active ambulances count
- **Monthly Trends:** Emergency statistics over time
- **Emergency Types Distribution:** Breakdown by emergency category
- **Hospital Performance:** Cases handled, response times, ratings
- **Export Data:** Download reports in various formats
- **Date Range Filtering:** Custom report periods

### 1.9 Master Data Management (`/admin/master-data`)
- **Countries:** Manage country records
- **States:** Manage state/province records
- **Cities:** Manage city records
- **Pincodes:** Manage postal code records
- **Hierarchical Data:** Country → State → City → Pincode relationships

### 1.10 System Settings
- **Site Configuration:** Platform-wide settings
- **Database Management:** Data maintenance tools
- **System Monitoring:** Health checks and logs

---

## 2. ERT (Emergency Response Team) Role

**Access Path:** `/erteam/*`

The ERT role is responsible for monitoring and managing emergency responses, dispatching ambulances, and coordinating with hospitals.

### 2.1 Command Center Dashboard (`/erteam/dashboard`)
- **Critical Stats (Real-time, updates every 30 seconds):**
  - Active emergencies count
  - Critical and high-priority cases
  - Available ambulances
  - On-duty drivers count
  - Average response time
  - Completed cases today
  - Pending assignments
- **Active Emergency Cases:** Live list of ongoing emergencies with:
  - Patient name and contact
  - Location details
  - Severity level (high/medium/low)
  - Assigned driver info
  - Status badges
- **Quick Actions:**
  - Create SOS Alert
  - Live Map View
  - Dispatch Center
  - Route Optimization

### 2.2 SOS Management (`/erteam/sos`)
- **Create SOS Request:** Manually create emergency requests for patients
- **SOS Request Table:** Comprehensive view with:
  - SOS ID
  - Patient info (name, email, blood group, allergies)
  - Contact numbers (patient + emergency contacts)
  - Status tracking
  - Assigned driver
  - Location
  - Timestamp
- **Status Tabs:** Filter by status:
  - All | Triggered | Assigned | En Route | Picked Up | At Hospital | Completed | Cancelled
- **Actions per SOS:**
  - Assign Driver
  - Update Status
  - View Details
  - Delete Request
  - View on Map
  - Call Patient
- **Search:** Find by SOS ID, patient name, email, driver, or location
- **Pagination:** Navigate through large datasets
- **Test SOS:** Create test emergency for system testing

### 2.3 Emergency Assignments (`/erteam/assignments`)
- **Assignment Statistics:**
  - Active assignments
  - High priority count
  - Completed today
  - Total assignments
- **Assignment Cards:** Detailed view per assignment:
  - Priority badge (high/medium/low)
  - Status (assigned/en_route/on_scene/completed/cancelled)
  - Patient name and contact
  - Location
  - Assigned ambulance and driver
  - Estimated arrival time
  - Case description
- **Filters:** Search by patient, case ID, location; filter by status and priority

### 2.4 Live Map View (`/erteam/map`)
- **Interactive Map:** Real-time visualization of:
  - Active emergency locations (color-coded by priority)
  - Ambulance positions and status
  - Hospital locations
- **Map Controls:**
  - Toggle emergencies/ambulances/hospitals visibility
  - Center map
  - Fullscreen mode
- **Side Panels:**
  - Active Emergencies list with quick actions
  - Ambulance Fleet status (driver, ETA, assignment)
  - Nearby Hospitals (beds available, specialties, distance)
- **Quick Actions:** Create emergency, dispatch ambulance, route optimization

### 2.5 Driver Status (`/erteam/drivers`)
- View all drivers and their current status
- Monitor driver availability
- Track driver locations

### 2.6 Emergency History (`/erteam/history`)
- Past emergency response records
- Historical data for analysis

### 2.7 Notifications (`/erteam/notifications`)
- System alerts
- Emergency notifications
- Status updates

---

## 3. Transport Company Role

**Access Path:** `/transport/*`

Transport companies manage their fleet of drivers and monitor assignments related to their company.

### 3.1 Transport Dashboard (`/transport/dashboard`)
- **Company Profile Card:**
  - Company name and logo
  - Verification status badge
  - Registration number
  - License validity
  - Contact information
- **Performance Statistics:**
  - Total drivers count
  - Available drivers
  - Drivers on trip
  - Active SOS cases
  - Completed today/this month
  - Average response time
  - Success rate percentage
- **My Drivers List:** Quick view of company drivers with:
  - Driver name and photo
  - Status (available/on_trip/inactive)
  - Current assignment (if any)
  - Contact info
- **Recent SOS Cases:** Latest emergency cases involving company drivers

### 3.2 Driver Management (`/transport/drivers`)
- **Add New Driver:** Register drivers with:
  - Personal info (name, email, phone, address)
  - License details (number, class, expiry)
  - Aadhar number
  - Emergency contacts
- **View All Drivers:** Paginated list with:
  - Driver photo and name
  - Status badge (available/on_trip/inactive)
  - License number
  - Contact info
  - GPS status
  - Verification status
- **Edit Driver:** Update driver information
- **Delete Driver:** Remove driver from company
- **Search & Filter:**
  - Search by name, email, license, location
  - Filter by status (All/Available/On Trip/Inactive)
- **Driver Details Modal:** Full driver profile view

### 3.3 Driver Assignments (`/transport/assignments`)
- **Assignment Overview Stats:**
  - Total drivers
  - Online drivers
  - Busy drivers
  - Inactive drivers
- **Driver Assignment Cards:** Per-driver view showing:
  - Driver name and photo
  - Current status
  - Current SOS assignment details (if busy):
    - SOS ID
    - Patient name
    - Pickup location
    - Destination hospital
    - Status
    - Assigned time
  - "No active assignment" for available drivers

### 3.4 Driver Performance (`/transport/drivers/performance`)
- Performance metrics per driver
- Trip completion rates
- Response time analytics

### 3.5 Performance Reports (`/transport/reports`)
- Company-wide performance metrics
- Driver statistics
- Trip analytics
- Revenue reports

---

## 4. Patient Role

**Access Path:** `/patient/*` (Web) or **Mobile App** (Primary)

> **Note:** Patients are primarily expected to use the mobile application. Web access is limited.

### 4.1 Patient Profile (`/patient/profile`)
The profile page has 4 main tabs:

#### Tab 1: Personal Information
- **View/Edit:**
  - Full name
  - Email address
  - Phone number
  - Date of birth
  - Gender
  - Full address (street, city, state, country, pincode)
- **Emergency Contacts:**
  - Contact name
  - Relationship
  - Phone number
  - Multiple contacts supported

#### Tab 2: Medical Information
- **Medical Details:**
  - Blood type (A+, A-, B+, B-, AB+, AB-, O+, O-)
  - Known allergies (list)
  - Medical conditions (list)
  - Current medications (list)
  - Insurance provider
  - Insurance policy number
- **Critical for Emergency Response:** This information is shared with responders during emergencies

#### Tab 3: Notification Preferences
- **Toggle Settings:**
  - Emergency alerts
  - Appointment reminders
  - Medication reminders
  - Health tips
  - Promotional offers
  - System updates
- **Notification Channels:**
  - Email notifications
  - SMS notifications
  - Push notifications

#### Tab 4: Privacy & Preferences
- **Data Sharing:**
  - Share data with healthcare providers
  - Allow emergency access to medical records
  - Share location during emergencies
- **Account Actions:**
  - Download my data
  - Delete my account

### 4.2 Emergency Services (`/patient/emergency`)
- Request emergency assistance
- Trigger SOS alert
- View nearby hospitals

### 4.3 My Requests (`/patient/requests`)
- View history of service requests
- Track current request status

---

## 5. Driver Role

**Access Path:** `/driver/*` (Web) or **Mobile App** (Primary)

> **Note:** Drivers are primarily expected to use the mobile application. Web access is limited.

### 5.1 Driver Profile (`/driver/profile`)
The profile page has 4 main tabs:

#### Tab 1: Personal Information
- **View/Edit:**
  - Full name
  - Email address
  - Phone number
  - Date of birth
  - Gender
  - Full address
- **Emergency Contacts:**
  - Contact name
  - Relationship
  - Phone number

#### Tab 2: Professional Information
- **License Details:**
  - License number
  - License class (A, B, C, D, E)
  - License expiry date
- **Certifications:**
  - First Aid certification
  - CPR certification
  - Advanced Life Support
  - Defensive Driving
- **Languages Spoken:** Multiple language selection
- **Vehicle Assignment:**
  - Assigned vehicle number
  - Vehicle type

#### Tab 3: Notification Preferences
- **Toggle Settings:**
  - Trip assignment alerts
  - Emergency alerts
  - Shift reminders
  - Traffic updates
  - System updates
  - Promotional messages
- **Notification Channels:**
  - Email notifications
  - SMS notifications
  - Push notifications

#### Tab 4: Work Preferences
- **Shift Preferences:**
  - Preferred shift (Morning/Afternoon/Night/Flexible)
  - Maximum trips per day
- **Automation:**
  - Auto-accept trip assignments
  - Share live location while on duty
- **Account Actions:**
  - Download my data
  - Deactivate account

### 5.2 Active Assignments (`/driver/assignments`)
- View current transport assignments
- Accept/reject assignments
- Update trip status
- Navigation to pickup/destination

### 5.3 Trip History (`/driver/history`)
- View completed trips
- Trip details and earnings
- Performance statistics

---

## Summary: Role Capabilities Matrix

| Feature | Admin | ERT | Transport | Patient | Driver |
|---------|-------|-----|-----------|---------|--------|
| User Management | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| Hospital Management | ✅ Full | 👁️ View | ❌ | ❌ | ❌ |
| SOS Management | 👁️ View | ✅ Full | 👁️ Own | 🆘 Create | 📋 Assigned |
| Driver Management | ✅ Full | 👁️ View | ✅ Own | ❌ | ❌ |
| Live Map | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| Accounting | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ Full | ❌ | ✅ Own | ❌ | ❌ |
| Profile Management | ✅ | ✅ | ✅ | ✅ | ✅ |
| Master Data | ✅ Full | ❌ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ Full: Complete access and control
- 👁️ View: Read-only access
- ✅ Own: Full access to own data only
- 📋 Assigned: Access to assigned items only
- 🆘 Create: Can create/trigger
- ❌: No access

---

## SOS Request Lifecycle

```
1. SOS Triggered → 2. Driver Assigned → 3. Driver En Route → 4. Patient Picked Up → 5. At Hospital → 6. Completed
                                                                                                    ↘ Cancelled
```

**Status Definitions:**
- **Triggered:** Emergency request created, awaiting driver assignment
- **Assigned:** Driver has been assigned to the case
- **En Route:** Driver is traveling to patient location
- **Picked Up:** Patient has been picked up by the ambulance
- **At Hospital:** Ambulance has arrived at the hospital
- **Completed:** Emergency response successfully completed
- **Cancelled:** Request was cancelled

---

*Document generated for Emergency Response Management Platform v1.0*

