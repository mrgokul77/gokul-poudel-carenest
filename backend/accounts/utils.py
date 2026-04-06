import resend
import os

class util:
    @staticmethod
    def send_email(data):
        resend.api_key = os.environ.get("RESEND_API_KEY")
        resend.Emails.send({
            "from": "CareNest <onboarding@resend.dev>",
            "to": [data['to_email']],
            "subject": data['subject'],
            "text": data['body'],
        })