import threading
import logging
import resend
import os

logger = logging.getLogger(__name__)

resend.api_key = os.environ.get("RESEND_API_KEY")

class Util:
    @staticmethod
    def send_verification_email_async(user_email, username, status, rejection_reason=None):
        thread = threading.Thread(
            target=Util.send_verification_email,
            args=(user_email, username, status, rejection_reason)
        )
        thread.daemon = True
        thread.start()

    @staticmethod
    def send_verification_email(user_email, username, status, rejection_reason=None):
        try:
            if status == 'approved':
                subject = "CareNest - Your Account is Verified!"
                body = f"""
Dear {username},

We're pleased to inform you that your documents have been successfully verified.

Your caregiver account is now active. You can begin responding to care requests through your dashboard.

Thank you for choosing CareNest.

Kind regards,
CareNest Team

(This is an automated email. Please do not reply.)
                """
            elif status == 'rejected':
                subject = "CareNest - Document Verification Update"
                body = f"""
Dear {username},

We have reviewed the documents you submitted for verification.

At this time, they could not be verified for the following reason:

{rejection_reason if rejection_reason else "The submitted documents did not meet verification requirements."}

You may log in to your dashboard to review the feedback and re-upload corrected documents.

Kind regards,
CareNest Team

(This is an automated email. Please do not reply.)
                """
            else:
                logger.info(f"Skipping email for status: {status}")
                return

            resend.Emails.send({
                "from": "CareNest <noreply@carenestapp.me>",
                "to": [user_email],
                "subject": subject,
                "text": body.strip()
            })
            logger.info(f"✓ Verification email sent to {user_email} - Status: {status}")

        except Exception as e:
            logger.error(f"✗ Failed to send verification email to {user_email}: {str(e)}")
            print(f"Email Error: Failed to send to {user_email} - {str(e)}")