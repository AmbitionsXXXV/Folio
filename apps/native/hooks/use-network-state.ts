/**
 * Network State Hook
 *
 * Provides network connectivity state and automatic offline mode handling.
 * Uses expo-network for cross-platform network state monitoring.
 */

import * as Network from "expo-network"
import { useEffect, useState } from "react"

export interface NetworkState {
  /**
   * Whether the connection is using cellular data
   */
  isCellular: boolean
  /**
   * Whether the device is connected to the internet
   */
  isConnected: boolean
  /**
   * Whether the network state is still being determined
   */
  isLoading: boolean
  /**
   * Whether the connection is using WiFi
   */
  isWifi: boolean
  /**
   * Connection type (wifi, cellular, none, etc.)
   */
  type: Network.NetworkStateType
}

/**
 * Hook to monitor network connectivity state
 */
export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isConnected: true,
    isCellular: false,
    isWifi: false,
    type: Network.NetworkStateType.UNKNOWN,
    isLoading: true
  })

  useEffect(() => {
    const fetchNetworkState = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync()
        setState({
          isConnected: networkState.isConnected ?? false,
          isCellular: networkState.type === Network.NetworkStateType.CELLULAR,
          isWifi: networkState.type === Network.NetworkStateType.WIFI,
          type: networkState.type ?? Network.NetworkStateType.UNKNOWN,
          isLoading: false
        })
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    // Get initial state
    fetchNetworkState()

    // Poll for changes (expo-network doesn't have a subscription API)
    const intervalId = setInterval(fetchNetworkState, 5000)

    return () => clearInterval(intervalId)
  }, [])

  return state
}

/**
 * Hook that returns just the connection status
 */
export function useIsOnline(): boolean {
  const { isConnected, isLoading } = useNetworkState()
  // Assume online while loading
  return isLoading ? true : isConnected
}
