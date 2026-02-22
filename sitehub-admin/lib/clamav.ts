import { spawn } from 'child_process';

export function scanBufferWithClam(buffer: Buffer): Promise<{ ok: boolean; result?: string }> {
  return new Promise((resolve) => {
    const clamd = spawn('clamdscan', ['-']);
    let output = '';
    clamd.stdout.on('data', (d) => (output += d.toString()));
    clamd.stderr.on('data', (d) => (output += d.toString()));
    clamd.on('close', () => {
      const ok = output.includes('OK');
      resolve({ ok, result: output });
    });
    clamd.stdin.write(buffer);
    clamd.stdin.end();
  });
}
