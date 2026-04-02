from django.core.mail import EmailMessage
import os

class util:
    # helper to send emails - used for OTP and password resets
    @staticmethod
    def send_email(data):
        email = EmailMessage(
            subject=data['subject'],
            body=data['body'],
            from_email=os.environ.get('EMAIL_FROM'),
            to=[data['to_email']],
        )
        email.send()
