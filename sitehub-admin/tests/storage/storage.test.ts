import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Storage', () => {
  const bucket = 'user-uploads';
  const testFilePath = './tests/storage/test-upload.txt';
  const testFileContent = 'Hello, Construction Runner Storage!';
  const testFileKey = 'test-folder/test-upload.txt';

  beforeAll(() => {
    fs.writeFileSync(testFilePath, testFileContent);
  });
  afterAll(() => {
    fs.unlinkSync(testFilePath);
  });

  it('should upload and download a file', async () => {
    // Upload
    const { error: uploadError } = await supabase.storage.from(bucket).upload(testFileKey, fs.createReadStream(testFilePath), { upsert: true });
    expect(uploadError).toBeNull();
    // Download
    const { data, error: downloadError } = await supabase.storage.from(bucket).download(testFileKey);
    expect(downloadError).toBeNull();
    const downloaded = await data.text();
    expect(downloaded).toBe(testFileContent);
  });

  it('should enforce access rules', async () => {
    // Simulate unauthorized access by using a new client with no session
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await anonClient.storage.from(bucket).download(testFileKey);
    // Should be forbidden or error
    expect(error).not.toBeNull();
  });
});
