import os
from supabase import create_client


SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Log in with the user you created
response = supabase.auth.sign_in_with_password({
    "email": os.environ["TEST_EMAIL"],
    "password": os.environ["TEST_PASSWORD"]
})

print("\n--- COPY THE TOKEN BELOW ---")
print(response.session.access_token)
print("--- END TOKEN ---")