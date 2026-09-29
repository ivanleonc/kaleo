import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/login' }),
}))

// jsdom no implementa matchMedia y useTheme lo consulta en el mount.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../App.vue'

describe('App', () => {
  it('mounts renders properly', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        stubs: {
          RouterView: true
        }
      }
    })
    expect(wrapper.exists()).toBe(true)
  })
})
