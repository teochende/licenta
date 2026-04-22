package com.example.hrdatabase.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(AiCvReviewProperties.class)
public class AiCvReviewConfig {

    @Bean
    public RestClient aiCvReviewRestClient(AiCvReviewProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) props.getConnectTimeout().toMillis());
        factory.setReadTimeout((int) props.getReadTimeout().toMillis());
        return RestClient.builder()
                .baseUrl(props.getBaseUrl().replaceAll("/+$", ""))
                .requestFactory(factory)
                .build();
    }
}
