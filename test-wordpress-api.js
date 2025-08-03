/**
 * Test WordPress API Connection
 */

const fetch = require('node-fetch');

const config = {
  siteUrl: 'https://m8chaa.mycafe24.com',
  apiBase: '/wp-json/wp/v2',
  username: 'm8chaa',
  password: '0gs8 Ydya LfhD 1twc 6RM1 4o7f' // Application password
};

// Create auth header
function getAuthHeader() {
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  return `Basic ${credentials}`;
}

async function testConnection() {
  console.log('🔍 Testing WordPress connection...');
  
  try {
    // Test authentication
    const response = await fetch(`${config.siteUrl}${config.apiBase}/users/me`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('✅ Connection successful! User:', userData.name);
      console.log('📧 Email:', userData.email);
      console.log('🆔 User ID:', userData.id);
      return true;
    } else {
      console.error('❌ Connection failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return false;
  }
}

async function createTestPost() {
  console.log('\n📝 Creating test post...');
  
  const postData = {
    title: 'Test Post from Node.js - ' + new Date().toLocaleString('ko-KR'),
    content: '<p>This is a test post created via WordPress REST API.</p><p>Current time: ' + new Date().toISOString() + '</p>',
    status: 'draft', // Start as draft for safety
    categories: [1], // Uncategorized
    tags: []
  };
  
  try {
    const response = await fetch(`${config.siteUrl}${config.apiBase}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    if (response.ok) {
      const post = await response.json();
      console.log('✅ Post created successfully!');
      console.log('🆔 Post ID:', post.id);
      console.log('🔗 Post URL:', post.link);
      console.log('📊 Status:', post.status.rendered || post.status);
      return post;
    } else {
      console.error('❌ Failed to create post:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Post creation error:', error);
    return null;
  }
}

async function listRecentPosts() {
  console.log('\n📋 Listing recent posts...');
  
  try {
    const response = await fetch(`${config.siteUrl}${config.apiBase}/posts?per_page=5`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (response.ok) {
      const posts = await response.json();
      console.log(`✅ Found ${posts.length} recent posts:`);
      posts.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title.rendered} (ID: ${post.id}, Status: ${post.status})`);
      });
      return posts;
    } else {
      console.error('❌ Failed to list posts:', response.status, response.statusText);
      return [];
    }
  } catch (error) {
    console.error('❌ List posts error:', error);
    return [];
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting WordPress API tests...\n');
  
  // Test connection
  const connected = await testConnection();
  
  if (connected) {
    // List recent posts
    await listRecentPosts();
    
    // Create test post
    await createTestPost();
  }
  
  console.log('\n✅ Tests completed!');
}

// Check if fetch is available
if (typeof fetch === 'undefined') {
  console.error('❌ node-fetch is required. Please install it with: npm install node-fetch@2');
  process.exit(1);
}

runTests();