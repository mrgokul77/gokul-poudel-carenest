from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions
from backend.error_messages import ErrorMessages


def validate_image_file(file):
    """
    Validate image file type and size
    Allowed types: JPEG, PNG, WebP
    Max size: 5MB
    """
    if not file:
        raise ValidationError(ErrorMessages.FILE_REQUIRED)
    
    # Check file size (5MB = 5 * 1024 * 1024 bytes)
    max_size = 5 * 1024 * 1024
    try:
        if file.size > max_size:
            raise ValidationError(ErrorMessages.DOCUMENT_TOO_LARGE)
    except FileNotFoundError:
        # File no longer exists on disk (e.g. after Render restart)
        # Skip size validation — file path is already stored in DB
        return file
    
    # Check file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    file_name = file.name.lower()
    
    if not any(file_name.endswith(ext) for ext in allowed_extensions):
        raise ValidationError(ErrorMessages.DOCUMENT_INVALID_TYPE)
    
    # Validate that it's actually an image
    try:
        # This will raise an exception if the file is not a valid image
        get_image_dimensions(file)
    except Exception:
        raise ValidationError(ErrorMessages.DOCUMENT_INVALID_TYPE)
    
    return file


def validate_document_file(file):
    """
    Validate document file type and size
    Allowed types: PDF, JPEG, PNG
    Max size: 5MB
    """
    if not file:
        raise ValidationError(ErrorMessages.FILE_REQUIRED)
    
    # Check file size (5MB = 5 * 1024 * 1024 bytes)
    max_size = 5 * 1024 * 1024
    try:
        if file.size > max_size:
            raise ValidationError(ErrorMessages.DOCUMENT_TOO_LARGE)
    except FileNotFoundError:
        # File no longer exists on disk (e.g. after Render restart)
        # Skip size validation — file path is already stored in DB
        return file
    
    # Check file extension
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
    file_name = file.name.lower()
    
    if not any(file_name.endswith(ext) for ext in allowed_extensions):
        raise ValidationError(ErrorMessages.DOCUMENT_INVALID_TYPE)
    
    # For image files, validate that it's actually an image
    if not file_name.endswith('.pdf'):
        try:
            get_image_dimensions(file)
        except Exception:
            raise ValidationError(ErrorMessages.DOCUMENT_INVALID_TYPE)
    
    return file