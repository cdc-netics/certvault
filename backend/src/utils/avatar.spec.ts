import fs from 'fs';
import path from 'path';
import { saveBase64Avatar } from './avatar';

/**
 * `saveBase64Avatar` escribe en disco, por lo que se intercepta la escritura y se conserva
 * el nombre generado para verificar la extensión resultante.
 */
describe('saveBase64Avatar', () => {
  let writtenPaths: string[] = [];

  beforeEach(() => {
    writtenPaths = [];
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath) => {
      writtenPaths.push(String(filePath));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const pngPixel =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  it('guarda un PNG válido y devuelve la ruta pública', () => {
    const url = saveBase64Avatar(`data:image/png;base64,${pngPixel}`);

    expect(url).toMatch(/^\/uploads\/avatars\/avatar-\d+-[0-9a-f]{12}\.png$/);
    expect(writtenPaths).toHaveLength(1);
  });

  it('rechaza un data URL mal formado', () => {
    expect(() => saveBase64Avatar('no-es-un-data-url')).toThrow('Avatar invalido');
    expect(() => saveBase64Avatar('data:image/png;base64,')).toThrow('Avatar invalido');
  });

  it('rechaza un tipo que no sea una imagen admitida', () => {
    expect(() => saveBase64Avatar('data:application/pdf;base64,AAAA')).toThrow(
      'Formato de avatar no permitido'
    );
  });

  it('admite los formatos rasterizados de uso habitual', () => {
    expect(saveBase64Avatar(`data:image/jpeg;base64,${pngPixel}`)).toMatch(/\.jpg$/);
    expect(saveBase64Avatar(`data:image/webp;base64,${pngPixel}`)).toMatch(/\.webp$/);
    expect(saveBase64Avatar(`data:image/gif;base64,${pngPixel}`)).toMatch(/\.gif$/);
  });

  it('rechaza un avatar que supere el tamaño máximo', () => {
    const enorme = Buffer.alloc(3 * 1024 * 1024).toString('base64');

    expect(() => saveBase64Avatar(`data:image/png;base64,${enorme}`)).toThrow(/tamaño máximo/);
  });

  it('no permite que el nombre generado escape del directorio de avatares', () => {
    const url = saveBase64Avatar(`data:image/png;base64,${pngPixel}`);
    const fileName = path.basename(url);

    expect(fileName).not.toContain('/');
    expect(fileName).not.toContain('..');
  });

  it('rechaza un SVG aunque se declare como imagen (regresión del XSS en avatares)', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

    // Los avatares se sirven como estáticos: un .svg se entregaría como image/svg+xml y
    // ejecutaría su script en el origen de la aplicación al abrir la URL directa.
    expect(() => saveBase64Avatar(`data:image/svg+xml;base64,${svg.toString('base64')}`)).toThrow(
      'Formato de avatar no permitido'
    );
    expect(() => saveBase64Avatar(`data:image/svg;base64,${svg.toString('base64')}`)).toThrow(
      'Formato de avatar no permitido'
    );
  });

  it('no permite que el tipo declarado defina la extensión almacenada', () => {
    // La extensión proviene de la tabla de tipos admitidos, no del texto del data URL.
    const url = saveBase64Avatar(`data:image/JPEG;base64,${pngPixel}`);

    expect(url).toMatch(/\.jpg$/);
  });
});
