import os, re, hashlib

src_path = r"C:\Users\jomet\.gemini\antigravity\brain\13e0be15-0669-4013-a057-991a68222973\.user_uploaded\media_1794844749620_d4b4d9ea.html"
with open(src_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update GitHub link to real repository
content = content.replace('href="https://github.com/"', 'href="https://github.com/JJcoders00/jchatt"')

# 2. Add Capacitor native redirection in <head>
native_redirect_script = """<script>
  /* JChatt Native Shell Detection: in Capacitor Android shell, direct immediately to the web messenger */
  (function() {
    function detectNative() {
      try {
        if ((window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || 
            window.location.search.indexOf('native=1') !== -1 ||
            window.location.search.indexOf('app=1') !== -1) {
          window.location.replace('./web.html');
        }
      } catch (e) {}
    }
    detectNative();
    document.addEventListener('DOMContentLoaded', detectNative);
  })();
</script>
"""

if "<head>" in content:
    content = content.replace("<head>", "<head>\n" + native_redirect_script, 1)

# 3. Check and update real APK download metadata
apk_file = "downloads/jchatt-v2.0.apk"
if os.path.exists(apk_file):
    apk_size = os.path.getsize(apk_file)
    apk_size_mb = f"{apk_size / (1024 * 1024):.1f} MB"
    apk_sha256 = hashlib.sha256(open(apk_file, "rb").read()).hexdigest()
    print(f"APK Size: {apk_size_mb}, SHA256: {apk_sha256}")
else:
    print("Warning: APK file not found at", apk_file)

# 4. Save to index.html
with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully written enhanced masterpiece to index.html!")
print(f"File size: {len(content)} bytes")
