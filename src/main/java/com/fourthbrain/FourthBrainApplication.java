package com.fourthbrain;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FourthBrainApplication {

    public static void main(String[] args) {
        SpringApplication.run(FourthBrainApplication.class, args);
    }
}
