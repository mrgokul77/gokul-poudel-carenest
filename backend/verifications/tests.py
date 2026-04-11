from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from accounts.models import User


class DocumentUploadTests(TestCase):
    def setUp(self):
        self.caregiver = User.objects.create_user(
            email='ram.bahadur@gmail.com',
            username='rambahadur',
            password='Ram@2081',
            role='caregiver'
        )
        self.caregiver.is_verified = True
        self.caregiver.save()

        login = self.client.post('/api/user/login/', {
            'email': 'ram.bahadur@gmail.com',
            'password': 'Ram@2081'
        }, content_type='application/json')
        self.token = login.data['token']

    # TC013 - Invalid File Type Upload
    def test_invalid_file_type_upload(self):
        fake_file = SimpleUploadedFile(
            "citizenship_front.pdf",
            b"thisisnotanimagefile",
            content_type="application/pdf"
        )
        response = self.client.post(
            '/api/verifications/upload-document/',
            {'citizenship_front': fake_file},
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
            format='multipart'
        )
        self.assertEqual(response.status_code, 400)

    # TC014 - File Size Too Large
    def test_file_size_too_large(self):
        large_file = SimpleUploadedFile(
            "citizenship_back.jpg",
            b"a" * (6 * 1024 * 1024),
            content_type="image/jpeg"
        )
        response = self.client.post(
            '/api/verifications/upload-document/',
            {'citizenship_front': large_file},
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
            format='multipart'
        )
        self.assertEqual(response.status_code, 400)