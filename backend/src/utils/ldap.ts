/**
 * Utilidades del canal LDAP.
 *
 * El correo con el que se arma el filtro de búsqueda proviene del formulario de login y no
 * está autenticado todavía. Interpolarlo tal cual permite cerrar y reabrir paréntesis para
 * alterar la consulta al directorio (p. ej. `*)(objectClass=*` convierte la búsqueda de un
 * usuario puntual en un comodín). El escape es la defensa equivalente al parametrizado en SQL.
 */
const LDAP_FILTER_ESCAPES: Record<string, string> = {
  '\\': '\\5c',
  '*': '\\2a',
  '(': '\\28',
  ')': '\\29',
  '\0': '\\00',
  '/': '\\2f'
};

/** Escapa los caracteres con significado sintáctico en un filtro LDAP (RFC 4515). */
export const escapeLdapFilterValue = (value: string): string =>
  value.replace(/[\\*()\0/]/g, (char) => LDAP_FILTER_ESCAPES[char] ?? char);

/**
 * El modo simulado acepta credenciales sin contactar al Directorio Activo, de modo que solo
 * puede habilitarse de forma explícita y jamás en producción. Antes bastaba con que
 * `NODE_ENV` no fuera `production` —o con que faltara el módulo `ldapjs`— para degradar la
 * autenticación silenciosamente.
 */
export const isLdapSimulationEnabled = (): boolean =>
  process.env.LDAP_SIMULATION_ENABLED === 'true' && process.env.NODE_ENV !== 'production';
