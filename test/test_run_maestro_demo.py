import importlib.util
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location(
    "maestro_runner", Path(__file__).resolve().parents[1] / "scripts/run-maestro-demo.py"
)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class MaestroRunnerTest(unittest.TestCase):
    def test_cleanup_waits_for_activity_and_recent_task(self):
        app = runner.APP_ID
        adb = Mock(side_effect=[
            "",
            f"* Hist #0: ActivityRecord{{abc u0 {app}/.MainActivity t8 f}}",
            "ActivityRecord{def u0 com.android.launcher/.Launcher t1}",
            "Success",
            f"realActivity={app}/.MainActivity",
            "realActivity=com.android.launcher/.Launcher",
        ])
        with patch.object(runner.time, "sleep"):
            runner.prepare_flow(adb)
        self.assertEqual([c.args for c in adb.call_args_list], [
            ("am", "force-stop", "--user", "0", app),
            ("dumpsys", "activity", "activities"),
            ("dumpsys", "activity", "activities"),
            ("pm", "clear", "--user", "0", app),
            ("dumpsys", "activity", "recents"),
            ("dumpsys", "activity", "recents"),
        ])

    def test_task_that_does_not_retire_fails_before_maestro(self):
        adb = Mock(side_effect=["", f"ActivityRecord{{abc u0 {runner.APP_ID}/.MainActivity t8}}"])
        with TemporaryDirectory() as directory, patch.object(
            runner.time, "monotonic", side_effect=[0, 10]
        ), patch.object(runner.subprocess, "run") as maestro:
            with self.assertRaisesRegex(RuntimeError, "task still present"):
                runner.run_flows([Path("auth-demo.yaml")], Path(directory), "emulator-5554", adb)
        maestro.assert_not_called()

    def test_failed_flow_keeps_its_junit_and_next_flow_runs_once(self):
        def maestro(command, check):
            destination = Path(command[command.index("--output") + 1])
            flow = Path(command[-1]).name
            failure = flow == "auth-demo.yaml"
            status = "ERROR" if failure else "SUCCESS"
            destination.write_text(
                f'<testsuites><testsuite><testcase file="{flow}" status="{status}"/>'
                '</testsuite></testsuites>', encoding="utf-8",
            )
            return subprocess.CompletedProcess(command, int(failure))

        with TemporaryDirectory() as directory, patch.object(
            runner, "prepare_flow"
        ) as prepare, patch.object(runner.subprocess, "run", side_effect=maestro) as run:
            self.assertFalse(runner.run_flows(
                [Path("auth-demo.yaml"), Path("privacy-demo.yaml")],
                Path(directory), "emulator-5554", Mock(),
            ))
            cases = ET.parse(Path(directory) / "results.xml").findall(".//testcase")
        self.assertEqual([(c.get("file"), c.get("status")) for c in cases], [
            ("auth-demo.yaml", "ERROR"), ("privacy-demo.yaml", "SUCCESS"),
        ])
        self.assertEqual((prepare.call_count, run.call_count), (2, 2))
