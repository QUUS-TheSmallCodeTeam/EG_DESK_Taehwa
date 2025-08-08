import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      // Inject environment variables at build time
      'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
      'process.env.ANTHROPIC_API_KEY': JSON.stringify(process.env.ANTHROPIC_API_KEY),
      'process.env.GOOGLE_API_KEY': JSON.stringify(process.env.GOOGLE_API_KEY),
      'process.env.WORDPRESS_USERNAME': JSON.stringify(process.env.WORDPRESS_USERNAME),
      'process.env.WORDPRESS_APP_PASSWORD': JSON.stringify(process.env.WORDPRESS_APP_PASSWORD)
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.js')
        },
        external: [
          // LangChain modules
          'langchain',
          '@langchain/core',
          '@langchain/openai', 
          '@langchain/google-genai',
          '@langchain/anthropic',
          '@langchain/core/messages',
          '@langchain/core/prompts',
          '@langchain/core/output_parsers',
          '@langchain/core/runnables',
          '@langchain/core/callbacks/manager',
          '@langchain/core/language_models/base',
          '@langchain/core/language_models/chat_models',
          // Node.js built-ins and other externals
          'electron',
          'fs',
          'path',
          'os',
          'crypto',
          'buffer',
          'stream',
          'events',
          'util',
          'url',
          'querystring',
          'http',
          'https',
          'net',
          'tls',
          'zlib'
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/preload.js')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    publicDir: resolve(__dirname, 'static')
  }
})