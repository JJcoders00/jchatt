import requests

with open('Jchatt_v2_Release.apk', 'rb') as f:
    r = requests.post('https://file.io', files={'file': f}, data={'expires': '14d'}, timeout=60)
print('file.io response:', r.json())
