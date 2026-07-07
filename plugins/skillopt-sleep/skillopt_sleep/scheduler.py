"""SkillOpt-Sleep — built-in nightly scheduler.

Installs/removes a crontab entry that runs the sleep cycle automatically, so the
user doesn't have to wire cron themselves. Idempotent: a managed block delimited
by marker comments is added/replaced/removed in the user's crontab.

Design choices:
  * Off-:00 minute (3:17 local by default) so many users don't all hit the API
    at the same instant.
  * The entry runs `python -m skillopt_sleep run` for a specific project and
    appends to <project>/.skillopt-sleep/cron.log.
  * `schedule` is additive per project (keyed by project path); `unschedule`
    removes the project's line (or the whole managed block with --all).

cron is the portable mechanism on Linux/macOS. On systems without `crontab`,
`schedule` prints the line and instructions instead of failing.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from typing import List, Optional, Tuple

_BEGIN = "# >>> skillopt-sleep (managed) >>>"
_END = "# <<< skillopt-sleep (managed) <<<"


def _have_crontab() -> bool:
    return shutil.which("crontab") is not None


def _read_crontab() -> str:
    try:
        proc = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        return proc.stdout if proc.returncode == 0 else ""
    except Exception:
        return ""


def _write_crontab(content: str) -> bool:
    try:
        proc = subprocess.run(["crontab", "-"], input=content, text=True,
                              capture_output=True)
        return proc.returncode == 0
    except Exception:
        return False


def _split_managed(crontab: str) -> Tuple[str, List[str]]:
    """Return (text_outside_block, managed_lines_inside_block)."""
    lines = crontab.splitlines()
    outside: List[str] = []
    managed: List[str] = []
    in_block = False
    for ln in lines:
        if ln.strip() == _BEGIN:
            in_block = True
            continue
        if ln.strip() == _END:
            in_block = False
            continue
        (managed if in_block else outside).append(ln)
    return "\n".join(outside).rstrip(), managed


def _runner_cmd(project: str, backend: str, extra: str, python: str) -> str:
    logdir = os.path.join(project, ".skillopt-sleep")
    log = os.path.join(logdir, "cron.log")
    # use absolute python + -m so cron's minimal env still works
    cmd = (f'{python} -m skillopt_sleep run --project "{project}" '
           f'--scope invoked --backend {backend} {extra}'.rstrip())
    return f'mkdir -p "{logdir}"; cd "{_repo_root()}" && {cmd} >> "{log}" 2>&1'


def _repo_root() -> str:
    # the package lives at <repo>/skillopt_sleep/; repo root is its parent
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _project_marker(project: str) -> str:
    return f"# project={os.path.abspath(project)}"


def schedule(project: str, *, backend: str = "mock", hour: int = 3, minute: int = 17,
             extra: str = "", python: Optional[str] = None) -> Tuple[bool, str]:
    """Install (or replace) the nightly entry for ``project``.

    Returns (installed, message). If crontab is unavailable, installed=False and
    the message contains the line to add manually.
    """
    project = os.path.abspath(project)
    python = python or sys.executable or "python3"
    cron_line = f"{minute} {hour} * * *  {_runner_cmd(project, backend, extra, python)}  {_project_marker(project)}"

    if not _have_crontab():
        return False, ("crontab not found on this system. Add this line to your "
                       "scheduler manually:\n" + cron_line)

    outside, managed = _split_managed(_read_crontab())
    # drop any existing line for this project, then add the new one
    marker = _project_marker(project)
    managed = [ln for ln in managed if marker not in ln and ln.strip()]
    managed.append(cron_line)

    block = _BEGIN + "\n" + "\n".join(managed) + "\n" + _END
    new_crontab = (outside + "\n\n" + block + "\n").lstrip("\n")
    ok = _write_crontab(new_crontab)
    if ok:
        return True, (f"Scheduled nightly at {hour:02d}:{minute:02d} for {project} "
                      f"(backend={backend}). Logs -> {project}/.skillopt-sleep/cron.log\n"
                      f"Runs `skillopt_sleep run`; it only STAGES a proposal — adopt is still manual.")
    return False, "Failed to write crontab. Line to add manually:\n" + cron_line


def unschedule(project: Optional[str] = None, *, all_projects: bool = False) -> Tuple[bool, str]:
    """Remove the entry for ``project`` (or the whole managed block with all_projects)."""
    if not _have_crontab():
        return False, "crontab not found; nothing to remove."
    outside, managed = _split_managed(_read_crontab())
    if all_projects:
        managed = []
    elif project:
        marker = _project_marker(project)
        managed = [ln for ln in managed if marker not in ln and ln.strip()]
    if managed:
        block = _BEGIN + "\n" + "\n".join(managed) + "\n" + _END
        new_crontab = (outside + "\n\n" + block + "\n").lstrip("\n")
    else:
        new_crontab = outside.rstrip() + "\n"
    ok = _write_crontab(new_crontab)
    return ok, ("Removed." if ok else "Failed to update crontab.")


def list_scheduled() -> List[str]:
    _outside, managed = _split_managed(_read_crontab())
    return [ln for ln in managed if ln.strip()]
