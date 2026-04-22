// Forzar ambiente de test
process.env.NODE_ENV = 'test';

// Variables de entorno para tests
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_USERNAME = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'bag_rental_test';

console.log('🧪 Jest running in TEST mode - Using Docker database');
