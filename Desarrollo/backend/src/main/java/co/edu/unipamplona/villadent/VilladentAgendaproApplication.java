package co.edu.unipamplona.villadent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VilladentAgendaproApplication {

	public static void main(String[] args) {
		SpringApplication.run(VilladentAgendaproApplication.class, args);
	}

}
