package com.medlift.analyzer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MedliftApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedliftApplication.class, args);
    }
}
