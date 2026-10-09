import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

SUBJECTS = {
    'verify': 'Your Together verification code',
    'reset': 'Reset your Together password',
}

INTROS = {
    'verify': 'Use this code to verify your Together alumni account:',
    'reset': 'Use this code to reset your Together password:',
}


def send_otp_email(user, code, purpose):
    """Email a one-time code. Failures are logged, never shown to the caller,
    so the API response can't reveal whether an address exists."""
    body = (
        f"{INTROS[purpose]}\n\n"
        f"    {code}\n\n"
        f"The code expires in {settings.OTP_TTL_MINUTES} minutes. "
        "If you didn't ask for it, you can ignore this email.\n\n"
        f"Together — Nautara Abiunnessa B.L. High School alumni\n{settings.FRONTEND_URL}\n"
    )
    try:
        send_mail(SUBJECTS[purpose], body, settings.DEFAULT_FROM_EMAIL, [user.email])
    except Exception:
        logger.exception('Could not send %s code to user %s', purpose, user.pk)


def send_status_email(profile, approved, note=''):
    """Tell an alumnus their profile was approved or needs changes."""
    if approved:
        subject = 'Welcome to Together: your profile is approved'
        body = (
            f"Hi {profile.full_name_en},\n\n"
            "The alumni committee has verified your profile. You now appear in the "
            "alumni directory and can see other members' contact links.\n\n"
            f"{settings.FRONTEND_URL}/directory\n"
        )
    else:
        subject = 'Your Together profile needs another look'
        body = (
            f"Hi {profile.full_name_en},\n\n"
            "The alumni committee couldn't verify your profile yet."
            + (f"\n\nNote from the committee: {note}" if note else '')
            + "\n\nYou can update your details and resubmit at any time:\n"
            f"{settings.FRONTEND_URL}/profile/edit\n"
        )
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [profile.user.email])
    except Exception:
        logger.exception('Could not send status email for profile %s', profile.pk)
