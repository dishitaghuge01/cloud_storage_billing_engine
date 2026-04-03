import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()

# Ensure these don't have trailing slashes that might cause mismatches
JWKS_URL = f"https://{settings.supabase_project_id}.supabase.co/auth/v1/.well-known/jwks.json"
ISSUER = f"https://{settings.supabase_project_id}.supabase.co/auth/v1"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    
    try:
        jwks_client = jwt.PyJWKClient(JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"], 
            # We relax these two slightly to ensure compatibility with Supabase's default tokens
            options={
                "verify_aud": False,  # Supabase uses 'authenticated', but sometimes it varies
                "verify_iss": True
            },
            issuer=ISSUER
        )

        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing 'sub' claim")
            
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        # CHECK YOUR TERMINAL FOR THIS PRINT
        print(f"DEBUG: JWT Verification Failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}", # Adding the error to detail for testing
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"DEBUG: Auth System Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal authentication error")