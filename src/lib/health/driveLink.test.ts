import { describe, expect, it } from 'vitest';
import { driveFileId, drivePreviewUrl, isHttpLink } from './driveLink';

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';

describe('driveLink', () => {
  it('wyciąga identyfikator pliku z typowych linków Dysku', () => {
    expect(driveFileId(`https://drive.google.com/file/d/${ID}/view?usp=sharing`)).toBe(ID);
    expect(driveFileId(`https://drive.google.com/open?id=${ID}`)).toBe(ID);
    expect(driveFileId(`https://drive.google.com/uc?export=download&id=${ID}`)).toBe(ID);
  });

  it('odrzuca foldery, obce domeny i śmieci', () => {
    expect(driveFileId('https://drive.google.com/drive/folders/abc123')).toBeNull();
    expect(driveFileId(`https://example.com/file/d/${ID}/view`)).toBeNull();
    expect(driveFileId('nie link')).toBeNull();
    expect(driveFileId(null)).toBeNull();
  });

  it('buduje adres odtwarzacza i rozróżnia linki http', () => {
    expect(drivePreviewUrl(`https://drive.google.com/file/d/${ID}/view`)).toBe(`https://drive.google.com/file/d/${ID}/preview`);
    expect(drivePreviewUrl('https://youtu.be/x')).toBeNull();
    expect(isHttpLink('https://youtu.be/x')).toBe(true);
    expect(isHttpLink('javascript:alert(1)')).toBe(false);
  });
});
