from supabase import create_client

# Get these from your Supabase Dashboard -> Project Settings -> API
SUPABASE_URL = "https://drdzcetroywhbhaasfdm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZHpjZXRyb3l3aGJoYWFzZmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzgxOTQsImV4cCI6MjA5MDgxNDE5NH0.uBjai9yFAOoWCdGKvpD2XCsn8d4QAfJS_3ziMVCWjDk"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Log in with the user you created
response = supabase.auth.sign_in_with_password({
    "email": "test@example.com",
    "password": "pass123"
})

# This is the "Bearer" string you need
print("\n--- COPY THE TOKEN BELOW ---")
print(response.session.access_token)
print("--- END TOKEN ---")