import { User } from '../models/User';
import { SecuritySettings } from '../models/SecuritySettings';
import { sendPasswordExpirationWarningEmail } from './emailService';

// Función para revisar de forma asíncrona la expiración de contraseñas de todos los usuarios
export const checkPasswordExpirationAlerts = async (): Promise<void> => {
  try {
    const settings = await SecuritySettings.findOne().sort({ updatedAt: -1 });
    if (!settings || !settings.passwordExpirationEnabled) {
      return; // Expiración deshabilitada, omitir
    }

    const expirationMonths = settings.passwordExpirationMonths;
    const users = await User.find({ isActive: true });
    const today = new Date();

    console.log(`[Cron] Evaluando expiración de contraseñas para ${users.length} usuarios activos...`);

    for (const user of users) {
      // Usar fecha de cambio de clave, o en su defecto de creación del usuario
      const passwordDate = user.passwordChangedAt || user.createdAt;
      
      const expirationDate = new Date(passwordDate);
      expirationDate.setMonth(expirationDate.getMonth() + expirationMonths);

      // Calcular diferencia en días exactos
      const timeDiff = expirationDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      // Días específicos en los que se debe alertar
      const alertDays = [15, 10, 5, 3, 1];

      if (alertDays.includes(daysRemaining)) {
        try {
          console.log(`[Cron] Enviando alerta de expiración (${daysRemaining} días restantes) a ${user.email}`);
          await sendPasswordExpirationWarningEmail({
            to: user.email,
            name: `${user.firstName} ${user.lastName}`,
            daysRemaining
          });
        } catch (emailError) {
          console.error(`[Cron] Error enviando alerta de expiración a ${user.email}:`, emailError);
        }
      }
    }
    console.log('[Cron] Evaluación de expiración de contraseñas finalizada.');
  } catch (error) {
    console.error('[Cron] Error evaluando expiración de contraseñas:', error);
  }
};

// Configura y arranca el servicio recurrente para evaluar la expiración cada 24 horas
export const startPasswordExpirationCron = (): void => {
  console.log('[Cron] Configurando servicio diario de control de expiración de claves...');
  
  // Ejecutar inmediatamente al arrancar el servidor
  void checkPasswordExpirationAlerts();

  // Programar evaluación recurrente cada 24 horas
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    void checkPasswordExpirationAlerts();
  }, TWENTY_FOUR_HOURS_MS);
};
