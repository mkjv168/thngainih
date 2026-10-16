import sys
import unittest
from pathlib import Path
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tools'))
from build_moul import display_strings
class MoulCoverage(unittest.TestCase):
    def test_fixed_strings(self):
        cmap=TTFont(ROOT/'site/assets/fonts/moul-subset.woff2').getBestCmap()
        for char in set(''.join(display_strings())):
            if not char.isspace():self.assertIn(ord(char),cmap,repr(char))
