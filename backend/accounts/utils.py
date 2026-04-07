import resend
import os

resend.api_key = os.environ.get("RESEND_API_KEY")

class Util:
    @staticmethod
    def send_email(data):
        try:
            resend.Emails.send({
                "from": "CareNest <noreply@carenestapp.me>",
                "to": [data['to_email']],
                "subject": data['subject'],
                "html": f"<p>{data['body']}</p>"
            })
            print("✅ Email sent via Resend")
        except Exception as e:
            print("Email failed:", str(e))