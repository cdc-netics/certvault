import { User } from '../models/User';
import { SecuritySettings } from '../models/SecuritySettings';
import { Certification } from '../models/Certification';
import { sendPasswordExpirationWarningEmail, sendCertificateExpirationWarningEmail } from './emailService';

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

// Función para revisar de forma asíncrona el vencimiento de certificados de los usuarios
export const checkCertificateExpirationAlerts = async (): Promise<void> => {
  try {
    const settings = await SecuritySettings.findOne().sort({ updatedAt: -1 });
    // Si la opción no está explícitamente desactivada, se asume habilitada por defecto
    const alertsEnabled = settings ? settings.certificateExpirationAlertsEnabled : true;
    if (!alertsEnabled) {
      console.log('[Cron] Alertas de expiración de certificados desactivadas globalmente.');
      return;
    }

    const certifications = await Certification.find({
      expirationDate: { $exists: true, $ne: null }
    });

    const today = new Date();
    // Ajustar a medianoche para evitar desfases de horas/zonas horarias
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    console.log(`[Cron] Evaluando vencimiento de certificados para ${certifications.length} registros...`);

    const alertDays = [60, 30, 15, 3];

    for (const cert of certifications) {
      if (!cert.expirationDate) continue;

      const expirationDate = new Date(cert.expirationDate);
      const expirationDateZero = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());

      const timeDiff = expirationDateZero.getTime() - todayZero.getTime();
      const daysRemaining = Math.round(timeDiff / (1000 * 60 * 60 * 24));

      if (alertDays.includes(daysRemaining)) {
        try {
          const user = await User.findById(cert.employeeId);
          if (user && user.isActive) {
            console.log(`[Cron] Enviando alerta de vencimiento (${daysRemaining} días restantes) a ${user.email} para "${cert.title}"`);
            await sendCertificateExpirationWarningEmail({
              to: user.email,
              name: `${user.firstName} ${user.lastName}`,
              certificateTitle: cert.title,
              daysRemaining,
              expirationDate: cert.expirationDate
            });
          }
        } catch (emailError) {
          console.error(`[Cron] Error enviando alerta de vencimiento a ${cert.employeeId} para "${cert.title}":`, emailError);
        }
      }
    }
    console.log('[Cron] Evaluación de vencimiento de certificados finalizada.');
  } catch (error) {
    console.error('[Cron] Error evaluando vencimiento de certificados:', error);
  }
};

// Configura y arranca todos los servicios recurrentes evaluando cada 24 horas
export const startCronServices = (): void => {
  console.log('[Cron] Configurando servicios diarios de control de vencimientos y claves...');
  
  // Ejecutar inmediatamente al arrancar el servidor
  void checkPasswordExpirationAlerts();
  void checkCertificateExpirationAlerts();

  // Programar evaluación recurrente cada 24 horas
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    void checkPasswordExpirationAlerts();
    void checkCertificateExpirationAlerts();
  }, TWENTY_FOUR_HOURS_MS);
};
