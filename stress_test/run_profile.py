#!/usr/bin/env python3
"""
Run predefined load test profiles easily
"""
import subprocess
import sys

profiles = {
    "light": {"users": 10, "spawn_rate": 1, "run_time": "5m", "desc": "Light load - verify setup"},
    "medium": {"users": 50, "spawn_rate": 2, "run_time": "10m", "desc": "Normal usage simulation"},
    "stress": {"users": 200, "spawn_rate": 5, "run_time": "15m", "desc": "Stress test maximum limits"},
    "soak": {"users": 30, "spawn_rate": 0.5, "run_time": "1h", "desc": "Long running stability test"},
}


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in profiles:
        print("Usage: python run_profile.py [profile]")
        print("\nAvailable profiles:")
        for name, p in profiles.items():
            print(f"  {name:8} {p['users']:3} users | {p['spawn_rate']:4}/sec ramp | {p['run_time']:4} | {p['desc']}")
        sys.exit(1)

    profile = profiles[sys.argv[1]]
    print(f"\nRunning {sys.argv[1]} profile:\n")
    print(f"  Users:      {profile['users']}")
    print(f"  Spawn rate: {profile['spawn_rate']} / second")
    print(f"  Run time:   {profile['run_time']}\n")

    cmd = [
        "~/.local/bin/locust",
        "--headless",
        "--users", str(profile['users']),
        "--spawn-rate", str(profile['spawn_rate']),
        "--run-time", profile['run_time'],
        "--html", f"report_{sys.argv[1]}.html"
    ]

    print("Executing:\n  " + " ".join(cmd) + "\n")
    subprocess.run(" ".join(cmd), shell=True)
