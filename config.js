/* =====================================================================
   ECHO Study Space - Seats page configuration
   Edit ONLY this file to connect Supabase and set the geofence.
   ===================================================================== */
window.ECHO_CONFIG = {
  // From Supabase -> Project Settings -> API.
  // The anon key is public by design (safe in front-end code).
  // NEVER paste the service_role key here.
  SUPABASE_URL: "https://tvrnbhafofjfoeahyfdf.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cm5iaGFmb2ZqZm9lYWh5ZmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODIzNzcsImV4cCI6MjEwODY1ODM3N30.wfkT4s8VljGhhv8XQ65l-H9D5MfTjXcXXbZieOxccE4",

  // Study centre location (right-click the pin in Google Maps and copy the
  // two numbers). !! These are APPROXIMATE for YMCA Cross Rd, Kozhikode —
  // replace with the exact pin before going live. !!
  CENTER: { lat: 11.2536, lng: 75.7792 },
  CENTER_CONFIRMED: false,

  RADIUS_KM: 5,            // seats are visible only within this distance
  GEO_CACHE_MINUTES: 10,   // remember a successful check for this long
  TOTAL_SEATS: 75,         // used for demo data only
  REFRESH_SECONDS: 120,    // auto-refresh interval while the page is open

  WHATSAPP_NUMBER: "919778262436"
};
