import requests

with open('Jchatt.apk', 'rb') as f:
    r = requests.post('https://litterbox.catbox.moe/resources/internals/api.php', data={'reqtype': 'fileupload', 'time': '72h'}, files={'fileToUpload': f}, timeout=120)
print('Litterbox status:', r.status_code)
print('Litterbox URL:', r.text.strip())
