from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
import stripe

from app import models
from app.core.stripe_service import create_checkout_session, verify_webhook_signature
from app.dependencies import get_current_user, get_db

router = APIRouter()


class CheckoutRequest(BaseModel):
    plan: str  # "pro" or "pro_byok"


class CheckoutResponse(BaseModel):
    checkout_url: str


@router.post("/create-checkout-session", response_model=CheckoutResponse)
def create_stripe_checkout(
    body: CheckoutRequest,
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a Stripe Checkout session for the specified plan.
    Requires authentication.
    """
    # SERVER LOGGING: Debug authentication
    auth_header = request.headers.get("Authorization", "(missing)")
    print(f"\n=== STRIPE CHECKOUT SESSION DEBUG ===")
    print(f"Authorization header: {auth_header[:50] if len(auth_header) > 50 else auth_header}...")
    print(f"Authenticated user: {current_user.email} (ID: {current_user.id})")
    print(f"Requested plan: {body.plan}")
    print(f"===================================\n")

    if body.plan not in ("pro", "pro_byok"):
        raise HTTPException(status_code=400, detail="Invalid plan. Must be 'pro' or 'pro_byok'")

    # Build success/cancel URLs (adjust these based on your frontend routes)
    success_url = "http://localhost:3000/settings?payment=success"
    cancel_url = "http://localhost:3000/pricing?payment=canceled"

    try:
        checkout_url = create_checkout_session(
            user_email=current_user.email,
            plan=body.plan,
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return CheckoutResponse(checkout_url=checkout_url)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Stripe webhook endpoint to handle subscription events.
    No JWT authentication - Stripe calls this directly.
    """
    payload = await request.body()
    signature = request.headers.get("Stripe-Signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    try:
        event = verify_webhook_signature(payload, signature)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

    event_type = event["type"]
    event_data = event["data"]["object"]

    # Handle checkout.session.completed - user successfully subscribed
    if event_type == "checkout.session.completed":
        user_email = event_data.get("metadata", {}).get("user_email")
        plan = event_data.get("metadata", {}).get("plan")

        if user_email and plan:
            user = db.query(models.User).filter(models.User.email == user_email).first()
            if user:
                user.plan = plan
                db.commit()
                print(f"✓ User {user_email} upgraded to {plan}")

    # Handle customer.subscription.updated - subscription status changed
    elif event_type == "customer.subscription.updated":
        subscription_status = event_data.get("status")
        customer_email = event_data.get("customer_email")

        if customer_email:
            user = db.query(models.User).filter(models.User.email == customer_email).first()
            if user:
                # If subscription becomes inactive, downgrade to free
                if subscription_status in ("past_due", "canceled", "unpaid"):
                    user.plan = "free"
                    user.ai_api_key = None
                    db.commit()
                    print(f"✓ User {customer_email} downgraded to free (status: {subscription_status})")

    # Handle customer.subscription.deleted - subscription canceled
    elif event_type == "customer.subscription.deleted":
        customer_email = event_data.get("customer_email")

        if customer_email:
            user = db.query(models.User).filter(models.User.email == customer_email).first()
            if user:
                user.plan = "free"
                user.ai_api_key = None
                db.commit()
                print(f"✓ User {customer_email} subscription deleted, downgraded to free")

    return {"status": "success", "event_type": event_type}
