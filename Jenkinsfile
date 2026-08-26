stage('Generate .env') {
    steps {
        echo "🔧 Generando .env desde credenciales y plantilla..."
        withCredentials([
            string(credentialsId: "${PROJECT_NAME}-mongo-password", variable: 'MONGO_PASSWORD'),
            string(credentialsId: "${PROJECT_NAME}-jwt-secret", variable: 'JWT_SECRET'),
            string(credentialsId: "${PROJECT_NAME}-admin-password", variable: 'ADMIN_PASSWORD'),
            string(credentialsId: "${PROJECT_NAME}-smtp-password", variable: 'SMTP_PASSWORD'),
            string(credentialsId: "${PROJECT_NAME}-smtp-encryption-key", variable: 'SMTP_ENCRYPTION_KEY')
        ]) {
            sh '''
                cp .env.example .env
                
                sed -i "s|MONGO_INITDB_ROOT_PASSWORD=.*|MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}|g" .env
                sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|g" .env
                sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASSWORD}|g" .env
                sed -i "s|SMTP_PASSWORD=.*|SMTP_PASSWORD=${SMTP_PASSWORD}|g" .env
                sed -i "s|SMTP_ENCRYPTION_KEY=.*|SMTP_ENCRYPTION_KEY=${SMTP_ENCRYPTION_KEY}|g" .env
                
                echo "✓ .env generado correctamente"
            '''
        }
    }
}