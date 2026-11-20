import os
import shutil

src_dirs = ['dist']
target_dirs = [
    'jchatt_web_v2/dist',
    'jchatt_web_v2/android/app/src/main/assets/public'
]

def sync_folders():
    for src in src_dirs:
        for root, dirs, files in os.walk(src):
            for file in files:
                src_path = os.path.join(root, file)
                rel_path = os.path.relpath(src_path, src)
                for tgt in target_dirs:
                    dest_path = os.path.join(tgt, rel_path)
                    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                    shutil.copy2(src_path, dest_path)
    print("Successfully synchronized dist -> jchatt_web_v2/dist and android assets!")

if __name__ == '__main__':
    sync_folders()
