from django.core.mail import EmailMessage
from django.conf import settings

class util:
    @staticmethod
    def send_email(data):
        print(f"Attempting to send email to: {data['to_email']}")
        print(f"From: {settings.EMAIL_HOST_USER}")
        email = EmailMessage(
            subject=data['subject'],
            body=data['body'],
            from_email=settings.EMAIL_HOST_USER,
            to=[data['to_email']],
        )
        email.send()
        print("Email sent successfully")