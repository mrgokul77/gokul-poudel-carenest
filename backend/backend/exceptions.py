from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from .error_messages import ErrorMessages


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return Response({"error": ErrorMessages.SERVER_ERROR}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        response.data = {"error": ErrorMessages.SESSION_EXPIRED}
        return response

    if response.status_code == status.HTTP_403_FORBIDDEN:
        existing = None
        if isinstance(response.data, dict):
            existing = response.data.get("error") or response.data.get("detail")
        if isinstance(existing, str) and existing.strip():
            response.data = {"error": existing}
        else:
            response.data = {"error": ErrorMessages.UNAUTHORIZED}
        return response

    if response.status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
        response.data = {"error": ErrorMessages.SERVER_ERROR}
        return response

    if isinstance(response.data, dict) and "detail" in response.data and len(response.data) == 1:
        detail = response.data.get("detail")
        if isinstance(detail, str):
            response.data = {"error": detail}

    return response
