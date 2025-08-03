/**
 * Test with regular WordPress password
 * Note: This is less secure, only for testing
 */

console.log('🔐 Testing with regular WordPress password...');
console.log('Please provide your regular WordPress password to test if the issue is with Application Passwords.');
console.log('If this works, we know the Application Password setup is the problem.');
console.log('If this fails, the issue is with the username or basic authentication.');

// You can uncomment and modify this section to test with your regular password
/*
const credentials = {
  username: 'm8chaa',
  password: 'YOUR_REGULAR_PASSWORD_HERE' // Replace with your actual password
};

async function testWithRegularPassword() {
  try {
    console.log('Testing authentication...');
    
    const response = await fetch('https://m8chaa.mycafe24.com/wp-json/wp/v2/users/me', {
      headers: {
        'Authorization': `Basic ${btoa(credentials.username + ':' + credentials.password)}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const userInfo = await response.json();
      console.log('✅ Authentication successful with regular password!');
      console.log('User:', userInfo.name);
      console.log('This means the Application Password setup is the issue.');
    } else {
      console.log('❌ Authentication failed with regular password too.');
      console.log('This means there might be an issue with the username or basic auth setup.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWithRegularPassword();
*/ 