import io
import os
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PIXELS = 40_000_000       # refuse decompression bombs
PHOTO_MAX_SIDE = 800          # stored photos are at most 800×800
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP'}


def validate_image_extension(value):
    """Validate image file extension."""
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    if ext not in valid_extensions:
        raise ValidationError(f'Unsupported file extension. Use: {", ".join(valid_extensions)}')


def process_profile_photo(file):
    """Check an uploaded photo by its real content (not its name or the
    client's Content-Type), then re-encode it as a square-bounded JPEG.
    Re-encoding drops EXIF (including GPS location) and any payload that
    was smuggled inside the original file."""
    if file.size > settings.MAX_UPLOAD_SIZE:
        raise ValidationError(f'Photo must be smaller than {settings.MAX_UPLOAD_SIZE // (1024 * 1024)} MB.')
    try:
        file.seek(0)
        probe = Image.open(file)
        if probe.format not in ALLOWED_FORMATS:
            raise ValidationError('Photo must be a JPEG, PNG or WebP image.')
        if probe.width * probe.height > MAX_PIXELS:
            raise ValidationError('Photo dimensions are too large.')
        probe.verify()
        file.seek(0)
        image = Image.open(file)
        image.load()
    except ValidationError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError):
        raise ValidationError('That file is not a valid image.')

    image = ImageOps.exif_transpose(image)
    if image.mode in ('RGBA', 'LA', 'P'):
        image = image.convert('RGBA')
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[-1])
        image = background
    else:
        image = image.convert('RGB')
    image.thumbnail((PHOTO_MAX_SIDE, PHOTO_MAX_SIDE), Image.LANCZOS)

    out = io.BytesIO()
    image.save(out, format='JPEG', quality=85, optimize=True, progressive=True)
    return ContentFile(out.getvalue(), name=f'{uuid.uuid4().hex}.jpg')
