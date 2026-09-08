import { supabase } from '@/lib/supabase'
import { createServerClient } from '@/lib/supabase/server'
import { summarisePresence, type DriverPresence } from '@/lib/driverPresence'
import { fetchPushReachability } from '@/lib/driverReachability'

/**
 * Reachability needs the SERVICE-ROLE client: device_tokens is server-only by
 * design (migrations/99_updates/push_device_tokens_lock_read.sql), and the
 * module-level `supabase` here is the anon-key client, which is refused. This
 * service is imported exclusively by route handlers under src/app/api/drivers —
 * never by a client component — so reaching for the privileged client is safe.
 * If that ever changes, this call has to move behind /api/drivers/reachability
 * like the ER Team list did, or the service key ships to the browser.
 */
const reachabilityClient = () => createServerClient()

/**
 * Nullable UNIQUE columns whose blank/whitespace values MUST be stored as NULL,
 * never ''. `aadhar_number` is optional but unique — Postgres treats NULLs as
 * distinct, so many drivers may have none, but a stored '' collides on the
 * second insert and falsely raises "Aadhar number already exists" even when the
 * admin left the field empty. Coerce blanks to null on every write.
 */
const NULLABLE_UNIQUE_FIELDS = ['aadhar_number'] as const

function nullifyBlankUniques<T extends object>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>
  for (const key of NULLABLE_UNIQUE_FIELDS) {
    if (typeof out[key] === 'string' && (out[key] as string).trim() === '') {
      out[key] = null
    }
  }
  return out as T
}

export interface Driver {
  user_id: string
  transport_company_id: string
  license_number: string
  aadhar_number?: string
  is_verified: boolean
  status: 'available' | 'assigned' | 'on_trip' | 'inactive'
  current_request_id?: string
  latitude?: number
  longitude?: number
  last_updated_at: string
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  address_line?: string
  // Joined data from users table
  user?: {
    id: string
    full_name: string
    email: string
    role: string
    created_at: string
  }
  // Joined transport company data
  transport_company?: {
    user_id: string
    company_name: string
    registration_number?: string
    is_verified: boolean
  }
  // Joined location data
  country?: { id: string; name: string }
  state?: { id: string; name: string }
  city?: { id: string; name: string }
  pincode?: { id: string; code: string }
  // Current SOS request data
  current_request?: {
    id: string
    status: string
    created_at: string
  }
}

export interface CreateDriverData {
  user_id: string
  transport_company_id: string
  license_number: string
  aadhar_number?: string
  is_verified?: boolean
  status: 'available' | 'assigned' | 'on_trip' | 'inactive'
  latitude?: number
  longitude?: number
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  address_line?: string
  created_by?: string // Optional - Transport company user who is creating this driver
  license_class?: string
  license_expiry?: string
  medical_cert_expiry?: string
  years_experience?: number
  special_certifications?: string
  languages_spoken?: string
  vehicle_assigned?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  preferred_shift?: 'morning' | 'afternoon' | 'night' | 'flexible'
  max_distance_km?: number
}

export interface UpdateDriverData {
  transport_company_id?: string
  license_number?: string
  aadhar_number?: string
  is_verified?: boolean
  status?: 'available' | 'assigned' | 'on_trip' | 'inactive'
  current_request_id?: string
  latitude?: number
  longitude?: number
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  address_line?: string
  license_class?: string
  license_expiry?: string
  medical_cert_expiry?: string
  years_experience?: number
  special_certifications?: string
  languages_spoken?: string
  vehicle_assigned?: string
  rating?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  preferred_shift?: 'morning' | 'afternoon' | 'night' | 'flexible'
  max_distance_km?: number
  is_online?: boolean
}

/**
 * What the driver list filters by. These are DUTY states, not `drivers.status`
 * values: the raw column cannot tell an on-duty driver from an unpageable one
 * (both sit on 'available'), which is the whole reason the four states exist.
 * See src/lib/driverPresence.ts.
 */
export type DriverDutyFilter = DriverPresence

export interface DriverFilters {
  search?: string
  status?: DriverDutyFilter
  transport_company_id?: string
  is_verified?: boolean
  country_id?: string
  state_id?: string
  city_id?: string
  limit?: number
  offset?: number
}

export class DriverService {
  static async getDrivers(filters: DriverFilters = {}) {
    try {
      let query = supabase
        .from('drivers')
        .select(`
          *,
          user:users!drivers_user_id_fkey(
            id,
            full_name,
            email,
            phone,
            role,
            created_at,
            first_name,
            last_name
          ),
          transport_company:transport_companies!drivers_transport_company_id_fkey(
            user_id,
            company_name,
            registration_number,
            is_verified
          ),
          country:countries(id, name),
          state:states(id, name),
          city:cities(id, name),
          pincode:pincodes(id, code)
        `, { count: 'exact' })

      // Apply filters
      if (filters.search) {
        query = query.or(`license_number.ilike.%${filters.search}%,aadhar_number.ilike.%${filters.search}%`)
      }

      // Duty-state filtering has to happen in the QUERY, not after the page is
      // fetched: the list is server-paginated, so filtering the 25 rows that
      // came back would silently drop matches from every other page.
      //
      // Three of the four states are pure column predicates. 'on_duty' and
      // 'needs_attention' split the same 'available' rows by reachability, which
      // lives in another table, so those two resolve the reachable set first and
      // filter on the ids. That set is one query over the on-duty fleet — 17
      // rows on live — not a per-row lookup.
      if (filters.status === 'on_trip') {
        query = query.or('status.in.(assigned,on_trip),current_request_id.not.is.null')
      } else if (filters.status === 'off_duty') {
        query = query
          .not('status', 'in', '(available,assigned,on_trip)')
          .is('current_request_id', null)
      } else if (filters.status === 'on_duty' || filters.status === 'needs_attention') {
        const { data: onDutyRows } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('status', 'available')
          .is('current_request_id', null)
        const onDutyIds = (onDutyRows || []).map((d: { user_id: string }) => d.user_id)
        const reachableSet = await fetchPushReachability(reachabilityClient(), onDutyIds)

        // A failed lookup makes every on-duty driver 'needs_attention' (reason
        // 'unchecked'), which is exactly what the badges will say — so the
        // filter agrees with them rather than returning an empty list.
        const wanted =
          reachableSet === null
            ? filters.status === 'needs_attention'
              ? onDutyIds
              : []
            : onDutyIds.filter((id) =>
                filters.status === 'on_duty' ? reachableSet.has(id) : !reachableSet.has(id),
              )

        // PostgREST turns an empty `.in()` into a syntax error, so short-circuit
        // on a genuinely empty match with a predicate that selects nothing.
        query = wanted.length > 0
          ? query.in('user_id', wanted)
          : query.eq('user_id', '00000000-0000-0000-0000-000000000000')
      }

      if (filters.transport_company_id) {
        query = query.eq('transport_company_id', filters.transport_company_id)
      }

      if (filters.is_verified !== undefined) {
        query = query.eq('is_verified', filters.is_verified)
      }

      if (filters.country_id) {
        query = query.eq('country_id', filters.country_id)
      }

      if (filters.state_id) {
        query = query.eq('state_id', filters.state_id)
      }

      if (filters.city_id) {
        query = query.eq('city_id', filters.city_id)
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      // Order by last updated
      query = query.order('last_updated_at', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching drivers:', error)
        throw new Error(error.message)
      }

      // Annotate each row with push reachability so the list badges match the
      // dashboard tiles. Only the drivers claiming to be on duty matter — for
      // anyone signed out the flag is irrelevant, and leaving it undefined keeps
      // the derivation from reading anything into it.
      //
      // On failure the flag goes null ("Needs Attention · could not check"),
      // never silently absent — an unchecked driver used to render as a
      // confident green "On duty".
      const rows = (data || []) as Driver[]
      const reachable = await fetchPushReachability(
        reachabilityClient(),
        rows.filter(d => d.status === 'available').map(d => d.user_id),
      )

      for (const d of rows) {
        if (d.status === 'available') {
          (d as Driver & { has_push_token?: boolean | null }).has_push_token =
            reachable ? reachable.has(d.user_id) : null
        }
      }

      return {
        drivers: rows,
        count: count || 0
      }
    } catch (error) {
      console.error('Error in getDrivers:', error)
      throw error
    }
  }

  // Get drivers for a specific transport company (for transport company users)
  static async getDriversForTransportCompany(transportCompanyUserId: string, filters: Omit<DriverFilters, 'transport_company_id'> = {}) {
    try {
      // First get the transport company ID from the user ID
      const { data: transportCompany, error: companyError } = await supabase
        .from('transport_companies')
        .select('user_id')
        .eq('user_id', transportCompanyUserId)
        .single()

      if (companyError) {
        console.error('Error fetching transport company:', companyError)
        throw new Error('Transport company not found')
      }

      // Now get drivers for this transport company
      return await this.getDrivers({
        ...filters,
        transport_company_id: transportCompany.user_id
      })
    } catch (error) {
      console.error('Error in getDriversForTransportCompany:', error)
      throw error
    }
  }

  static async getDriverById(id: string) {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users!drivers_user_id_fkey(
            id,
            full_name,
            email,
            phone,
            role,
            created_at,
            first_name,
            last_name
          ),
          transport_company:transport_companies!drivers_transport_company_id_fkey(
            user_id,
            company_name,
            registration_number,
            is_verified,
            address_line
          ),
          country:countries(id, name),
          state:states(id, name),
          city:cities(id, name),
          pincode:pincodes(id, code)
        `)
        .eq('user_id', id)
        .single()

      if (error) {
        console.error('Error fetching driver:', error)
        throw new Error(error.message)
      }

      // Annotate reachability so the detail page's badge agrees with the list's.
      // Without it the detail view showed "On Duty" for a driver the list had
      // just flagged as unpageable — the same record, two answers.
      const driver = data as Driver & { has_push_token?: boolean | null }
      if (driver.status === 'available') {
        const reachable = await fetchPushReachability(reachabilityClient(), [driver.user_id])
        driver.has_push_token = reachable ? reachable.has(driver.user_id) : null
      }

      return driver
    } catch (error) {
      console.error('Error in getDriverById:', error)
      throw error
    }
  }

  static async createDriver(data: CreateDriverData) {
    try {
      // Filter out fields that don't exist in the database
      const {
        created_by,
        license_class,
        license_expiry,
        medical_cert_expiry,
        years_experience,
        special_certifications,
        languages_spoken,
        vehicle_assigned,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        preferred_shift,
        ...validData
      } = data

      const { data: result, error } = await supabase
        .from('drivers')
        .insert([{
          ...nullifyBlankUniques(validData),
          last_updated_at: new Date().toISOString()
        }])
        .select(`
          *,
          user:users!drivers_user_id_fkey(
            id,
            full_name,
            email,
            role,
            created_at
          ),
          transport_company:transport_companies!drivers_transport_company_id_fkey(
            user_id,
            company_name,
            registration_number,
            is_verified
          ),
          country:countries(id, name),
          state:states(id, name),
          city:cities(id, name),
          pincode:pincodes(id, code)
        `)
        .single()

      if (error) {
        console.error('Error creating driver:', error)
        throw new Error(error.message)
      }

      return result as Driver
    } catch (error) {
      console.error('Error in createDriver:', error)
      throw error
    }
  }

  static async updateDriver(id: string, data: UpdateDriverData) {
    try {
      const { data: result, error } = await supabase
        .from('drivers')
        .update({
          ...nullifyBlankUniques(data),
          last_updated_at: new Date().toISOString()
        })
        .eq('user_id', id)
        .select(`
          *,
          user:users!drivers_user_id_fkey(
            id,
            full_name,
            email,
            role,
            created_at
          ),
          transport_company:transport_companies!drivers_transport_company_id_fkey(
            user_id,
            company_name,
            registration_number,
            is_verified
          ),
          country:countries(id, name),
          state:states(id, name),
          city:cities(id, name),
          pincode:pincodes(id, code)
        `)
        .single()

      if (error) {
        console.error('Error updating driver:', error)
        throw new Error(error.message)
      }

      return result as Driver
    } catch (error) {
      console.error('Error in updateDriver:', error)
      throw error
    }
  }

  static async deleteDriver(id: string) {
    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('user_id', id)

      if (error) {
        console.error('Error deleting driver:', error)
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deleteDriver:', error)
      throw error
    }
  }

  static async updateDriverLocation(id: string, latitude: number, longitude: number) {
    try {
      const { data: result, error } = await supabase
        .from('drivers')
        .update({
          latitude,
          longitude,
          last_updated_at: new Date().toISOString()
        })
        .eq('user_id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating driver location:', error)
        throw new Error(error.message)
      }

      return result
    } catch (error) {
      console.error('Error in updateDriverLocation:', error)
      throw error
    }
  }

  static async getDriverStats() {
    try {
      const [totalResult, availableResult, assignedResult, inactiveResult, verifiedResult, presenceRows] = await Promise.all([
        supabase.from('drivers').select('user_id', { count: 'exact', head: true }),
        supabase.from('drivers').select('user_id', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('drivers').select('user_id', { count: 'exact', head: true }).eq('status', 'assigned'),
        supabase.from('drivers').select('user_id', { count: 'exact', head: true }).eq('status', 'inactive'),
        supabase.from('drivers').select('user_id', { count: 'exact', head: true }).eq('is_verified', true),
        // `available` is a duty flag the driver sets once; presence additionally
        // requires that dispatch can still reach the driver. The two diverge as
        // soon as someone signs out on another device, which is why the fleet can
        // show 17 "available" drivers and six of them unpageable.
        supabase.from('drivers').select('user_id, status, last_updated_at, current_request_id')
      ])

      type PresenceRow = {
        user_id: string
        status: string
        last_updated_at?: string
        current_request_id?: string
      }
      const rows: PresenceRow[] = presenceRows.data || []

      // Push reachability for the drivers who claim to be on duty. Without it
      // live GPS is the only signal, and it comes from a foreground-only
      // location watcher — so it reads 0 for the entire fleet as soon as drivers
      // pocket their phones. See src/lib/driverPresence.ts.
      const tokenUserIds = await fetchPushReachability(
        reachabilityClient(),
        rows.filter(d => d.status === 'available').map(d => d.user_id),
      )

      const presence = summarisePresence(
        rows.map((d) => ({
          status: d.status,
          lastUpdatedAt: d.last_updated_at,
          currentRequestId: d.current_request_id,
          // null on a failed lookup, which surfaces as 'Needs Attention' rather
          // than padding the "On Duty Now" tile with drivers nobody has checked.
          hasPushToken: tokenUserIds ? tokenUserIds.has(d.user_id) : null,
        }))
      )

      return {
        total: totalResult.count || 0,
        // Raw column counts, kept for the CSV/debug view only. `available` in
        // particular is NOT a duty state — it is the driver's own flag, and it
        // survives a force-quit, so 17 "available" drivers included 5 nobody
        // could page. Screens read the four states below instead.
        available: availableResult.count || 0,
        assigned: assignedResult.count || 0,
        inactive: inactiveResult.count || 0,
        verified: verifiedResult.count || 0,
        // The four duty states, plus live GPS as a detail of them and the
        // Needs Attention breakdown. See src/lib/driverPresence.ts.
        //
        // on_trip comes from the presence derivation, not from
        // `status='on_trip'`: a driver holding a live SOS may still sit on
        // 'assigned', which is why the list said "On Trip 0" while the dashboard
        // said 1 for the same fleet.
        on_trip: presence.on_trip,
        on_duty: presence.on_duty,
        needs_attention: presence.needs_attention,
        off_duty: presence.off_duty,
        dispatchable: presence.dispatchable,
        live_gps: presence.liveGps,
        no_device: presence.noDevice,
        unchecked: presence.unchecked
      }
    } catch (error) {
      console.error('Error in getDriverStats:', error)
      throw error
    }
  }



  // Get drivers for a specific transport company (since created_by column doesn't exist)
  static async getDriversCreatedBy(createdByUserId: string, filters: DriverFilters = {}) {
    try {
      // Since created_by column doesn't exist, we'll get drivers by transport_company_id
      // First, check if the user is a transport company
      const { data: transportCompany } = await supabase
        .from('transport_companies')
        .select('user_id')
        .eq('user_id', createdByUserId)
        .single()

      if (!transportCompany) {
        return { drivers: [], count: 0 }
      }

      let query = supabase
        .from('drivers')
        .select(`
          *,
          user:users!drivers_user_id_fkey(
            id,
            full_name,
            email,
            role,
            created_at,
            phone,
            first_name,
            last_name
          ),
          transport_company:transport_companies!drivers_transport_company_id_fkey(
            user_id,
            company_name,
            registration_number,
            is_verified
          ),
          country:countries(id, name),
          state:states(id, name),
          city:cities(id, name),
          pincode:pincodes(id, code)
        `)
        .eq('transport_company_id', transportCompany.user_id)

      // Apply filters
      if (filters.search) {
        query = query.or(`license_number.ilike.%${filters.search}%,aadhar_number.ilike.%${filters.search}%`)
      }

      // Duty-state filtering has to happen in the QUERY, not after the page is
      // fetched: the list is server-paginated, so filtering the 25 rows that
      // came back would silently drop matches from every other page.
      //
      // Three of the four states are pure column predicates. 'on_duty' and
      // 'needs_attention' split the same 'available' rows by reachability, which
      // lives in another table, so those two resolve the reachable set first and
      // filter on the ids. That set is one query over the on-duty fleet — 17
      // rows on live — not a per-row lookup.
      if (filters.status === 'on_trip') {
        query = query.or('status.in.(assigned,on_trip),current_request_id.not.is.null')
      } else if (filters.status === 'off_duty') {
        query = query
          .not('status', 'in', '(available,assigned,on_trip)')
          .is('current_request_id', null)
      } else if (filters.status === 'on_duty' || filters.status === 'needs_attention') {
        const { data: onDutyRows } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('status', 'available')
          .is('current_request_id', null)
        const onDutyIds = (onDutyRows || []).map((d: { user_id: string }) => d.user_id)
        const reachableSet = await fetchPushReachability(reachabilityClient(), onDutyIds)

        // A failed lookup makes every on-duty driver 'needs_attention' (reason
        // 'unchecked'), which is exactly what the badges will say — so the
        // filter agrees with them rather than returning an empty list.
        const wanted =
          reachableSet === null
            ? filters.status === 'needs_attention'
              ? onDutyIds
              : []
            : onDutyIds.filter((id) =>
                filters.status === 'on_duty' ? reachableSet.has(id) : !reachableSet.has(id),
              )

        // PostgREST turns an empty `.in()` into a syntax error, so short-circuit
        // on a genuinely empty match with a predicate that selects nothing.
        query = wanted.length > 0
          ? query.in('user_id', wanted)
          : query.eq('user_id', '00000000-0000-0000-0000-000000000000')
      }

      if (filters.is_verified !== undefined) {
        query = query.eq('is_verified', filters.is_verified)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching drivers created by user:', error)
        throw new Error(error.message)
      }

      return data as Driver[]
    } catch (error) {
      console.error('Error in getDriversCreatedBy:', error)
      throw error
    }
  }
}
