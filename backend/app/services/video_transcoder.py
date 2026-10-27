import asyncio
import os
import subprocess
import logging
import tempfile
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger("video_menu.transcoder")

def get_ffmpeg_path() -> str:
    # First check imageio_ffmpeg
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.exists(exe):
            return exe
    except Exception:
        pass
    
    # Check ~/.local/bin/ffmpeg
    local_bin = os.path.expanduser("~/.local/bin/ffmpeg")
    if os.path.exists(local_bin):
        return local_bin
    
    return "ffmpeg"

class VideoTranscodeService:
    @classmethod
    async def _run_async_proc(cls, cmd, timeout=120):
        """
        Запуск FFmpeg с перенаправлением stderr во временный кольцевой файл
        для предотвращения переполнения буфера OS pipe (Deadlock Prevention).
        """
        with tempfile.TemporaryFile() as stderr_file:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=stderr_file
            )
            try:
                await asyncio.wait_for(proc.wait(), timeout=timeout)
                if proc.returncode != 0:
                    stderr_file.seek(0)
                    err_bytes = stderr_file.read()
                    err_msg = err_bytes.decode('utf-8', errors='ignore')[-4096:]
                    logger.error(f"FFmpeg error (code {proc.returncode}): {err_msg}")
                    raise RuntimeError(f"FFmpeg failed with exit code {proc.returncode}: {err_msg}")
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                    await proc.wait()
                except ProcessLookupError:
                    pass
                except Exception:
                    pass
                logger.error(f"FFmpeg process killed due to {timeout}s timeout: {' '.join(cmd)}")
                raise TimeoutError(f"Транскодирование видео превысило лимит времени ({timeout}s)")

    @classmethod
    async def process_video(cls, input_path: str, output_dir: Path, asset_id: int) -> dict:
        """
        Executes an asynchronous transcoding pipeline:
        1. poster_lqip.webp (320x568 blur LQIP ~8-12KB)
        2. poster_hd.webp (1080x1920 HD WebP ~60KB)
        3. mobile.mp4 (720x1280 H.264, FastStart, yuv420p, no audio, ~1.2MB)
        4. kiosk.mp4 (1080x1920 H.264 High profile, ~2.5MB)
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        ffmpeg_bin = get_ffmpeg_path()

        base_name = f"asset_{asset_id}"
        lqip_filename = f"{base_name}_lqip.webp"
        hd_filename = f"{base_name}_hd.webp"
        mobile_filename = f"{base_name}_mobile.mp4"
        kiosk_filename = f"{base_name}_kiosk.mp4"

        lqip_path = output_dir / lqip_filename
        hd_path = output_dir / hd_filename
        mobile_path = output_dir / mobile_filename
        kiosk_path = output_dir / kiosk_filename

        # Command 1: Micro-blurred LQIP poster (first frame at 0.1s)
        cmd_lqip = [
            ffmpeg_bin, "-y", "-ss", "00:00:00.100", "-i", input_path,
            "-vframes", "1",
            "-vf", "scale=320:568:force_original_aspect_ratio=increase,crop=320:568",
            "-q:v", "20",
            str(lqip_path)
        ]

        # Command 2: Crisp HD WebP poster (1080x1920)
        cmd_hd = [
            ffmpeg_bin, "-y", "-ss", "00:00:00.100", "-i", input_path,
            "-vframes", "1",
            "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-q:v", "85",
            str(hd_path)
        ]

        # Command 3: Mobile loop (720x1280, H.264, FastStart for zero-delay stream, yuv420p, preserve ASMR audio if present)
        cmd_mobile = [
            ffmpeg_bin, "-y", "-i", input_path,
            "-threads", "2",
            "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280",
            "-c:v", "libx264", "-profile:v", "high", "-preset", "fast",
            "-crf", "23", "-pix_fmt", "yuv420p",
            "-map", "0:v:0", "-map", "0:a?",
            "-c:a", "aac", "-b:a", "96k",
            "-movflags", "+faststart",
            str(mobile_path)
        ]

        # Command 4: Kiosk Full HD loop (1080x1920)
        cmd_kiosk = [
            ffmpeg_bin, "-y", "-i", input_path,
            "-threads", "2",
            "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-c:v", "libx264", "-profile:v", "high", "-preset", "medium",
            "-crf", "20", "-pix_fmt", "yuv420p",
            "-map", "0:v:0", "-map", "0:a?",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(kiosk_path)
        ]

        logger.info(f"Starting parallel transcoding for asset {asset_id} using {ffmpeg_bin}...")

        # Stage 1: Fast poster generation (LQIP + HD WebP frames in < 1s)
        logger.info(f"Asset {asset_id}: Stage 1 - generating WebP posters...")
        await asyncio.gather(
            cls._run_async_proc(cmd_lqip, timeout=30),
            cls._run_async_proc(cmd_hd, timeout=30),
        )

        # Stage 2: Mobile video encoding (FastStart H.264 720p)
        logger.info(f"Asset {asset_id}: Stage 2 - encoding mobile H.264 stream...")
        await cls._run_async_proc(cmd_mobile, timeout=120)

        # Stage 3: Kiosk video encoding (High profile 1080p)
        logger.info(f"Asset {asset_id}: Stage 3 - encoding kiosk 1080p stream...")
        await cls._run_async_proc(cmd_kiosk, timeout=120)

        # Get file size
        total_size = 0
        if mobile_path.exists():
            total_size += mobile_path.stat().st_size
        if kiosk_path.exists():
            total_size += kiosk_path.stat().st_size

        return {
            "poster_lqip": f"/static/videos/{lqip_filename}",
            "poster_hd": f"/static/videos/{hd_filename}",
            "video_mobile": f"/static/videos/{mobile_filename}",
            "video_kiosk": f"/static/videos/{kiosk_filename}",
            "file_size_bytes": total_size
        }

    @classmethod
    async def process_image(cls, input_path: str, output_dir: Path, asset_id: int) -> dict:
        """
        Processes uploaded high-resolution photo:
        1. poster_lqip.webp (320x568 blur LQIP ~8-12KB)
        2. poster_hd.webp (1080x1920 HD WebP ~60-120KB)
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        ffmpeg_bin = get_ffmpeg_path()

        base_name = f"asset_{asset_id}"
        lqip_filename = f"{base_name}_lqip.webp"
        hd_filename = f"{base_name}_hd.webp"

        lqip_path = output_dir / lqip_filename
        hd_path = output_dir / hd_filename

        # Command 1: Micro-blurred LQIP poster (320x568)
        cmd_lqip = [
            ffmpeg_bin, "-y", "-i", input_path,
            "-vf", "scale=320:568:force_original_aspect_ratio=increase,crop=320:568",
            "-q:v", "20",
            str(lqip_path)
        ]

        # Command 2: Crisp HD WebP poster (1080x1920)
        cmd_hd = [
            ffmpeg_bin, "-y", "-i", input_path,
            "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-q:v", "88",
            str(hd_path)
        ]

        await asyncio.gather(
            cls._run_async_proc(cmd_lqip, timeout=30),
            cls._run_async_proc(cmd_hd, timeout=30),
        )

        total_size = hd_path.stat().st_size if hd_path.exists() else 0

        return {
            "poster_lqip": f"/static/videos/{lqip_filename}",
            "poster_hd": f"/static/videos/{hd_filename}",
            "video_mobile": None,
            "video_kiosk": None,
            "file_size_bytes": total_size
        }
