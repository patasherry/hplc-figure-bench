import subprocess
import time

def run():
    p = subprocess.Popen(["node", "tests/suites/950_panel_padding.js"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    for _ in range(30):
        time.sleep(1)
        if p.poll() is not None:
            stdout, stderr = p.communicate()
            print(stdout.decode())
            print(stderr.decode())
            return
    p.kill()
    print("timeout")
run()
