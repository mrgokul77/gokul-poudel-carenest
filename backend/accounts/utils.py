import os
from django.core.mail import send_mail

class Util:
    @staticmethod
    def send_email(data):
        try:
            send_mail(
                subject=data['subject'],
                message=data['body'],
                from_email=os.environ.get('DEFAULT_FROM_EMAIL'),
                recipient_list=[data['to_email']],
                fail_silently=False,
            )
            print("✅ Email sent via Gmail SMTP")

        except Exception as e:
            print("Email failed:", str(e))