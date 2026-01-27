const fs = require('fs');
const path = require('path');

// Copy the existing .env file from Front Range Pool Hub
const sourceEnvPath = path.join(__dirname, '..', 'Front-Range-Pool-Hub', 'backend', 'config.env');
const targetEnvPath = path.join(__dirname, 'backend', '.env');

try {
    // Read the existing config.env file
    const envContent = fs.readFileSync(sourceEnvPath, 'utf8');
    
    // Modify the port to avoid conflicts (use 5001 instead of 5000)
    const modifiedContent = envContent.replace('PORT=5000', 'PORT=5001');
    
    // Add USA Pool League specific settings
    const additionalSettings = `
# USA Pool League Dues Tracker Settings
ADMIN_EMAIL=admin@yourleague.com
ADMIN_PASSWORD=admin123
`;
    
    // Write the new .env file
    fs.writeFileSync(targetEnvPath, modifiedContent + additionalSettings);
    
    console.log('✅ Environment file created successfully!');
    console.log('📁 Location:', targetEnvPath);
    console.log('🔧 Port changed to 5001 to avoid conflicts with Front Range Pool Hub');
    console.log('🔑 Default admin credentials:');
    console.log('   Email: admin@yourleague.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('Next steps:');
    console.log('1. cd backend');
    console.log('2. npm install');
    console.log('3. npm start');
    console.log('4. Open frontend/index.html in your browser');
    
} catch (error) {
    console.error('❌ Error setting up environment file:', error.message);
    console.log('');
    console.log('Manual setup:');
    console.log('1. Copy Front-Range-Pool-Hub/backend/config.env to USA-Pool-League-Dues-Tracker/backend/.env');
    console.log('2. Change PORT=5000 to PORT=5001 in the .env file');
    console.log('3. Add these lines to the .env file:');
    console.log('   ADMIN_EMAIL=admin@yourleague.com');
    console.log('   ADMIN_PASSWORD=admin123');
}
