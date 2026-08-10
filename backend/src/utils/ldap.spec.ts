import { escapeLdapFilterValue, isLdapSimulationEnabled } from './ldap';

describe('escapeLdapFilterValue', () => {
  it('deja intacto un correo corporativo normal', () => {
    expect(escapeLdapFilterValue('daniel.sanchez@empresa.cl')).toBe('daniel.sanchez@empresa.cl');
  });

  it('neutraliza el comodín que convertiría la búsqueda puntual en masiva', () => {
    expect(escapeLdapFilterValue('*')).toBe('\\2a');
  });

  it('impide cerrar y reabrir el filtro para inyectar condiciones (regresión ISS-024)', () => {
    const injected = escapeLdapFilterValue('*)(objectClass=*');

    expect(injected).toBe('\\2a\\29\\28objectClass=\\2a');
    // Ningún paréntesis ni comodín sobrevive sin escapar dentro del filtro resultante.
    expect(injected).not.toMatch(/[()*]/);
  });

  it('escapa la barra invertida y el carácter nulo', () => {
    expect(escapeLdapFilterValue('a\\b')).toBe('a\\5cb');
    expect(escapeLdapFilterValue('a\0b')).toBe('a\\00b');
  });
});

describe('isLdapSimulationEnabled', () => {
  const originalSimulation = process.env.LDAP_SIMULATION_ENABLED;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.LDAP_SIMULATION_ENABLED = originalSimulation;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('está desactivada cuando no se declara la variable (regresión ISS-024)', () => {
    delete process.env.LDAP_SIMULATION_ENABLED;
    process.env.NODE_ENV = 'development';

    expect(isLdapSimulationEnabled()).toBe(false);
  });

  it('se habilita solo con la activación explícita fuera de producción', () => {
    process.env.LDAP_SIMULATION_ENABLED = 'true';
    process.env.NODE_ENV = 'development';

    expect(isLdapSimulationEnabled()).toBe(true);
  });

  it('nunca se habilita en producción, aunque esté declarada', () => {
    process.env.LDAP_SIMULATION_ENABLED = 'true';
    process.env.NODE_ENV = 'production';

    expect(isLdapSimulationEnabled()).toBe(false);
  });
});
