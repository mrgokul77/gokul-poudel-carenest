FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD python manage.py collectstatic --noinput && python manage.py migrate && python manage.py shell -c "from accounts.models import User; User.objects.filter(email='carenest.noreply@gmail.com').exists() or User.objects.create_superuser('carenest.noreply@gmail.com', 'carenest.noreply@gmail.com', 'Admin@1234')" && daphne -b 0.0.0.0 -p $PORT backend.asgi:application