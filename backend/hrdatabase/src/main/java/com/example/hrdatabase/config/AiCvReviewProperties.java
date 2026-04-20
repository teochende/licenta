package com.example.hrdatabase.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "ai.cv.review")
public class AiCvReviewProperties {

    /**
     * Dacă este false, nu se apelează modulul Python (scorul AI rămâne necompletat).
     */
    private boolean enabled = true;

    /**
     * URL de bază al serviciului FastAPI (ex. http://127.0.0.1:8000).
     */
    private String baseUrl = "http://127.0.0.1:8000";

    private Duration connectTimeout = Duration.ofSeconds(15);
    private Duration readTimeout = Duration.ofMinutes(2);

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public Duration getConnectTimeout() {
        return connectTimeout;
    }

    public void setConnectTimeout(Duration connectTimeout) {
        this.connectTimeout = connectTimeout;
    }

    public Duration getReadTimeout() {
        return readTimeout;
    }

    public void setReadTimeout(Duration readTimeout) {
        this.readTimeout = readTimeout;
    }
}
