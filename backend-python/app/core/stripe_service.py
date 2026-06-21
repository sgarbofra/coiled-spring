"""
Stripe integration service for subscription management.
Handles checkout session creation and subscription lifecycle.
"""

import stripe
from typing import Optional

from app.config import settings

def _ensure_stripe_configured():
    """Lazy initialize Stripe API key on first use"""
    if not stripe.api_key:
        key = settings.stripe_secret_key
        print(f"[STRIPE] Initializing Stripe with key: {key[:15]}..." if key else "[STRIPE] WARNING: No Stripe key found in settings!")
        stripe.api_key = key
        print(f"[STRIPE] Stripe API key set successfully")

# Price definitions (monthly subscriptions in cents)
PLAN_PRICES = {
    "pro": 2900,  # $29.00/month
    "pro_byok": 1500,  # $15.00/month
}


def create_checkout_session(
    user_email: str,
    plan: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """
    Create a Stripe Checkout session for a subscription plan.

    Args:
        user_email: Email of the user subscribing
        plan: Plan type ("pro" or "pro_byok")
        success_url: URL to redirect after successful payment
        cancel_url: URL to redirect if user cancels

    Returns:
        Stripe Checkout session URL

    Raises:
        ValueError: If plan is not supported
        stripe.error.StripeError: If Stripe API fails
    """
    _ensure_stripe_configured()

    if plan not in PLAN_PRICES:
        raise ValueError(f"Invalid plan: {plan}. Supported plans: {list(PLAN_PRICES.keys())}")

    price_cents = PLAN_PRICES[plan]

    # Create Stripe Price dynamically (or use pre-created Price IDs in production)
    # For simplicity, creating inline price here
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=user_email,
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"Coiled Spring {plan.upper().replace('_', ' ')} Plan",
                        "description": get_plan_description(plan),
                    },
                    "unit_amount": price_cents,
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }
        ],
        metadata={
            "user_email": user_email,
            "plan": plan,
        },
        success_url=success_url,
        cancel_url=cancel_url,
        allow_promotion_codes=True,
        billing_address_collection="auto",
    )

    return session.url


def get_plan_description(plan: str) -> str:
    """Get human-readable plan description for Stripe checkout."""
    descriptions = {
        "pro": "Professional plan with 50 AI queries/day included",
        "pro_byok": "Professional plan - Bring Your Own Key (unlimited queries with your Anthropic API key)",
    }
    return descriptions.get(plan, f"{plan} subscription")


def verify_webhook_signature(payload: bytes, signature: str) -> Optional[dict]:
    """
    Verify Stripe webhook signature and parse event.

    Args:
        payload: Raw request body bytes
        signature: Stripe-Signature header value

    Returns:
        Parsed Stripe event dict, or None if verification fails

    Raises:
        stripe.error.SignatureVerificationError: If signature is invalid
    """
    webhook_secret = settings.stripe_webhook_secret
    if not webhook_secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET not configured")

    event = stripe.Webhook.construct_event(
        payload=payload,
        sig_header=signature,
        secret=webhook_secret,
    )

    return event
