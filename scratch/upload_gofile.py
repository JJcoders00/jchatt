import requests

# Gofile requires querying servers first
server_res = requests.get('https://api.gofile.io/servers', timeout=10).json()
print('Servers response:', server_res)
if server_res.get('status') == 'ok':
    server = server_res['data']['servers'][0]['name']
    upload_url = f'https://{server}.gofile.io/contents/uploadfile'
    print(f'Uploading to {upload_url}...')
    with open('Jchatt.apk', 'rb') as f:
        r = requests.post(upload_url, files={'file': f}, timeout=120)
    print('Status:', r.status_code)
    print('Response:', r.json())
