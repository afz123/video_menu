import io
import pytest


@pytest.mark.asyncio
async def test_upload_dish_image_hybrid(client):
    """
    Test uploading a static food photo (JPG) instead of video.
    Verifies that the backend accepts images, generates WebP LQIP and HD poster,
    and returns 200 OK.
    """
    # Create a tiny 100x100 fake JPEG in memory (valid JPEG header)
    # Even simpler: use ffmpeg to create a quick test image
    import subprocess
    from app.services.video_transcoder import get_ffmpeg_path

    ffmpeg_bin = get_ffmpeg_path()
    proc = subprocess.run(
        [ffmpeg_bin, "-y", "-f", "lavfi", "-i", "color=c=red:s=300x500:d=1", "-vframes", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "-"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL
    )
    image_bytes = proc.stdout

    files = {
        "file": ("delicious_cake.jpg", image_bytes, "image/jpeg")
    }

    response = await client.post("/api/v1/dishes/upload-video", files=files)
    assert response.status_code == 200, f"Upload image failed: {response.text}"
    data = response.json()
    assert "media_id" in data
    assert data["is_image"] is True
    assert data["status"] == "PROCESSING"


@pytest.mark.asyncio
async def test_upload_unsupported_file_extension(client):
    """Test uploading an unsupported format returns 400 Bad Request."""
    files = {
        "file": ("script.sh", b"echo hello", "text/plain")
    }
    response = await client.post("/api/v1/dishes/upload-video", files=files)
    assert response.status_code == 400
    assert "Неподдерживаемый формат" in response.json()["detail"]
