with open('test_masterpiece_pages.cjs', 'r', encoding='utf-8') as f:
    text = f.read()

# Add /compliance route in server
text = text.replace("if (reqUrl === '/whitepaper') reqUrl = '/whitepaper.html';", 
                    "if (reqUrl === '/whitepaper') reqUrl = '/whitepaper.html';\n  if (reqUrl === '/compliance') reqUrl = '/compliance.html';")

# Add compliance test step
test_compliance = """
    // 4b. Test /compliance
    console.log('\\n--- Testing /compliance ---');
    await page.goto(`http://localhost:${PORT}/compliance`, { waitUntil: 'networkidle2' });
    console.log('Compliance title:', await page.title());
    await page.screenshot({ path: 'screenshots/compliance_page.png' });
"""

if 'console.log(\'\\n--- 4. Testing /whitepaper ---\');' in text:
    text = text.replace('console.log(\'\\n--- 4. Testing /whitepaper ---\');', test_compliance + '\n    console.log(\'\\n--- 4. Testing /whitepaper ---\');')

with open('test_masterpiece_pages.cjs', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated test_masterpiece_pages.cjs with /compliance check!')
