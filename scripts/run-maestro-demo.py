"""Run every DEMO flow once, isolating Android task teardown between flows."""

from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET

APP_ID = "com.casademusicacastillo.app"
ACTIVITY = re.compile(r"ActivityRecord\{[^\n]*\s" + re.escape(APP_ID) + r"/")
COMPONENT = re.compile(r"\b(?:cmp|realActivity|origActivity)=" + re.escape(APP_ID) + r"/")


def wait_until_retired(adb, section, pattern):
    deadline = time.monotonic() + 10
    while True:
        state = adb("dumpsys", "activity", section)
        if not pattern.search(state):
            return
        if time.monotonic() >= deadline:
            raise RuntimeError(f"Previous DEMO task still present in Android {section}")
        time.sleep(0.2)


def prepare_flow(adb):
    # Clearing a visible task can schedule a kill that reaches the next process.
    adb("am", "force-stop", "--user", "0", APP_ID)
    wait_until_retired(adb, "activities", ACTIVITY)
    if adb("pm", "clear", "--user", "0", APP_ID).strip() != "Success":
        raise RuntimeError("Android did not confirm clearing DEMO state")
    # The YAML still clears state for standalone runs. In CI it has no old task to remove.
    wait_until_retired(adb, "recents", COMPONENT)


def run_flows(flows, reports, serial, adb):
    reports.mkdir(parents=True, exist_ok=True)
    combined = ET.Element("testsuites")
    passed = True
    try:
        for flow in flows:
            prepare_flow(adb)
            print(f"Android task retired before {flow.name}", flush=True)
            output = reports / "flows" / flow.stem
            output.mkdir(parents=True)
            result = output / "results.xml"
            completed = subprocess.run([
                "maestro", "--device", serial, "test", "--format", "JUNIT",
                "--output", str(result), "--test-output-dir", str(output),
                "--debug-output", str(output / "debug"), str(flow),
            ], check=False)
            if completed.returncode != 0 or not result.is_file():
                passed = False
            if result.is_file():
                root = ET.parse(result).getroot()
                combined.extend([root] if root.tag == "testsuite" else root.findall("testsuite"))
    finally:
        ET.ElementTree(combined).write(reports / "results.xml", encoding="utf-8", xml_declaration=True)
    return passed


def main():
    serial = subprocess.check_output(["adb", "-e", "get-serialno"], text=True).strip()
    if not re.fullmatch(r"emulator-\d+", serial):
        raise RuntimeError("DEMO task cleanup requires a dedicated Android emulator")

    def adb(*args):
        return subprocess.check_output(["adb", "-s", serial, "shell", *args], text=True)

    flows = sorted(path for path in Path(".maestro").iterdir()
                   if path.is_file() and path.suffix in {".yaml", ".yml"} and path.stem != "config")
    if not flows:
        raise RuntimeError("No DEMO root flows found")
    return 0 if run_flows(flows, Path("reports/maestro"), serial, adb) else 1


if __name__ == "__main__":
    raise SystemExit(main())
