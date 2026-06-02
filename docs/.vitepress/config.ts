import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'OmniTracker',
  description: 'Modern, Modular Visitor Analytics & Session Replay SDK',
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
        ]
      },
      {
        text: 'SDK Reference',
        items: [
          { text: 'Client Core SDK', link: '/guide/client-sdk' },
          { text: 'Backend Server SDK', link: '/guide/server-sdk' },
        ]
      },
      {
        text: 'Advanced Guides',
        items: [
          { text: 'Custom Storage Adapters', link: '/guide/custom-adapters' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/dev-sujay/omni-tracker' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Sujay'
    }
  }
});
