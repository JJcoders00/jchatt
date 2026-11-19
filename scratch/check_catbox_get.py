import requests

url = 'https://files.catbox.moe/1j5e3e.apk'
# Catbox doesn't like HEAD, test GET with stream
r = requests.get(url, stream=True, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}, timeout=15)
print('Status:', r.status_code)
print('Content-Type:', r.headers.get('Content-Type'))
print('Content-Length:', r.headers.get('Content-Length'))
print('Content-Disposition:', r.headers.get('Content-Disposition'))
