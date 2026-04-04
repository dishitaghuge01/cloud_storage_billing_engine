import razorpay
import json
from supabase import create_client, Client
from app.config import settings

# Initialize Clients
client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)

def sync_usage_to_razorpay():
    print("💳 Starting REAL Razorpay Billing Sync (INR)...")
    
    # 1. Fetch usage only for users who have data to bill
    response = supabase.table("user_usage").select("*").gt("total_storage_used_bytes", 0).execute()
    users_usage = response.data

    if not users_usage:
        print("ℹ️ No pending usage found in Supabase. Everything is up to date.")
        return

    for entry in users_usage:
        user_id = entry['user_id']
        bytes_used = entry['total_storage_used_bytes']
        
        # Calculate GB (we bill minimum 1GB for any usage)
        gb_used = max(1, round(bytes_used / (1024**3)))
        unit_price_paisa = 500  # ₹5 per GB
        total_amount_paisa = gb_used * unit_price_paisa

        print(f"📊 Processing User {user_id}: {gb_used}GB usage detected.")

        try:
            # 2. THE ACTUAL RAZORPAY CHARGE
            # We attach an 'Add-on' to your specific test subscription
            addon = client.subscription.createAddon(settings.razorpay_test_sub_id, {
                "item": {
                    "name": f"Cloud Storage Overage ({gb_used} GB)",
                    "amount": total_amount_paisa,
                    "currency": "INR"
                }
            })
            
            print(f"✅ Razorpay Add-on Created! ID: {addon['id']} | Amount: ₹{total_amount_paisa/100}")

            # 3. RESET SUPABASE
            # Only reset if the Razorpay call succeeded
            supabase.table("user_usage").update({"total_storage_used_bytes": 0}).eq("user_id", user_id).execute()
            print(f"🧹 Supabase usage reset to 0 for {user_id}")

        except Exception as e:
            print(f"❌ FAILED to sync with Razorpay for {user_id}: {e}")

    print("🏁 Sync Process Finished.")

if __name__ == "__main__":
    sync_usage_to_razorpay()