import requests

services = [
    ('https://0x0.st', {'file': open('Jchatt.apk', 'rb')}),
]

for url, files in services:
    try:
        print(f"Trying {url}...")
        r = requests.post(url, files=files, timeout=45)
        print("Status:", r.status_code)
        print("Response:", r.text.strip())
    except Exception as e:
        print("Error:", e)
