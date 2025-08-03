/**
 * WordPress Blog Post Upload Test
 * For self-hosted WordPress site: m8chaa.mycafe24.com
 */

// WordPress REST API endpoint for creating posts
const WORDPRESS_API_URL = 'https://m8chaa.mycafe24.com/wp-json/wp/v2/posts';

// Test post data
const testPost = {
  title: 'test title',
  content: 'test content',
  status: 'draft', // Start as draft for safety
  excerpt: 'Test post created via WordPress REST API'
};

/**
 * Create a blog post using WordPress REST API
 * Note: You'll need to provide your WordPress credentials
 */
async function createWordPressPost(username, password) {
  try {
    console.log('Attempting to create blog post...');
    console.log('Site:', 'm8chaa.mycafe24.com');
    console.log('Title:', testPost.title);
    console.log('Content:', testPost.content);
    
    const response = await fetch(WORDPRESS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(username + ':' + password)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPost)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP Error:', response.status, response.statusText);
      console.error('Error details:', errorText);
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check your username and password.');
      } else if (response.status === 403) {
        throw new Error('Insufficient permissions. Make sure your user has permission to create posts.');
      } else {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    }

    const result = await response.json();
    console.log('✅ Post created successfully!');
    console.log('Post ID:', result.id);
    console.log('Post URL:', result.link);
    console.log('Status:', result.status);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to create post:', error.message);
    throw error;
  }
}

/**
 * Test the WordPress API connection
 */
async function testWordPressConnection() {
  try {
    console.log('Testing WordPress API connection...');
    
    const response = await fetch('https://m8chaa.mycafe24.com/wp-json');
    
    if (response.ok) {
      const siteInfo = await response.json();
      console.log('✅ WordPress API is accessible');
      console.log('Site name:', siteInfo.name);
      console.log('API version:', siteInfo.namespaces?.includes('wp/v2') ? 'v2 available' : 'v2 not available');
      return true;
    } else {
      console.error('❌ WordPress API not accessible');
      console.error('Status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

/**
 * Main function to run the test
 */
async function runTest() {
  console.log('🚀 WordPress Blog Post Upload Test');
  console.log('=====================================');
  
  // Test connection first
  const isConnected = await testWordPressConnection();
  if (!isConnected) {
    console.log('Cannot proceed without API access');
    return;
  }
  
  console.log('\n📝 To create the blog post, you need to provide your WordPress credentials.');
  console.log('You can either:');
  console.log('1. Use your WordPress username and password (less secure)');
  console.log('2. Create an Application Password (recommended)');
  console.log('\nTo create an Application Password:');
  console.log('1. Go to your WordPress admin panel');
  console.log('2. Navigate to Users → Profile');
  console.log('3. Scroll down to "Application Passwords"');
  console.log('4. Create a new application password');
  console.log('5. Use your username and the generated password');
  
  console.log('\n⚠️  For security, please run this script with your actual credentials:');
  console.log('createWordPressPost("your_username", "your_password_or_app_password");');
}

// Run the test
runTest();

// Export the function for manual use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createWordPressPost, testWordPressConnection };
} 