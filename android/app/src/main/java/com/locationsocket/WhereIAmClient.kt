package com.locationsocket

import android.util.Log
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class CityResult(
    val name: String,
    val state: String,
    val externalId: Long?,
    val geometryJson: String?
)

/**
 * Cliente HTTP para GET /where-i-am?lat=&lng=
 * Chama o backend de forma assíncrona e retorna o resultado via callback.
 */
class WhereIAmClient(private val serverUrl: String) {

    companion object {
        private const val TAG = "WhereIAmClient"
    }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    /**
     * Consulta a cidade correspondente às coordenadas.
     * @param onResult chamado na thread de I/O com o resultado (pode ser null se fora de área)
     * @param onError chamado em caso de falha de rede ou parsing
     */
    fun fetchCity(
        latitude: Double,
        longitude: Double,
        onResult: (CityResult?) -> Unit,
        onError: (String) -> Unit
    ) {
        val url = "$serverUrl/where-i-am?lat=$latitude&lng=$longitude"
        val request = Request.Builder().url(url).build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "HTTP request failed: ${e.message}")
                onError(e.message ?: "network error")
            }

            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string()
                if (!response.isSuccessful || body.isNullOrBlank()) {
                    onResult(null)
                    return
                }
                try {
                    val json = JSONObject(body)
                    val city = CityResult(
                        name = json.optString("name", ""),
                        state = json.optString("state", ""),
                        externalId = if (json.has("externalId")) json.getLong("externalId") else null,
                        geometryJson = json.optJSONObject("geometry")?.toString()
                    )
                    Log.d(TAG, "City: ${city.name} / ${city.state}")
                    onResult(city)
                } catch (e: Exception) {
                    Log.e(TAG, "JSON parse error: ${e.message}")
                    onError("parse error: ${e.message}")
                }
            }
        })
    }
}
