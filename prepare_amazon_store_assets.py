import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

os.makedirs('amazon_store_assets', exist_ok=True)

# 1. Icons
master_icon_path = 'images/logo/icon.png'
if os.path.exists(master_icon_path):
    img = Image.open(master_icon_path).convert('RGBA')
    icon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save('amazon_store_assets/icon_512x512.png', 'PNG')
    icon_114 = img.resize((114, 114), Image.Resampling.LANCZOS)
    icon_114.save('amazon_store_assets/icon_114x114.png', 'PNG')
    print('Icons generated.')

# 2. Perfected 1024x500 Promotional Banner
banner = Image.new('RGBA', (1024, 500), (10, 34, 48, 255))
draw = ImageDraw.Draw(banner)

# Soft radial background glow on right (teal/lime)
glow = Image.new('RGBA', (1024, 500), (0, 0, 0, 0))
g_draw = ImageDraw.Draw(glow)
g_draw.ellipse([550, -50, 1050, 550], fill=(45, 157, 134, 45))
g_draw.ellipse([650, 50, 950, 450], fill=(130, 216, 47, 30))
glow = glow.filter(ImageFilter.GaussianBlur(40))
banner.alpha_composite(glow)

# Mascot on the right
mascot_path = 'images/mascot/mascot_hero.png'
if os.path.exists(mascot_path):
    mascot = Image.open(mascot_path).convert('RGBA')
    # Resize mascot to fit nicely in banner height
    mascot.thumbnail((440, 440), Image.Resampling.LANCZOS)
    # Grounded at bottom right
    banner.alpha_composite(mascot, (600, 500 - mascot.height - 15))

# App Icon on the left
if os.path.exists(master_icon_path):
    app_icon = Image.open(master_icon_path).convert('RGBA')
    app_icon.thumbnail((96, 96), Image.Resampling.LANCZOS)
    mask = Image.new('L', app_icon.size, 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([0, 0, app_icon.width, app_icon.height], radius=22, fill=255)
    banner.paste(app_icon, (64, 50), mask)

try:
    font_brand = ImageFont.truetype("arialbd.ttf", 36)
    font_sub_brand = ImageFont.truetype("arial.ttf", 17)
    font_headline = ImageFont.truetype("arialbd.ttf", 40)
    font_desc = ImageFont.truetype("arial.ttf", 20)
    font_pill = ImageFont.truetype("arialbd.ttf", 14)
except:
    font_brand = ImageFont.load_default()
    font_sub_brand = font_brand
    font_headline = font_brand
    font_desc = font_brand
    font_pill = font_brand

draw.text((176, 56), "JChatt", fill=(255, 255, 255), font=font_brand)
draw.text((176, 100), "Private Messenger · Zero Telemetry", fill=(130, 216, 47), font=font_sub_brand)

# Main Headline (strictly confined to left side: width < 520px)
draw.text((64, 185), "Private by architecture,\nnot by promise.", fill=(255, 255, 255), font=font_headline)
draw.text((64, 290), "No phone number, no email, no SIM.\nYour identity is a 12-word cryptographic seed.", fill=(169, 211, 229), font=font_desc)

# Pill badges
badges = ["AES-256-GCM E2EE", "Calculator Disguise", "WebRTC Direct Calls", "Zero Logs"]
bx = 64
by = 385
for b in badges:
    bbox = draw.textbbox((0, 0), b, font=font_pill)
    bw = bbox[2] - bbox[0] + 20
    bh = 32
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=16, fill=(18, 49, 64), outline=(130, 216, 47), width=1)
    draw.text((bx + 10, by + 8), b, fill=(255, 255, 255), font=font_pill)
    bx += bw + 10

banner.save('amazon_store_assets/promo_banner_1024x500.png', 'PNG')
print('Promo banner perfected.')

# 3. Store Screenshots (1080x1920) with Device Frame
screenshot_configs = [
    {
        "src": "screenshots/screen_01_welcome-1.png",
        "title": "Zero Phone Numbers",
        "desc": "Your identity is a 12-word cryptographic seed phrase.",
        "out": "amazon_store_assets/screenshot_1_welcome.png"
    },
    {
        "src": "screenshots/screen_04_create-id.png",
        "title": "Self-Sovereign Identity",
        "desc": "Generate private handles without SIM cards or email.",
        "out": "amazon_store_assets/screenshot_2_identity.png"
    },
    {
        "src": "screenshots/screen_05_secure-device.png",
        "title": "Anti-Coercion Security",
        "desc": "Duress PIN reveals an isolated decoy vault partition.",
        "out": "amazon_store_assets/screenshot_3_security.png"
    },
    {
        "src": "screenshots/screen_07_chats.png",
        "title": "End-to-End Encrypted Inbox",
        "desc": "Client-side AES-256-GCM. Zero contact book scraping.",
        "out": "amazon_store_assets/screenshot_4_inbox.png"
    },
    {
        "src": "screenshots/screen_10_disguise-calc.png",
        "title": "Biometric & Stealth Lock",
        "desc": "Fingerprint unlock or 4-digit master passcode.",
        "out": "amazon_store_assets/screenshot_5_lock.png"
    }
]

for sc in screenshot_configs:
    canvas = Image.new('RGBA', (1080, 1920), (10, 34, 48, 255))
    c_draw = ImageDraw.Draw(canvas)

    try:
        f_head = ImageFont.truetype("arialbd.ttf", 64)
        f_desc = ImageFont.truetype("arial.ttf", 34)
    except:
        f_head = ImageFont.load_default()
        f_desc = f_head

    c_draw.text((70, 90), sc["title"], fill=(130, 216, 47), font=f_head)
    c_draw.text((70, 175), sc["desc"], fill=(227, 243, 250), font=f_desc)

    if os.path.exists(sc["src"]):
        s_img = Image.open(sc["src"]).convert('RGBA')
        
        # Phone frame size: fit comfortably within 1080x1920 with full buttons visible!
        # Max height available: 1920 - 270 (top header) - 40 (bottom margin) = 1610px
        # Target height = 1580px
        target_h = 1560
        target_w = int(s_img.width * (target_h / s_img.height))
        s_scaled = s_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Center horizontally
        frame_x = (1080 - target_w) // 2
        frame_y = 280

        # Draw phone bezel / rounded border with shadow
        shadow = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0))
        sh_draw = ImageDraw.Draw(shadow)
        sh_draw.rounded_rectangle([frame_x - 8, frame_y - 8, frame_x + target_w + 8, frame_y + target_h + 8], radius=38, fill=(0, 0, 0, 120))
        shadow = shadow.filter(ImageFilter.GaussianBlur(14))
        canvas.alpha_composite(shadow)

        # Phone bezel
        c_draw.rounded_rectangle([frame_x - 6, frame_y - 6, frame_x + target_w + 6, frame_y + target_h + 6], radius=36, fill=(18, 49, 64), outline=(45, 157, 134), width=3)

        # Screen inside
        mask = Image.new('L', (target_w, target_h), 0)
        m_draw = ImageDraw.Draw(mask)
        m_draw.rounded_rectangle([0, 0, target_w, target_h], radius=30, fill=255)
        canvas.paste(s_scaled, (frame_x, frame_y), mask)

    canvas.save(sc["out"], 'PNG')
    print(f"Perfected: {sc['out']}")

print("\n✅ All Amazon Store visual assets perfected!")
