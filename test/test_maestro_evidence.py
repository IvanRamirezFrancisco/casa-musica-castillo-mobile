import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('maestro_evidence', Path(__file__).resolve().parents[1] / 'scripts/verify-maestro-results.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MaestroEvidenceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        for name in ['first.yaml', 'privacy.yaml']:
            (self.directory / name).write_text('appId: fixture\n---\n', encoding='utf-8')
        (self.directory / 'config.yaml').write_text('flows:\n  - first.yaml\n  - privacy.yaml\n', encoding='utf-8')
        self.junit = self.directory / 'results.xml'

    def check(self, body):
        self.junit.write_text('<testsuites><testsuite>' + body + '</testsuite></testsuites>', encoding='utf-8')
        return module.verify_results(self.directory, self.junit)

    def test_complete_success(self):
        self.assertEqual(self.check('<testcase file=".maestro/first.yaml" status="SUCCESS"/><testcase file=".maestro/privacy.yaml" status="SUCCESS"/>')['passed'], 2)

    def test_omitted_flow_rejected(self):
        with self.assertRaises(ValueError):
            self.check('<testcase file=".maestro/first.yaml" status="SUCCESS"/>')

    def test_duplicate_does_not_replace_missing_flow(self):
        with self.assertRaises(ValueError):
            self.check('<testcase file="first.yaml" status="SUCCESS"/><testcase file="first.yaml" status="SUCCESS"/>')

    def test_failure_and_skip_rejected(self):
        for tag in ['failure', 'error', 'skipped']:
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                self.check('<testcase file="first.yaml" status="SUCCESS"/><testcase file="privacy.yaml" status="SUCCESS"><' + tag + '/></testcase>')

    def test_unregistered_root_flow_rejected(self):
        (self.directory / 'new.yaml').write_text('appId: fixture\n---\n', encoding='utf-8')
        with self.assertRaises(ValueError):
            self.check('<testcase file="first.yaml" status="SUCCESS"/><testcase file="privacy.yaml" status="SUCCESS"/>')


if __name__ == '__main__':
    unittest.main()
