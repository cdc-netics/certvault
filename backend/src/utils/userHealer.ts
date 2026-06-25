import mongoose from 'mongoose';
import { User } from '../models/User';
import { Certification } from '../models/Certification';

/**
 * Escanea y asocia de nuevo las certificaciones huérfanas con usuarios activos.
 * Esto corrige las inconsistencias creadas por el bug del índice TTL de MongoDB que borraba usuarios.
 */
export const healOrphanedCertifications = async (): Promise<void> => {
  try {
    // 1. Cargar todas las certificaciones registradas
    const certifications = await Certification.find({});
    let healedCount = 0;

    for (const cert of certifications) {
      let userExists = null;

      try {
        if (cert.employeeId) {
          // Intentar verificar la existencia del usuario asociado en la base de datos
          userExists = await User.findById(cert.employeeId);
        }
      } catch (castError) {
        // Ignorar excepciones de conversión de tipos de datos en caso de IDs corruptos o texto plano
      }

      // Si el usuario no existe, se considera una certificación huérfana
      if (!userExists) {
        const employeeNameTrimmed = cert.employeeName ? cert.employeeName.trim() : '';
        const nameParts = employeeNameTrimmed.split(/\s+/);

        if (nameParts.length >= 2) {
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');

          // Intentar buscar coincidencia del nuevo usuario en base a nombre completo y departamento
          const matchingUser = await User.findOne({
            firstName: { $regex: new RegExp('^' + firstName + '$', 'i') },
            lastName: { $regex: new RegExp('^' + lastName + '$', 'i') },
            department: cert.department
          });

          if (matchingUser) {
            // Re-asociar la certificación al identificador único del nuevo usuario
            cert.employeeId = matchingUser._id as mongoose.Types.ObjectId;
            await cert.save();
            healedCount++;
            console.log(
              `[UserHealer] Certificación "${cert.title}" re-asociada al usuario curado "${matchingUser.fullName}"`
            );
          }
        }
      }
    }

    if (healedCount > 0) {
      console.log(`[UserHealer] Se recuperaron e integraron ${healedCount} certificaciones huérfanas.`);
    }
  } catch (error) {
    console.error('[UserHealer] Fallo durante la ejecución de la rutina de auto-curación:', error);
  }
};
