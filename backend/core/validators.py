from django.core.exceptions import ValidationError
from django.conf import settings


def validate_image_file(file):
    """Validate uploaded image file."""
    # Check file size
    max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 5 * 1024 * 1024)
    if file.size > max_size:
        raise ValidationError(f'File size must not exceed {max_size // (1024 * 1024)} MB.')
    
    # Check file type
    allowed_types = getattr(settings, 'ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp'])
    if hasattr(file, 'content_type') and file.content_type not in allowed_types:
        raise ValidationError(f'File type must be one of: {", ".join(allowed_types)}')
    
    return file


def validate_image_extension(value):
    """Validate image file extension."""
    import os
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    if ext not in valid_extensions:
        raise ValidationError(f'Unsupported file extension. Use: {", ".join(valid_extensions)}')
