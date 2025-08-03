/**
 * Test WordPress authentication
 */

const credentials = {
  username: 'm8chaa',
  password: '0gs8 Ydya LfhD 1twc 6RM1 4o7f'
};

async function testAuthentication() {
  try {
    console.log('🔐 Testing WordPress authentication...');
    console.log('Username:', credentials.username);
    
    // Test basic API access first
    console.log('\n1. Testing basic API access...');
    const basicResponse = await fetch('https://m8chaa.mycafe24.com/wp-json');
    if (basicResponse.ok) {
      const siteInfo = await basicResponse.json();
      console.log('✅ Basic API access: OK');
      console.log('Site name:', siteInfo.name);
    } else {
      console.log('❌ Basic API access failed');
    }
    
    // Test authenticated user info
    console.log('\n2. Testing authenticated user info...');
    const userResponse = await fetch('https://m8chaa.mycafe24.com/wp-json/wp/v2/users/me', {
      headers: {
        'Authorization': `Basic ${btoa(credentials.username + ':' + credentials.password)}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (userResponse.ok) {
      const userInfo = await userResponse.json();
      console.log('✅ Authentication successful!');
      console.log('User ID:', userInfo.id);
      console.log('User name:', userInfo.name);
      console.log('User roles:', userInfo.roles);
      console.log('Capabilities:', userInfo.capabilities);
    } else {
      const errorText = await userResponse.text();
      console.log('❌ Authentication failed');
      console.log('Status:', userResponse.status);
      console.log('Error:', errorText);
    }
    
    // Test if user can create posts
    console.log('\n3. Testing post creation permissions...');
    const testPost = {
      title: 'Test Permission Check',
      content: 'This is a test to check permissions',
      status: 'draft'
    };
    
    const postResponse = await fetch('https://m8chaa.mycafe24.com/wp-json/wp/v2/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(credentials.username + ':' + credentials.password)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPost)
    });
    
    if (postResponse.ok) {
      const postResult = await postResponse.json();
      console.log('✅ Post creation successful!');
      console.log('Post ID:', postResult.id);
    } else {
      const errorText = await postResponse.text();
      console.log('❌ Post creation failed');
      console.log('Status:', postResponse.status);
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthentication(); 