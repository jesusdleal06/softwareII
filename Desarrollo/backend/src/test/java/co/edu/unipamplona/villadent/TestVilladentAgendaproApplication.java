package co.edu.unipamplona.villadent;

import org.springframework.boot.SpringApplication;

public class TestVilladentAgendaproApplication {

	public static void main(String[] args) {
		SpringApplication.from(VilladentAgendaproApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
