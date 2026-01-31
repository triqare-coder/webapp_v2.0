# 📊 **STATIC TO DYNAMIC DATA CONVERSION PLAN**

## **🎯 OVERVIEW**

**Objective**: Convert all dashboard and report pages from static/mock data to dynamic database-driven data for the Emergency Response System.

**Current Status**: Most dashboard and report pages use mock data from `src/lib/mock-data.ts` instead of real database queries.

---

## **📋 STATIC VS DYNAMIC ANALYSIS**

### **🔴 PAGES USING STATIC/MOCK DATA (NEED CONVERSION)**

#### **1. Dashboard Pages**

| **Page** | **Path** | **Mock Data Used** | **Priority** |
|----------|----------|-------------------|--------------|
| **Admin Dashboard** | `/admin/dashboard` | Hardcoded stats, system alerts | **HIGH** |
| **ERT Dashboard** | `/erteam/dashboard` | Mock emergencies, ambulances | **HIGH** |
| **Transport Dashboard** | `/transport/dashboard` | Mock driver stats, assignments | **HIGH** |
| **Driver Dashboard** | `/driver/profile` | Mock driver profile data | **MEDIUM** |
| **Patient Dashboard** | `/patient/profile` | Mock patient profile data | **MEDIUM** |

#### **2. Report Pages**

| **Page** | **Path** | **Mock Data Used** | **Priority** |
|----------|----------|-------------------|--------------|
| **Main Reports** | `/reports` | `mockSOSCases`, `mockPatients`, `mockHospitals` | **HIGH** |
| **Transport Reports** | `/transport/reports` | Mock performance metrics, revenue | **HIGH** |
| **Admin Reports** | `/admin/reports` | Mock system analytics | **MEDIUM** |

#### **3. Management Pages**

| **Page** | **Path** | **Mock Data Used** | **Priority** |
|----------|----------|-------------------|--------------|
| **SOS Management** | `/sos` | `mockSOSCases`, `mockAmbulances` | **HIGH** |
| **SOS Details** | `/sos/[id]` | `mockSOSCases` lookup | **HIGH** |
| **SOS Creation** | `/sos/add` | `mockPatients`, `mockHospitals` | **HIGH** |
| **Driver Management** | `/drivers` | `mockDrivers` | **HIGH** |
| **Driver Details** | `/drivers/[id]` | `mockDrivers` lookup | **MEDIUM** |
| **Transport Drivers** | `/transport/drivers` | Mock driver data | **HIGH** |

#### **4. Component-Level Static Data**

| **Component** | **Path** | **Mock Data Used** | **Priority** |
|---------------|----------|-------------------|--------------|
| **ERT Dashboard Component** | `src/components/dashboards/ert-dashboard.tsx` | `mockSOSCases`, `mockAmbulances` | **HIGH** |

---

### **🟢 PAGES ALREADY USING DYNAMIC DATA**

#### **1. API-Driven Pages**

| **Page** | **Path** | **Data Source** | **Status** |
|----------|----------|-----------------|------------|
| **User Management** | `/admin/users` | `/api/users` | ✅ **DYNAMIC** |
| **Hospital Management** | `/hospitals` | `/api/hospitals` | ✅ **DYNAMIC** |
| **Patient Management** | `/patients` | `/api/patients` | ✅ **DYNAMIC** |
| **Transport Companies** | `/admin/transport-companies` | `/api/transport-companies` | ✅ **DYNAMIC** |
| **Subscription Plans** | `/admin/accounting/subscription-plans` | `/api/subscription-plans` | ✅ **DYNAMIC** |
| **Patient Subscriptions** | `/admin/accounting/patient-subscriptions` | `/api/patient-subscriptions` | ✅ **DYNAMIC** |
| **Master Data** | `/admin/master-data/*` | `/api/locations/*` | ✅ **DYNAMIC** |

---

## **🏗️ EXISTING API INFRASTRUCTURE**

### **✅ AVAILABLE STATS APIs**

| **API Endpoint** | **Service** | **Data Provided** |
|------------------|-------------|-------------------|
| `/api/drivers/stats` | `DriverService.getDriverStats()` | Driver statistics |
| `/api/sos-requests/stats` | `SOSRequestService.getStats()` | SOS request statistics |
| `/api/hospitals/stats` | `HospitalService.getStats()` | Hospital statistics |
| `/api/patients/stats` | `PatientService.getStats()` | Patient statistics |
| `/api/transport-companies/stats` | `TransportCompanyService.getStats()` | Transport statistics |
| `/api/subscription-plans/stats` | `SubscriptionPlanService.getStats()` | Subscription statistics |
| `/api/billing-history/stats` | `BillingHistoryService.getStats()` | Billing statistics |

### **🔧 EXISTING SERVICES**

| **Service** | **File** | **Capabilities** |
|-------------|----------|------------------|
| **DriverService** | `src/services/driverService.ts` | CRUD + Stats |
| **SOSRequestService** | `src/services/sosRequestService.ts` | CRUD + Stats |
| **HospitalService** | `src/services/hospitalService.ts` | CRUD + Stats |
| **PatientService** | `src/services/patientService.ts` | CRUD + Stats |
| **TransportCompanyService** | `src/services/transportCompanyService.ts` | CRUD + Stats |
| **UserService** | `src/services/userService.ts` | User management |

---

## **🚀 CONVERSION STRATEGY**

### **Phase 1: Critical Dashboard Stats (Week 1)**

#### **1.1 Create Dashboard Stats APIs**
- **Admin Dashboard Stats API**: `/api/admin/dashboard/stats`
- **ERT Dashboard Stats API**: `/api/erteam/dashboard/stats`  
- **Transport Dashboard Stats API**: `/api/transport/dashboard/stats`

#### **1.2 Convert High-Priority Dashboards**
1. **Admin Dashboard** (`/admin/dashboard`)
   - Replace hardcoded stats with API calls
   - Add real system alerts from database
   - Implement user count, hospital count, active emergencies

2. **ERT Dashboard** (`/erteam/dashboard`)
   - Replace mock SOS cases with real data
   - Add real ambulance availability
   - Implement real-time emergency metrics

3. **Transport Dashboard** (`/transport/dashboard`)
   - Replace mock driver data with real queries
   - Add real assignment statistics
   - Implement performance metrics

### **Phase 2: Reports and Analytics (Week 2)**

#### **2.1 Create Analytics APIs**
- **Reports Analytics API**: `/api/reports/analytics`
- **Transport Reports API**: `/api/transport/reports/analytics`

#### **2.2 Convert Report Pages**
1. **Main Reports Page** (`/reports`)
   - Replace mock chart data with real analytics
   - Implement date range filtering
   - Add export functionality

2. **Transport Reports** (`/transport/reports`)
   - Replace mock performance data
   - Add real revenue analytics
   - Implement driver performance metrics

### **Phase 3: Management Pages (Week 3)**

#### **3.1 Convert SOS Management**
1. **SOS Listing** (`/sos`)
   - Replace `mockSOSCases` with `/api/sos-requests`
   - Add real-time status updates
   - Implement filtering and search

2. **SOS Details** (`/sos/[id]`)
   - Replace mock lookup with API call
   - Add real case history
   - Implement status updates

#### **3.2 Convert Driver Management**
1. **Driver Listing** (`/drivers`)
   - Replace `mockDrivers` with `/api/drivers`
   - Add real availability status
   - Implement performance metrics

### **Phase 4: Real-time Updates (Week 4)**

#### **4.1 Implement Real-time Features**
- **WebSocket connections** for live dashboard updates
- **Polling mechanisms** for critical metrics
- **Push notifications** for emergency alerts

---

## **📊 MOCK DATA ANALYSIS**

### **Current Mock Data Sources**

| **Mock Data** | **File** | **Usage Count** | **Replacement API** |
|---------------|----------|-----------------|---------------------|
| `mockSOSCases` | `src/lib/mock-data.ts` | 8+ pages | `/api/sos-requests` |
| `mockDrivers` | `src/lib/mock-data.ts` | 6+ pages | `/api/drivers` |
| `mockPatients` | `src/lib/mock-data.ts` | 5+ pages | `/api/patients` |
| `mockHospitals` | `src/lib/mock-data.ts` | 4+ pages | `/api/hospitals` |
| `mockAmbulances` | `src/lib/mock-data.ts` | 4+ pages | **NEEDS API** |
| `mockDashboardStats` | `src/lib/mock-data.ts` | 3+ pages | **NEEDS API** |
| `mockTransportCompanies` | `src/lib/mock-data.ts` | 2+ pages | `/api/transport-companies` |

### **🔴 MISSING APIs NEEDED**

| **Missing API** | **Purpose** | **Priority** |
|-----------------|-------------|--------------|
| `/api/ambulances` | Ambulance management and status | **HIGH** |
| `/api/admin/dashboard/stats` | Admin dashboard statistics | **HIGH** |
| `/api/erteam/dashboard/stats` | ERT dashboard statistics | **HIGH** |
| `/api/transport/dashboard/stats` | Transport dashboard statistics | **HIGH** |
| `/api/reports/analytics` | Report page analytics | **HIGH** |
| `/api/system/alerts` | System alerts and notifications | **MEDIUM** |

---

## **🎯 SUCCESS METRICS**

### **Performance Goals**
- **Dashboard Load Time**: < 2 seconds
- **API Response Time**: < 500ms
- **Real-time Updates**: < 1 second delay
- **Data Accuracy**: 100% consistent with database

### **User Experience Goals**
- **No Loading Spinners**: Use skeleton loading states
- **Smooth Transitions**: No jarring data changes
- **Error Handling**: Graceful fallbacks for API failures
- **Offline Support**: Cache critical dashboard data

---

## **🔧 TECHNICAL REQUIREMENTS**

### **API Standards**
- **Consistent Response Format**: `{ data, success, error }`
- **Error Handling**: Proper HTTP status codes
- **Caching**: Implement Redis/memory caching for stats
- **Rate Limiting**: Protect against excessive requests

### **Frontend Standards**
- **Loading States**: Skeleton UI for all data loading
- **Error Boundaries**: Catch and handle API failures
- **Data Validation**: Validate all API responses
- **Type Safety**: Full TypeScript coverage

---

**🎉 This plan will transform the Emergency Response System from a static demo into a fully dynamic, real-time emergency management platform!**
