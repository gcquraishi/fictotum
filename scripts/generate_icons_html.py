import re

def generate_html():
    try:
        with open('docs/design/WES_ANDERSON_ICONS.md', 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print("Error: Markdown file not found.")
        return

    # Regex to find sections and SVGs
    pattern = re.compile(r'### (.*?)\n.*?\n```svg\n(.*?)\n```', re.DOTALL)
    matches = pattern.findall(content)

    header = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fictotum - Wes Anderson Icons</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            background-color: #F5E6D3;
            color: #3A2F27;
            padding: 40px;
            text-align: center;
        }
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #C97676;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 30px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .icon-card {
            background: #fff;
            border: 2px solid #3A2F27;
            border-radius: 8px;
            padding: 20px;
            transition: transform 0.2s;
            box-shadow: 4px 4px 0px rgba(58, 47, 39, 0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .icon-card:hover {
            transform: translateY(-5px);
        }
        .icon-svg svg {
            display: block;
        }
        .icon-title {
            font-size: 0.8em;
            font-weight: bold;
            margin-top: 15px;
            text-align: center;
        }
        .section-title {
            grid-column: 1 / -1;
            text-align: left;
            margin-top: 40px;
            margin-bottom: 20px;
            font-size: 1.5em;
            color: #2F5D50;
            border-bottom: 2px solid #3A2F27;
            padding-bottom: 5px;
        }
    </style>
</head>
<body>
    <h1>Fictotum Icon Library</h1>
    <p>Wes Anderson Collection • February 2026</p>
    <div class="grid">
"""

    cards = ""
    current_category = ""
    
    for title, svg_code in matches:
        category = title.split(' - ')[0]
        
        if category != current_category:
            cards += f'<div class="section-title">{category}</div>'
            current_category = category

        cards += f"""
        <div class="icon-card">
            <div class="icon-svg">
                {svg_code}
            </div>
            <div class="icon-title">{title}</div>
        </div>
        """

    footer = """
    </div>
</body>
</html>
"""

    full_html = header + cards + footer

    with open('docs/design/icons_preview.html', 'w') as f:
        f.write(full_html)

    print("HTML file generated at docs/design/icons_preview.html")

if __name__ == "__main__":
    generate_html()