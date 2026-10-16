"""Exercise resource discovery with temporary, fully offline site fixtures."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('size_budget', Path(__file__).resolve().parents[1] / 'tools/size_budget.py')
budget = importlib.util.module_from_spec(spec)
spec.loader.exec_module(budget)


class BudgetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.site = Path(self.temp.name)
        self.patch = patch.object(budget, 'SITE', self.site)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        for name, content in {
            'index.html': '<link rel="stylesheet" href="styles.css"><link rel="preload" href="active.woff2"><script type="module" src="main.js"></script><img src="image.svg">',
            'styles.css': "@font-face{font-family:Active;src:url(active.woff2)}@font-face{font-family:'Slot';src:url(slot.woff2)}:root{--body:Active,sans-serif;--ornament-divider:url(image.svg)}body{font-family:var(--body)}",
            'active.woff2': 'active', 'slot.woff2': 'slot', 'image.svg': '<svg/>',
            'main.js': "import {x} from './nested.js'; import './side.js';",
            'nested.js': "import './side.js'; export const x=1;",
            'side.js': '',
        }.items():
            (self.site / name).write_text(content)

    def test_imports_fonts_ornaments_and_deduplication(self):
        result = budget.measure('/', ['main.js', 'image.svg'])
        paths = [row['path'] for row in result['resources']]
        self.assertEqual(set(paths), {'index.html', 'styles.css', 'active.woff2', 'main.js', 'nested.js', 'side.js', 'image.svg'})
        self.assertEqual(len(paths), len(set(paths)))
        self.assertEqual(result['raw_bytes'], sum((self.site / path).stat().st_size for path in paths))

    def test_font_slot_activation(self):
        path = self.site / 'styles.css'
        path.write_text(path.read_text().replace('--body:Active', "--body:'Slot',Active"))
        self.assertIn('slot.woff2', [row['path'] for row in budget.measure('/', [])['resources']])

    def test_missing_runtime_is_error(self):
        with self.assertRaisesRegex(ValueError, 'Missing resource: missing.json'):
            budget.measure('/', ['missing.json'])

    def test_missing_inactive_slot_is_allowed(self):
        (self.site / 'slot.woff2').unlink()
        budget.measure('/', [])
        (self.site / 'active.woff2').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing resource: active.woff2'):
            budget.measure('/', [])


if __name__ == '__main__':
    unittest.main()
