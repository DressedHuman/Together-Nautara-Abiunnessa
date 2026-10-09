<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Checks an uploaded photo by its real content (not its name or the client's
 * Content-Type) and re-encodes it as a JPEG of at most 800×800. Re-encoding
 * drops EXIF (including GPS location) and anything smuggled inside the file.
 */
class PhotoProcessor
{
    private const TYPES = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP];

    public static function store(UploadedFile $file): string
    {
        $fail = fn (string $msg) => throw ValidationException::withMessages(['photo' => $msg]);

        if (! $file->isValid()) {
            $fail('The photo could not be uploaded. Please try again.');
        }
        if ($file->getSize() > config('together.photos.max_bytes')) {
            $fail('Photo must be smaller than 5 MB.');
        }
        $bytes = file_get_contents($file->getRealPath());
        $info = @getimagesizefromstring($bytes);
        if (! $info || ! in_array($info[2], self::TYPES, true)) {
            $fail('Photo must be a JPEG, PNG or WebP image.');
        }
        [$width, $height] = $info;
        if ($width < 1 || $height < 1 || $width * $height > config('together.photos.max_pixels')) {
            $fail('Photo dimensions are too large.');
        }
        $image = @imagecreatefromstring($bytes);
        if (! $image) {
            $fail('That file is not a valid image.');
        }

        $image = static::orient($image, $bytes, $info[2]);
        $out = static::fit($image, config('together.photos.max_side'));

        ob_start();
        imageinterlace($out, true);
        imagejpeg($out, null, 85);
        $jpeg = ob_get_clean();
        imagedestroy($out);

        $path = 'alumni/photos/'.Str::random(32).'.jpg';
        Storage::disk('uploads')->put($path, $jpeg);

        return $path;
    }

    public static function delete(?string $path): void
    {
        if ($path) {
            Storage::disk('uploads')->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        return $path ? asset('uploads/'.$path) : null;
    }

    /** Apply the EXIF orientation of phone photos before the EXIF is dropped. */
    private static function orient(\GdImage $image, string $bytes, int $type): \GdImage
    {
        if ($type !== IMAGETYPE_JPEG || ! function_exists('exif_read_data')) {
            return $image;
        }
        $exif = @exif_read_data('data://image/jpeg;base64,'.base64_encode($bytes));
        $angle = match ((int) ($exif['Orientation'] ?? 1)) {
            3 => 180, 6 => -90, 8 => 90, default => 0,
        };

        return $angle ? (imagerotate($image, $angle, 0) ?: $image) : $image;
    }

    /** Scale down to fit max×max, flattening transparency onto white. */
    private static function fit(\GdImage $image, int $max): \GdImage
    {
        $w = imagesx($image);
        $h = imagesy($image);
        $scale = min(1, $max / max($w, $h));
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        $canvas = imagecreatetruecolor($nw, $nh);
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($image);

        return $canvas;
    }
}
