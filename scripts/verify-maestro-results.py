"""Reject incomplete acceptance evidence: every registered root flow must pass exactly once."""
from pathlib import Path
import json
import re
import sys
import xml.etree.ElementTree as ET


def verify_results(flow_directory, junit_file):
    directory = Path(flow_directory)
    config = (directory / 'config.yaml').read_text(encoding='utf-8')
    registered = re.findall(r'^\s*-\s+([^\s]+\.ya?ml)\s*$', config, re.M)
    root_flows = {p.name for p in directory.iterdir()
                  if p.is_file() and p.suffix in {'.yml', '.yaml'} and p.stem != 'config'}
    if not registered or len(registered) != len(set(registered)) or set(registered) != root_flows:
        raise ValueError('Register every root Maestro flow exactly once in config.yaml.')
    cases = ET.parse(junit_file).findall('.//testcase')
    executed = [case.attrib.get('file', '').replace('\\', '/').rsplit('/', 1)[-1] for case in cases]
    if len(executed) != len(registered) or set(executed) != set(registered):
        raise ValueError('JUnit does not contain every registered flow exactly once.')
    for case in cases:
        if case.attrib.get('status') != 'SUCCESS' or any(case.find(tag) is not None for tag in ['failure', 'error', 'skipped']):
            raise ValueError('Every registered flow must succeed; failed/skipped cases are not acceptance.')
    return {'status': 'PASS', 'registered': registered, 'passed': len(cases)}


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    result = verify_results(root / '.maestro', Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'reports/maestro/results.xml')
    print(json.dumps(result))
