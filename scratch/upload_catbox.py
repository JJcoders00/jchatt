import requests

with open('Jchatt.apk', 'rb') as f:
    r = requests.post('https://catbox.moe/user/api.php', data={'reqtype': 'fileupload'}, files={'fileToUpload': f}, timeout=120)
print('Catbox status:', r.status_code)
print('Catbox URL:', r.text.strip())
