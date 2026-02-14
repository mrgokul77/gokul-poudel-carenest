import threading
import logging

logger = logging.getLogger(__name__)


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
        from accounts.utils import util
        
        try:
            if status == 'approved':
                subject = "CareNest - Your Account is Verified!"
                body = f"""
Dear {username},

We’re pleased to inform you that your documents have been successfully verified.

Your caregiver account is now active. You can begin completing your profile and responding to care requests through your dashboard.

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

If you require assistance, please contact our support team.

Kind regards,  
CareNest Team

(This is an automated email. Please do not reply.)
                """
            else:
                # Don't send email for pending status
                logger.info(f"Skipping email for status: {status}")
                return
            
            # Use the same util pattern as OTP emails
            data = {
                'subject': subject,
                'body': body.strip(),
                'to_email': user_email
            }
            
            util.send_email(data)
            logger.info(f"✓ Verification email sent to {user_email} - Status: {status}")
            
        except Exception as e:
            # Log the error but don't raise it (fail-safe)
            logger.error(f"✗ Failed to send verification email to {user_email}: {str(e)}")
            # In production, you might want to add this to a retry queue
            print(f"Email Error: Failed to send to {user_email} - {str(e)}")
