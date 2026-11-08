#!/bin/bash
node tests/suites/20_science.js p5 > /tmp/20_science_out.log 2>&1
cat /tmp/20_science_out.log | grep -A 20 -B 5 p5.methods_volume_override
