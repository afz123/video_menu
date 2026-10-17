import os
import sys
from pathlib import Path

def bundle_backend(src_dir, output_file):
    out_path = Path(output_file).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(src_dir):
            dirs[:] = [
                d for d in dirs
                if d not in (
                    'venv', '.venv', '__pycache__', '.git', 'node_modules',
                    'bundle', 'logs', 'dist', 'build', '.pytest_cache',
                    '.vscode', '.idea', 'storage'
                )
            ]
            for file in files:
                # Skip package lock and bundler itself to keep output clean
                if file in ('package-lock.json', '.DS_Store', 'bundle.py'):
                    continue

                # Skip binaries, media, database, and archive files
                if file.endswith((
                    '.pyc', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
                    '.webp', '.mp3', '.mp4', '.webm', '.ogg', '.wav', '.avi',
                    '.mov', '.wmv', '.flv', '.mkv', '.sqlite3', '.db', '.log',
                    '.zip', '.tar', '.gz', '.rar', '.7z', '.exe', '.dll',
                    '.so', '.dylib', '.bin', '.class', '.jar', '.war', '.ear',
                    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                    '.gitignore', '.woff', '.woff2', '.ttf', '.eot', '.otf'
                )):
                    continue

                file_path = os.path.join(root, file)
                if Path(file_path).resolve() == out_path:
                    continue

                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()

                    outfile.write("='='='='='='='='='='='='='='='='='='='='='='='='='='='='=\n")
                    outfile.write(f"FILE: {file}\n")
                    outfile.write(f"PATH: {file_path}\n")
                    outfile.write("='='='='='='='='='='='='='='='='='='='='='='='='='='='='=\n\n")
                    outfile.write(content)
                    outfile.write("\n\n")
                except Exception as e:
                    print(f"Could not read {file_path}: {e}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    src_directory = sys.argv[1] if len(sys.argv) > 1 else base_dir
    out_file = sys.argv[2] if len(sys.argv) > 2 else os.path.join(base_dir, "bundle", "bundle.txt")
    bundle_backend(src_directory, out_file)
    print(f"bundled into {out_file}")

