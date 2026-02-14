from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions


def validate_image_file(file):
    """
    Validate image file type and size
    Allowed types: JPEG, PNG, WebP
    Max size: 5MB
    """
    if not file:
        raise ValidationError("Image file is required")
    
    # Check file size (5MB = 5 * 1024 * 1024 bytes)
    max_size = 5 * 1024 * 1024
    if file.size > max_size:
        raise ValidationError(
            f"Image file size must be less than 5MB. Current size: {file.size / (1024 * 1024):.2f}MB"
        )
    
    # Check file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    file_name = file.name.lower()
    
    if not any(file_name.endswith(ext) for ext in allowed_extensions):
        raise ValidationError(
            f"Invalid file type. Allowed types: JPEG, PNG, WebP. Got: {file_name}"
        )
    
    # Validate that it's actually an image
    try:
        # This will raise an exception if the file is not a valid image
        get_image_dimensions(file)
    except Exception:
        raise ValidationError("File is not a valid image")
    
    return file


def validate_document_file(file):
    """
    Validate document file type and size
    Allowed types: PDF, JPEG, PNG
    Max size: 5MB
    """
    if not file:
        raise ValidationError("Document file is required")
    
    # Check file size (5MB = 5 * 1024 * 1024 bytes)
    max_size = 5 * 1024 * 1024
    if file.size > max_size:
        raise ValidationError(
            f"File size must be less than 5MB. Current size: {file.size / (1024 * 1024):.2f}MB"
        )
    
    # Check file extension
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
    file_name = file.name.lower()
    
    if not any(file_name.endswith(ext) for ext in allowed_extensions):
        raise ValidationError(
            f"Invalid file type. Allowed types: PDF, JPEG, PNG. Got: {file_name}"
        )
    
    # For image files, validate that it's actually an image
    if not file_name.endswith('.pdf'):
        try:
            get_image_dimensions(file)
        except Exception:
            raise ValidationError("File is not a valid image")
    
    return file
