from pathlib import Path
import json
import urllib.request
root = Path(__file__).resolve().parents[1]
with urllib.request.urlopen('http://127.0.0.1:5088/swagger/v1/swagger.json') as response: schema = json.load(response)
(root / 'docs' / 'openapi.json').write_text(json.dumps(schema, indent=2) + '\n', encoding='utf-8')
print('Exported OpenAPI contract:', len(schema['paths']), 'paths')
