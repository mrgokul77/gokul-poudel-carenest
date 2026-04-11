from django.test import TestCase
from unittest.mock import patch
from accounts.models import User


class RegistrationTests(TestCase):

    # TC002 - Empty Registration
    def test_empty_registration(self):
        response = self.client.post('/api/user/register/', {})
        self.assertEqual(response.status_code, 400)

    # TC003 - Invalid Email Format
    @patch('accounts.utils.Util.send_email')
    def test_invalid_email_format(self, mock_email):
        response = self.client.post('/api/user/register/', {
            'email': 'ramlalnepal',
            'username': 'ramlal123',
            'password': 'Nepal@2081',
            'role': 'careseeker'
        })
        self.assertEqual(response.status_code, 400)

    # TC004 - Duplicate Email Registration
    @patch('accounts.utils.Util.send_email')
    def test_duplicate_email_registration(self, mock_email):
        self.client.post('/api/user/register/', {
            'email': 'sita.karki@gmail.com',
            'username': 'sitakarki',
            'password': 'Sita@1234',
            'role': 'careseeker'
        })
        response = self.client.post('/api/user/register/', {
            'email': 'sita.karki@gmail.com',
            'username': 'sitakarki2',
            'password': 'Sita@5678',
            'role': 'caregiver'
        })
        self.assertEqual(response.status_code, 400)

    # TC006 - Invalid OTP
    @patch('accounts.utils.Util.send_email')
    def test_invalid_otp(self, mock_email):
        self.client.post('/api/user/register/', {
            'email': 'hari.thapa@gmail.com',
            'username': 'harithapa',
            'password': 'Hari@2081',
            'role': 'careseeker'
        })
        response = self.client.post('/api/user/verify-otp/', {
            'email': 'hari.thapa@gmail.com',
            'otp': '123456'
        })
        self.assertEqual(response.status_code, 400)


class LoginTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email='bishnu.pradhan@gmail.com',
            username='bishnupradhan',
            password='Bishnu@2081',
            role='careseeker'
        )
        self.user.is_verified = True
        self.user.save()

    # TC008 - Login Invalid Credentials
    def test_login_invalid_credentials(self):
        response = self.client.post('/api/user/login/', {
            'email': 'bishnu.pradhan@gmail.com',
            'password': 'wrongpassword99'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 404)

