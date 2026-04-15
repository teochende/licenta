package com.example.hrdatabase.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Simulare politică organizațională: conturile noi acceptă doar adrese din domeniul {@code hrsim.ro}.
 */
@Documented
@Constraint(validatedBy = HrsimEmailDomainValidator.class)
@Target({FIELD, PARAMETER})
@Retention(RUNTIME)
public @interface HrsimEmailDomain {

    String message() default "Emailul trebuie să aparțină domeniului @hrsim.ro";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
