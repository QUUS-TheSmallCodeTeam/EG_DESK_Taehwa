/**
 * Test WordPress post creation with provided credentials
 */

const WORDPRESS_API_URL = 'https://m8chaa.mycafe24.com/wp-json/wp/v2/posts';

// Test post data
const testPost = {
  title: 'test title',
  content: 'test content',
  status: 'draft', // Start as draft for safety
  excerpt: 'Test post created via WordPress REST API'
};

// Test credentials
const credentials = {
  username: 'm8chaa',
  password: '0gs8 Ydya LfhD 1twc 6RM1 4o7f'
};

async function createWordPressPost() {
  try {
    console.log('🚀 Attempting to create blog post...');
    console.log('Site:', 'm8chaa.mycafe24.com');
    console.log('Title:', testPost.title);
    console.log('Content:', testPost.content);
    console.log('Username:', credentials.username);
    
    const response = await fetch(WORDPRESS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(credentials.username + ':' + credentials.password)}`,
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
    console.log('Title:', result.title.rendered);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to create post:', error.message);
    throw error;
  }
}

// Run the test
createWordPressPost().catch(console.error); 