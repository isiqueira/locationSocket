package com.locationsocket

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.locationsocket.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Preenche com o valor atual
        binding.etServerUrl.setText(loadServerUrl())

        binding.btnSaveSettings.setOnClickListener {
            val url = binding.etServerUrl.text?.toString()?.trim()
            if (url.isNullOrBlank()) {
                Toast.makeText(this, getString(R.string.error_server_url_empty), Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            saveServerUrl(url)
            Toast.makeText(this, "Salvo!", Toast.LENGTH_SHORT).show()
            finish()
        }

        binding.btnResetDefault.setOnClickListener {
            val default = getString(R.string.default_server_url)
            binding.etServerUrl.setText(default)
            saveServerUrl(default)
            Toast.makeText(this, "Restaurado para $default", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadServerUrl(): String {
        val prefs = getSharedPreferences(getString(R.string.pref_file), Context.MODE_PRIVATE)
        return prefs.getString(getString(R.string.pref_server_url), getString(R.string.default_server_url))
            ?: getString(R.string.default_server_url)
    }

    private fun saveServerUrl(url: String) {
        val prefs = getSharedPreferences(getString(R.string.pref_file), Context.MODE_PRIVATE)
        prefs.edit().putString(getString(R.string.pref_server_url), url).apply()
    }
}
