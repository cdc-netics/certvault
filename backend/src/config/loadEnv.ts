import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Carga del archivo .env como efecto de importacion.
 *
 * Debe ser el primer import local de cualquier punto de entrada. Los imports se elevan por
 * encima del cuerpo del modulo, asi que llamar a dotenv.config() dentro de server.ts ocurria
 * DESPUES de evaluar los modulos importados: cualquier constante leida a nivel de modulo
 * (vigencias de token, limites de peticiones) caia a su valor por defecto sin aviso. En Docker
 * no se notaba porque env_file inyecta las variables en el proceso antes de arrancar Node, pero
 * en desarrollo local el archivo .env quedaba ignorado.
 */
const explicitEnvPath = process.env.ENV_FILE;
const envCandidates = [
  explicitEnvPath,
  path.resolve(__dirname, '../../../.env')
].filter((candidate): candidate is string => Boolean(candidate));

const discoveredEnvPath = envCandidates.find(candidate => fs.existsSync(candidate));
if (discoveredEnvPath) {
  dotenv.config({ path: discoveredEnvPath });
}

// Expandir variables de entorno de forma iterativa para soportar interpolación compleja (ej. ${PORT})
// Se realizan múltiples pasadas (máximo 3) para garantizar que las dependencias anidadas se resuelvan correctamente.
for (let pass = 0; pass < 3; pass++) {
  let changed = false;
  for (const key in process.env) {
    const val = process.env[key];
    if (val && typeof val === 'string' && val.includes('${')) {
      const newVal = val.replace(/\${(\w+)}/g, (_, name) => process.env[name] || '');
      if (newVal !== val) {
        process.env[key] = newVal;
        changed = true;
      }
    }
  }
  if (!changed) break;
}

export const loadedEnvPath = discoveredEnvPath;
