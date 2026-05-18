import re
import os

# Paths mapped to your system
file_path = r"C:\Users\Asus\.gemini\antigravity\conversations\a4ce4c02-627c-4af1-9708-b9d12cb3855e.pb"
desktop_path = os.path.join(os.path.expanduser("~"), "Desktop", "salvaged_payroll_context.txt")

print("Processing binary log with wider coverage...")

try:
    with open(file_path, "rb") as f:
        binary_data = f.read()

    # Included \x09 (tabs) and lowered minimum character length to 6 to catch code snippets
    text_blocks = re.findall(b"[\x20-\x7E\x09\x0A\x0D]{6,}", binary_data)

    print(f"Extracted {len(text_blocks)} text segments. Writing to file...")

    with open(desktop_path, "w", encoding="utf-8", errors="ignore") as out:
        for block in text_blocks:
            decoded = block.decode("utf-8", errors="ignore").strip()
            
            # Write everything that isn't just empty space
            if decoded:
                out.write(decoded + "\n\n" + "="*40 + "\n\n")

    print(f"Extraction complete! File saved to: {desktop_path}")
    print(f"Generated file size: {os.path.getsize(desktop_path) / 1024:.2f} KB")

except Exception as e:
    print(f"Error reading file: {e}")