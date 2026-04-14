from django.test import TestCase
from accounts.models import User
from django.utils.timezone import now
from datetime import timedelta


class BookingTests(TestCase):

    def setUp(self):
        self.careseeker = User.objects.create_user(
            email='maya.shrestha@gmail.com',
            username='mayashrestha',
            password='Maya@2081',
            role='careseeker'
        )
        self.careseeker.is_verified = True
        self.careseeker.save()

        self.caregiver = User.objects.create_user(
            email='krishna.tamang@gmail.com',
            username='krishnatamang',
            password='Krishna@2081',
            role='caregiver'
        )
        self.caregiver.is_verified = True
        self.caregiver.save()

        login = self.client.post('/api/user/login/', {
            'email': 'maya.shrestha@gmail.com',
            'password': 'Maya@2081'
        }, content_type='application/json')
        self.token = login.data['token']

        caregiver_login = self.client.post('/api/user/login/', {
            'email': 'krishna.tamang@gmail.com',
            'password': 'Krishna@2081'
        }, content_type='application/json')
        self.caregiver_token = caregiver_login.data['token']

    # TC023 - Empty Booking Form
    def test_empty_booking_form(self):
        # submitting empty booking form should return validation error
        response = self.client.post(
            '/api/bookings/',
            {},
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    # TC024 - Invalid Phone Number
    def test_invalid_phone_number(self):
        response = self.client.post('/api/bookings/', {
            'caregiver': self.caregiver.id,
            'service_types': ['Elderly Companionship'],
            'date': (now() + timedelta(days=1)).date().isoformat(),
            'start_time': '09:00',
            'duration_hours': 3,
            'service_address': 'Baneshwor, Kathmandu',
            'emergency_contact_phone': '98001',
            'person_name': 'Ram Bahadur',
            'person_age': 75,
        }, HTTP_AUTHORIZATION=f'Bearer {self.token}',
           content_type='application/json')
        self.assertEqual(response.status_code, 400)

    # TC026 - Duplicate Booking Request
    def test_duplicate_booking_request(self):
        booking_data = {
            'caregiver': self.caregiver.id,
            'service_types': ['Elderly Companionship'],
            'date': (now() + timedelta(days=2)).date().isoformat(),
            'start_time': '10:00',
            'duration_hours': 4,
            'service_address': 'Lalitpur, Patan',
            'emergency_contact_phone': '9841234567',
            'person_name': 'Shanti Devi',
            'person_age': 80,
        }
        self.client.post(
            '/api/bookings/',
            booking_data,
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
            content_type='application/json'
        )
        # sending same booking again to same caregiver
        response = self.client.post(
            '/api/bookings/',
            booking_data,
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)