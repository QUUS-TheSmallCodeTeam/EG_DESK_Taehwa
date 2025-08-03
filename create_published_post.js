/**
 * Create a published WordPress blog post
 */

const WORDPRESS_API_URL = 'https://m8chaa.mycafe24.com/wp-json/wp/v2/posts';

// Test post data - PUBLISHED
const testPost = {
  title: 'test title - PUBLISHED',
  content: 'test content - This post is published immediately',
  status: 'publish', // PUBLISHED instead of draft
  excerpt: 'Test post created via WordPress REST API - Published'
};

// Test credentials
const credentials = {
  username: 'm8chaa',
  password: '0gs8 Ydya LfhD 1twc 6RM1 4o7f'
};

async function createPublishedPost() {
  try {
    console.log('🚀 Creating PUBLISHED blog post...');
    console.log('Site:', 'm8chaa.mycafe24.com');
    console.log('Title:', testPost.title);
    console.log('Content:', testPost.content);
    console.log('Status:', testPost.status);
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
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Published post created successfully!');
    console.log('Post ID:', result.id);
    console.log('Post URL:', result.link);
    console.log('Status:', result.status);
    console.log('Title:', result.title.rendered);
    console.log('Published at:', result.date);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to create published post:', error.message);
    throw error;
  }
}

// Run the test
createPublishedPost().catch(console.error); 