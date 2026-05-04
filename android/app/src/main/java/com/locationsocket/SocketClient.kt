package com.locationsocket

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URI

/**
 * Wrapper do cliente Socket.IO.
 * Gerencia conexão, reconexão automática e emissão do evento "change".
 */
class SocketClient(private val serverUrl: String) {

    companion object {
        private const val TAG = "SocketClient"
        private const val EVENT_CHANGE = "change"
        private const val EVENT_CONNECT = Socket.EVENT_CONNECT
        private const val EVENT_DISCONNECT = Socket.EVENT_DISCONNECT
        private const val EVENT_CONNECT_ERROR = Socket.EVENT_CONNECT_ERROR
    }

    private var socket: Socket? = null

    var onConnected: (() -> Unit)? = null
    var onDisconnected: (() -> Unit)? = null
    var onConnectError: ((String) -> Unit)? = null

    fun connect() {
        try {
            val options = IO.Options.builder()
                .setReconnection(true)
                .setReconnectionAttempts(Int.MAX_VALUE)
                .setReconnectionDelay(2000)
                .build()

            socket = IO.socket(URI.create(serverUrl), options)

            socket?.on(EVENT_CONNECT) {
                Log.i(TAG, "Socket connected")
                onConnected?.invoke()
            }

            socket?.on(EVENT_DISCONNECT) {
                Log.i(TAG, "Socket disconnected")
                onDisconnected?.invoke()
            }

            socket?.on(EVENT_CONNECT_ERROR) { args ->
                val msg = args.firstOrNull()?.toString() ?: "unknown error"
                Log.e(TAG, "Socket connect error: $msg")
                onConnectError?.invoke(msg)
            }

            socket?.connect()
            Log.i(TAG, "Connecting to $serverUrl")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create socket: ${e.message}")
            onConnectError?.invoke(e.message ?: "failed to connect")
        }
    }

    /**
     * Emite evento "change" com a localização atual do dispositivo.
     * Formato: { idDevice, latitude, longitude }
     */
    fun emitLocation(idDevice: String, latitude: Double, longitude: Double) {
        if (socket?.connected() != true) {
            Log.w(TAG, "Socket not connected — skipping emit")
            return
        }
        val payload = JSONObject().apply {
            put("idDevice", idDevice)
            put("latitude", latitude)
            put("longitude", longitude)
        }
        socket?.emit(EVENT_CHANGE, payload)
        Log.d(TAG, "Emitted change: $payload")
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        Log.i(TAG, "Socket disconnected and cleaned up")
    }

    fun isConnected(): Boolean = socket?.connected() == true
}
