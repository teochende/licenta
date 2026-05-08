package com.example.hrdatabase.service;

import com.example.hrdatabase.config.AiCvReviewProperties;
import com.example.hrdatabase.dto.ai.AiEnglishVideoApiResponse;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Client HTTP multipart către modulul FastAPI {@code POST /analyze-video}.
 */
@Service
public class AiEnglishVideoReviewClientService {

    private static final Logger log = LoggerFactory.getLogger(AiEnglishVideoReviewClientService.class);

    private final RestTemplate aiEnglishVideoRestTemplate;
    private final AiCvReviewProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public AiEnglishVideoReviewClientService(
            RestTemplate aiEnglishVideoRestTemplate,
            AiCvReviewProperties properties) {
        this.aiEnglishVideoRestTemplate = aiEnglishVideoRestTemplate;
        this.properties = properties;
    }

    /**
     * Trimite bytes videoclip către modulul AI; întoarce răspunsul parsat sau gol la eșec.
     */
    public Optional<AiEnglishVideoApiResponse> analyzeVideo(byte[] videoBytes, String originalFilename) {
        if (videoBytes == null || videoBytes.length == 0) {
            return Optional.empty();
        }
        String base = properties.getBaseUrl().replaceAll("/+$", "");
        String url = base + "/analyze-video";
        String name = originalFilename != null && !originalFilename.isBlank() ? originalFilename : "video.mp4";

        ByteArrayResource resource = new ByteArrayResource(videoBytes) {
            @Override
            public String getFilename() {
                return name;
            }
        };

        /*
         * NU setăm Content-Type manual pe multipart/form-data: fără boundary, FastAPI / Starlette
         * respinge corpul și analiza eșuează. Lasă FormHttpMessageConverter să pună
         * multipart/form-data; boundary=...
         */
        HttpHeaders headers = new HttpHeaders();
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("video_file", resource);
        HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response =
                    aiEnglishVideoRestTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn(
                        "analyze-video HTTP {} body={}",
                        response.getStatusCode(),
                        truncate(response.getBody(), 1500));
                return Optional.empty();
            }
            String json = response.getBody();
            if (json == null || json.isBlank()) {
                log.warn("analyze-video: răspuns gol");
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, AiEnglishVideoApiResponse.class));
        } catch (HttpStatusCodeException e) {
            log.warn(
                    "analyze-video HTTP {}: {}",
                    e.getStatusCode(),
                    truncate(e.getResponseBodyAsString(), 2000));
            return Optional.empty();
        } catch (RestClientException e) {
            log.warn("analyze-video conexiune/eșec client: {}", e.getMessage(), e);
            return Optional.empty();
        } catch (IOException e) {
            log.warn("analyze-video JSON invalid: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, max) + "…";
    }

    public Optional<AiEnglishVideoApiResponse> analyzeVideoFromPath(Path path, String originalFilename)
            throws IOException {
        byte[] bytes = Files.readAllBytes(path);
        return analyzeVideo(bytes, originalFilename);
    }
}
