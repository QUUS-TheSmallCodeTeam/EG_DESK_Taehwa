import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
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