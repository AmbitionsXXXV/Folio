import "@testing-library/dom"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vite-plus/test"

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia (required by some UI components)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock clipboard API
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: vi.fn().mockResolvedValue(),
    readText: vi.fn().mockResolvedValue("")
  },
  writable: true
})

// Mock ResizeObserver with proper implementation for recharts
class MockResizeObserver implements ResizeObserver {
  observe(): void {
    // Intentionally empty for mock
  }
  unobserve(): void {
    // Intentionally empty for mock
  }
  disconnect(): void {
    // Intentionally empty for mock
  }
}
global.ResizeObserver = MockResizeObserver

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock getBoundingClientRect for recharts
Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
  width: 300,
  height: 200,
  top: 0,
  left: 0,
  bottom: 200,
  right: 300,
  x: 0,
  y: 0,
  toJSON: vi.fn()
})
