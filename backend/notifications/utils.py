import os
import requests


def send_push_notification(token, title, body, data=None):
    """Send a push notification through Expo Push or Firebase Cloud Messaging."""
    if not token:
        return False

    payload = data or {}

    try:
        if token.startswith(("ExponentPushToken[", "ExpoPushToken[")):
            response = requests.post(
                "https://exp.host/--/api/v2/push/send",
                json={
                    "to": token,
                    "title": title,
                    "body": body,
                    "data": payload,
                    "sound": "default",
                },
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=10,
            )
            return response.status_code == 200

        server_key = os.getenv("FCM_SERVER_KEY")
        if not server_key:
            return False

        response = requests.post(
            "https://fcm.googleapis.com/fcm/send",
            json={
                "to": token,
                "notification": {
                    "title": title,
                    "body": body,
                    "sound": "default",
                },
                "data": payload,
                "priority": "high",
            },
            headers={
                "Authorization": f"key {server_key}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        return response.status_code == 200
    except requests.RequestException:
        return False
