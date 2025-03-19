import { renderHook, act } from '@testing-library/react';
import { useActivityBasedSessionRefresh } from '../use-activity-based-session-refresh';
import { refreshTokens } from '@/features/auth/actions/refresh-tokens';

// Mock refreshTokens function
jest.mock('@/features/auth/actions/refresh-tokens', () => ({
  refreshTokens: jest.fn().mockResolvedValue(undefined),
}));

describe('useActivityBasedSessionRefresh', () => {
  // Store original addEventListener and removeEventListener
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  // Mock event listeners storage
  let eventListeners: Array<{
    event: string;
    callback: EventListenerOrEventListenerObject;
    options: AddEventListenerOptions | boolean;
  }> = [];

  // Mock for setInterval/clearInterval
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  let intervalCallback: () => Promise<void>;
  let intervalId: NodeJS.Timeout;

  // Get reference to the mocked Date.now
  const mockedDateNow = Date.now as jest.Mock;
  const initialTime = 1620000000000; // Same as in jest.setup.tsx

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    eventListeners = [];

    // Mock window.addEventListener
    window.addEventListener = jest.fn((event, callback, options) => {
      eventListeners.push({
        event: event as string,
        callback,
        options: options as AddEventListenerOptions,
      });
    });

    // Mock window.removeEventListener
    window.removeEventListener = jest.fn();

    // Mock AbortController.abort (for cleanup)
    const mockAbort = jest.fn(() => {
      // Simulate what happens when abort is called - listeners with this signal would be removed
      eventListeners = [];
    });

    // Mock AbortController globally for the component
    global.AbortController = jest.fn().mockImplementation(() => ({
      signal: { aborted: false },
      abort: mockAbort,
    })) as unknown as typeof AbortController;

    // Mock setInterval/clearInterval
    setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation((callback, ms) => {
        intervalCallback = callback as () => Promise<void>;
        intervalId = 123 as unknown as NodeJS.Timeout; // Return a dummy timer ID
        return intervalId;
      });

    clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation();

    // Reset Date.now mock to return the initial time
    mockedDateNow.mockReturnValue(initialTime);
  });

  afterEach(() => {
    // Restore original functions
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('should add event listeners for user activity on mount', () => {
    // Render the hook
    renderHook(() => useActivityBasedSessionRefresh());

    // Check that event listeners were added for all expected events
    const expectedEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    expectedEvents.forEach((event) => {
      const listeners = eventListeners.filter((l) => l.event === event);
      expect(listeners.length).toBe(1);
      expect(listeners[0]?.options).toEqual(
        expect.objectContaining({ passive: true }),
      );
    });

    // Verify correct number of event listeners were added
    expect(window.addEventListener).toHaveBeenCalledTimes(
      expectedEvents.length,
    );
  });

  it('should refresh tokens periodically when user is active', async () => {
    // Render the hook with shorter refresh interval for testing
    const refreshIntervalMs = 1000;
    renderHook(() =>
      useActivityBasedSessionRefresh(2 * 60 * 1000, refreshIntervalMs),
    );

    // Verify setInterval was called with the right interval
    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      refreshIntervalMs,
    );

    // Simulate interval trigger - user should be considered active since lastActivity is now
    await act(async () => {
      await intervalCallback();
    });

    // Verify refreshTokens was called
    expect(refreshTokens).toHaveBeenCalledTimes(1);
  });

  it('should not refresh tokens when user is inactive', async () => {
    // Render the hook with custom timeout values
    const inactivityTimeoutMs = 5000;
    const refreshIntervalMs = 1000;
    renderHook(() =>
      useActivityBasedSessionRefresh(inactivityTimeoutMs, refreshIntervalMs),
    );

    // Advance time beyond the inactivity timeout
    const inactiveTime = initialTime + inactivityTimeoutMs + 1000;
    mockedDateNow.mockReturnValue(inactiveTime);

    // Simulate interval trigger
    await act(async () => {
      await intervalCallback();
    });

    // Verify refreshTokens was not called
    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it('should update last activity timestamp on user interaction', async () => {
    // Render the hook
    renderHook(() => useActivityBasedSessionRefresh());

    // Find mousedown event listener
    const mousedownListener = eventListeners.find(
      (l) => l.event === 'mousedown',
    );

    if (!mousedownListener) {
      throw new Error('No mousedown event listener was added');
    }

    // Advance time to simulate some time passing
    const futureTime = initialTime + 60000; // 1 minute later
    mockedDateNow.mockReturnValue(futureTime);

    // Simulate user activity by calling the event handler directly
    act(() => {
      // We need to handle both function and object event listeners
      if (typeof mousedownListener.callback === 'function') {
        mousedownListener.callback(new Event('mousedown'));
      } else {
        mousedownListener.callback.handleEvent(new Event('mousedown'));
      }
    });

    // Trigger the interval callback
    await act(async () => {
      await intervalCallback();
    });

    // Refresh should happen because user was active recently
    expect(refreshTokens).toHaveBeenCalled();
  });

  it('should clean up event listeners and intervals on unmount', () => {
    // Render the hook
    const { unmount } = renderHook(() => useActivityBasedSessionRefresh());

    // Unmount the component
    unmount();

    // Verify interval was cleared
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);

    // The AbortController.abort should have been called during cleanup
    // We've mocked it to clear the eventListeners array
    expect(eventListeners.length).toBe(0);
  });

  it('should use the provided inactivity timeout and refresh interval', async () => {
    // Define custom values
    const customInactivityTimeout = 10000; // 10 seconds
    const customRefreshInterval = 5000; // 5 seconds

    // Render hook with custom values
    renderHook(() =>
      useActivityBasedSessionRefresh(
        customInactivityTimeout,
        customRefreshInterval,
      ),
    );

    // Verify setInterval was called with the custom refresh interval
    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      customRefreshInterval,
    );

    // Test with time within inactivity window
    mockedDateNow.mockReturnValue(initialTime + customInactivityTimeout - 1000);

    // Simulate interval trigger
    await act(async () => {
      await intervalCallback();
    });

    // Refresh should happen because we're within the custom inactivity window
    expect(refreshTokens).toHaveBeenCalledTimes(1);

    // Reset mock
    jest.clearAllMocks();

    // Test with time outside inactivity window
    mockedDateNow.mockReturnValue(initialTime + customInactivityTimeout + 1000);

    // Simulate interval trigger again
    await act(async () => {
      await intervalCallback();
    });

    // Refresh should not happen because we're outside the custom inactivity window
    expect(refreshTokens).not.toHaveBeenCalled();
  });
});
