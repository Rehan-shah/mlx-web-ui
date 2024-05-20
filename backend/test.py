from mlx_lm import load, generate   
from typing import List, Optional
import mlx.core as mx
from mlx_lm.utils import generate_step

import sys
from contextlib import redirect_stdout
from io import StringIO

from huggingface_hub import snapshot_download

# Redirect stdout to a StringIO object
import subprocess

command = ['mlx_lm.convert', '--hf-path', 'mistralai/Mistral-7B-Instruct-v0.1', '-q']

process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)

while True:
    output = process.stdout.readline()
    if output == '' and process.poll() is not None:
        break
    if output:

rc = process.poll()
