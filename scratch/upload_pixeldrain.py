import requests

with open('Jchatt.apk', 'rb') as f:
    r = requests.post('https://pixeldrain.com/api/file', files={'file': f}, timeout=120)
print('pixeldrain:', r.status_code, r.text)
