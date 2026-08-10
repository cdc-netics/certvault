import {
  canonicalExtensionForMimeType,
  isConsistentCertificateUpload,
  resolveCertificateContentType,
  toSafeDownloadName
} from './certificateFile';

describe('isConsistentCertificateUpload', () => {
  it('acepta las combinaciones legítimas de tipo y extensión', () => {
    expect(isConsistentCertificateUpload('application/pdf', 'diploma.pdf')).toBe(true);
    expect(isConsistentCertificateUpload('image/jpeg', 'foto.JPG')).toBe(true);
    expect(isConsistentCertificateUpload('image/jpeg', 'foto.jpeg')).toBe(true);
    expect(isConsistentCertificateUpload('image/png', 'captura.png')).toBe(true);
  });

  it('rechaza un HTML disfrazado de PDF (regresión del XSS almacenado)', () => {
    expect(isConsistentCertificateUpload('application/pdf', 'payload.html')).toBe(false);
  });

  it('rechaza otras extensiones ejecutables aunque el tipo declarado sea válido', () => {
    expect(isConsistentCertificateUpload('image/png', 'payload.svg')).toBe(false);
    expect(isConsistentCertificateUpload('application/pdf', 'payload.js')).toBe(false);
  });

  it('rechaza un tipo MIME fuera de la lista admitida', () => {
    expect(isConsistentCertificateUpload('text/html', 'payload.html')).toBe(false);
  });

  it('rechaza un archivo sin extensión', () => {
    expect(isConsistentCertificateUpload('application/pdf', 'diploma')).toBe(false);
  });
});

describe('canonicalExtensionForMimeType', () => {
  it('normaliza la extensión con la que se guarda el archivo', () => {
    expect(canonicalExtensionForMimeType('application/pdf')).toBe('.pdf');
    expect(canonicalExtensionForMimeType('image/jpeg')).toBe('.jpg');
    expect(canonicalExtensionForMimeType('image/png')).toBe('.png');
  });

  it('devuelve null para un tipo no admitido', () => {
    expect(canonicalExtensionForMimeType('text/html')).toBeNull();
  });
});

describe('resolveCertificateContentType', () => {
  it('deriva el tipo de contenido de la extensión almacenada', () => {
    expect(resolveCertificateContentType('1723-9912.pdf')).toBe('application/pdf');
    expect(resolveCertificateContentType('1723-9912.JPEG')).toBe('image/jpeg');
  });

  it('devuelve null ante un archivo heredado con extensión no admitida', () => {
    expect(resolveCertificateContentType('1723-9912.html')).toBeNull();
    expect(resolveCertificateContentType('1723-9912')).toBeNull();
  });
});

describe('toSafeDownloadName', () => {
  it('elimina los caracteres que Content-Disposition no admite (regresión del 500)', () => {
    // La raya y las comillas tipográficas están fuera de latin1 y hacían fallar setHeader.
    expect(toSafeDownloadName('Certificación—Avanzada “X”', '.pdf')).toBe('Certificacion_Avanzada_X.pdf');
  });

  it('reemplaza las tildes en lugar de descartarlas', () => {
    expect(toSafeDownloadName('Auditoría Interna', '.pdf')).toBe('Auditoria_Interna.pdf');
  });

  it('no permite que el nombre escape del directorio ni rompa la cabecera', () => {
    // Los separadores se neutralizan y el prefijo de puntos y guiones bajos se descarta.
    expect(toSafeDownloadName('../../etc/passwd', '.pdf')).toBe('etc_passwd.pdf');
    expect(toSafeDownloadName('con "comillas"', '.pdf')).toBe('con_comillas.pdf');
  });

  it('recurre a un nombre por defecto cuando no queda nada utilizable', () => {
    expect(toSafeDownloadName('***', '.pdf')).toBe('certificado.pdf');
    expect(toSafeDownloadName('', '.png')).toBe('certificado.png');
  });

  it('acota la longitud del nombre', () => {
    expect(toSafeDownloadName('A'.repeat(300), '.pdf')).toBe(`${'A'.repeat(120)}.pdf`);
  });
});
