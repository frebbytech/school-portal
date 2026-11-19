import dayjs from "@/lib/dates";
import { object, number, mixed, string, array, ref } from "yup";

const phoneRegex = /^(\+\d{1,3})?\(?\d{3}\)?\d{3}\d{4}$/;

export const findSchoolValidationSchema = object().shape({
  code: string()
    .required("Required*")
    .min(6, "School Code should be 6 digit ")
    .max(6, "School Code should be 6 digit "),
});
export const loginUserValidationSchema = object().shape({
  username: string().required("Required*").trim(),
  password: string()
    .trim()
    .required("Required*")
    .min(8, "password should be between 8-20 characters"),
});
export const sessionValidationSchema = object().shape({
  name: string().trim().required("Required*"),
  from: string().required("Required*"),
  to: string()
    .required("Required*")
    .test(
      "is-after-start",
      "End of Academic Year date must be after or the same as the start of Academic Year",
      function (value) {
        const { from } = this.parent;
        return !from || !value || dayjs(value).isSameOrAfter(dayjs(from));
      }
    ),
  term: string().trim().required("Required*"),
  isPromotionTerm: string()
    .oneOf(["Yes", "No"], "Please select either 'Yes' or 'No'")
    .required("This field is required"),
});

export const levelValidationSchema = object().shape({
  level: string().required("Required*"),
  initials: string().nullable(true),
  // department: object({
  //   _id: string().required("Required*"),
  //   name: string().required("Required*"),
  // }).nullable(true),
});

export const AssignTeacherValidationSchema = object().shape({
  teacher: object({
    _id: string().required("Required*"),
    fullname: string().required("Required*"),
  }),
});
export const AssignTutorValidationSchema = object().shape({
  teacher: object({
    _id: string().required("Required*"),
    fullName: string().required("Required*"),
  }),
  level: object({
    _id: string().required("Required*"),
    levelName: string().required("Required*"),
  }),
});

export const currentLevelValidationSchema = object().shape({
  _id: string().required("Required*"),
  type: string().required("Required*"),
});
export const assignLevelValidationSchema = object().shape({
  currentLevel: object({
    _id: string().required("Required*"),
    type: string().required("Required*"),
  }),
  subject: object({
    _id: string().required("Required*"),
    name: string().required("Required*"),
  }),
});

export const studentValidationSchema = object().shape({
  firstname: string().required("Required*"),
  surname: string().required("Required*"),
  // dateofbirth: date()
  //   .required("Required*")
  //   .max(new Date(), "Date of birth cannot be in the future"),
  gender: string().required("Required*"),
  email: string().email("Invalid email address!!!"),
  phonenumber: string().matches(phoneRegex, "Invalid Phone number"),
  address: string().required("Required*"),
  residence: string().required("Required*"),
  nationality: string().required("Required*"),
  level: object({
    type: string().required("Required*"),
  }),
});

export const studentEditValidationSchema = object().shape({
  firstname: string().required("Required*"),
  surname: string().required("Required*"),
  othername: string().optional(),
  gender: string().required("Required*"),
  email: string().email("Invalid email address!!!"),
  phonenumber: string().matches(phoneRegex, "Invalid Phone number"),
  address: string().required("Required*"),
  residence: string().required("Required*"),
  nationality: string().required("Required*"),
  department: object({
    _id: string().required("Required*"),
    name: string().required("Required*"),
  }).optional(),
  house: object({
    _id: string().required("Required*"),
    name: string().required("Required*"),
  }).optional(),
  level: object({
    _id: string().required("Required*"),
    type: string().required("Required*"),
  }),
});

export const teacherValidationSchema = object().shape({
  firstname: string().required("Required*"),
  lastname: string().required("Required*"),
  username: string()
    .required("Required*")
    .min(3, "Username Should be between 3-20 characters")
    .max(20, "Username Should be between 3-20 characters"),
  // dateofbirth: date()
  //   .required("Required*")
  //   .max(new Date(), "Date of birth cannot be in the future"),
  gender: string().required("Required*"),
  email: string().email("Invalid email address!!!"),
  phonenumber: string()
    .required("Required*")
    .matches(phoneRegex, "Invalid Phone number"),
  address: string().required("Required*"),
  residence: string().required("Required*"),
  nationality: string().required("Required*"),
});

export const userValidationSchema = object().shape({
  firstname: string().required("Required*"),
  lastname: string().required("Required*"),
  username: string().required("Required*"),

  // dateofbirth: date()
  //   .required("Required*")
  //   .max(new Date(), "Date of birth cannot be in the future"),
  role: string().required("Required*"),
  gender: string().required("Required*"),
  email: string().email("Invalid email address!!!"),
  phonenumber: string()
    .required("Required*")
    .matches(phoneRegex, "Invalid Phone number"),
  address: string().required("Required*"),
  nationality: string().required("Required*"),
  residence: string().required("Required*"),
  password: string()
    .required("Required*")
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: string()
    .required("Required*")
    .min(8, "Password must be at least 8 characters")
    .oneOf([ref("password"), null], "Passwords do not match"),
});
export const userResetPasswordValidationSchema = object().shape({
  password: string()
    .required("Required*")
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: string()
    .required("Required*")
    .min(8, "Password must be at least 8 characters")
    .oneOf([ref("password"), null], "Passwords do not match"),
});
export const updateProfileValidationSchema = object().shape({
  firstname: string().required("Required*"),
  lastname: string().required("Required*"),
  fullname: string().required("Required*"),
  username: string().required("Required*"),
  email: string().email("Invalid email address!!!"),
  phonenumber: string()
    .required("Required*")
    .matches(phoneRegex, "Invalid Phone number"),
  password: string().min(8, "Password must be at least 8 characters"),
  confirmPassword: string().oneOf(
    [ref("password"), null],
    "Passwords do not match"
  ),
});

export const userEditValidationSchema = object().shape({
  firstname: string().required("Required*"),
  lastname: string().required("Required*"),
  username: string().required("Required*"),
  role: string().required("Required*"),
  gender: string().required("Required*"),
  email: string().email("Invalid email address!!!"),
  phonenumber: string()
    .required("Required*")
    .matches(phoneRegex, "Invalid Phone number"),
  address: string().required("Required*"),
  nationality: string().required("Required*"),
  residence: string().required("Required*"),
});

export const parentValidationSchema = object().shape({
  firstname: string().required("Required*"),
  surname: string().required("Required*"),
  gender: string().required("Required*"),
  email: string().email("Invalid email address!!!").optional(),
  phonenumber: string()
    .required("Required*")
    .matches(phoneRegex, "Invalid Phone number"),
  address: string().required("Required*"),
  residence: string().required("Required*"),
  nationality: string().required("Required*"),
});

export const feeValidationSchema = object().shape({
  level: object({
    _id: string().required("Required*"),
    type: string().required("Required*"),
  }),
  fee: array().required("Required*").min(1, "Fee list Cannot be empty"),
});

export const messageValidationSchema = object().shape({
  email: string().required("Required*").email("Invalid email address!!!"),
  phonenumber: string()
    .required("Required*")
    .matches(phoneRegex, "Invalid Phone number"),
  title: string().required("Required*"),
  message: string().required("Required*"),
});

export const onlyEmailValidationSchema = object().shape({
  email: string().required("Required*").email("Invalid email address!!!"),
  title: string().required("Required*"),
  message: string().required("Required*"),
});

export const onlyPhoneValidationSchema = object().shape({
  phonenumber: string()
    .required("Required*")
    .matches(phoneRegex, "Invalid Phone number"),
  title: string().required("Required*"),
  message: string().required("Required*"),
});

export const bulksmsValidationSchema = object().shape({
  title: string().required("Required*"),
  message: string().required("Required*"),
});

export const quickMessageValidationSchema = object().shape({
  title: string().required("Required*"),
  message: string().required("Required*"),
});

export const examsScoreValidationSchema = (c, e) =>
  object().shape({
    // subject: string().required('Subject is Required*').nullable(true),
    subject: object({
      _id: string().required("Required*"),
      name: string().required("Required*"),
    }),
    classScore: number()
      .required("Class Score is Required*")
      .min(0, `Class Score should be from 0 - ${c}`)
      .max(c || 50, `Class Score should be from 0 - ${c}`),
    examsScore: number()
      .required("Exams Score is Required*")
      .min(0, `Exams Score should be from 0 - ${e}`)
      .max(e || 50, `Exams Score should be from 0 - ${e}`),
  });

export const addExamsScoreValidationSchema = (c, e) =>
  object().shape({
    _id: string().required("Required*"),
    subject: string().required("Required*"),

    classScore: number()
      .required("Class Score is Required*")
      .min(0, `Class Score should be from 0 - ${c}`)
      .max(c || 50, `Class Score should be from 0 - ${c}`),
    examsScore: number()
      .required("Exams Score is Required*")
      .min(0, `Exams Score should be from 0 - ${e}`)
      .max(e || 50, `Exams Score should be from 0 - ${e}`),
  });

//Personal Data
export const studentPersonalDataValidationSchema = object().shape({
  indexnumber: string().required("Required*"),
  firstname: string().required("Required*"),
  surname: string().required("Required*"),
  gender: string().required("Required*"),
  email: string().email("Invalid email address!!!"),
  phonenumber: string().matches(phoneRegex, "Invalid Phone number"),
  address: string().required("Required*"),
  residence: string().required("Required*"),
  nationality: string().required("Required*"),
});

export const guardianValidationSchema = object().shape({
  parents: array().of(parentValidationSchema),
});

export const medicalValidationSchema = object().shape({
  emergencyContact: object({
    fullname: string().required("Required*"),
    phonenumber: string()
      .required("Required*")
      .matches(phoneRegex, "Invalid Phone number"),
    address: string().required("Required*"),
  }),
});

export const studentCurrentLevelValidationSchema = object().shape({
  level: object({
    _id: string().required("Required*"),
    type: string().required("Required*"),
  }),
});

export const newStudentValidationSchema = [
  object().shape({
    personal: object().shape({
      indexnumber: string().required("Required*"),
      firstname: string().required("Required*"),
      surname: string().required("Required*"),
      othername: string().optional(),
      dateofbirth: string().required("Required*"),
      gender: string().required("Required*"),
      email: string().email("Invalid email address!!!").optional(),
      phonenumber: string()
        .matches(phoneRegex, "Invalid Phone number")
        .optional(),
      address: string().required("Required*"),
      residence: string().required("Required*"),
      nationality: string().required("Required*"),
    }),
  }),
  object()
    .shape({
      photo: object()
        .shape({
          profile: mixed().nullable(),
          display: string().optional(),
        })
        .optional(),
    })
    .optional(),
  object().shape({
    parent: array().of(parentValidationSchema),
  }),
  object().shape({
    medical: object().shape({
      heartDisease: string()
        .oneOf(["Yes", "No"], "Please select either 'Yes' or 'No'")
        .required("This field is required"),
      visualImpairment: string()
        .oneOf(["Yes", "No"], "Please select either 'Yes' or 'No'")
        .required("This field is required"),
      asthma: string()
        .oneOf(["Yes", "No"], "Please select either 'Yes' or 'No'")
        .required("This field is required"),
      hearingImpairment: string()
        .oneOf(["Yes", "No"], "Please select either 'Yes' or 'No'")
        .required("This field is required"),
      seizures: string()
        .oneOf(["Yes", "No"], "Please select either 'Yes' or 'No'")
        .required("This field is required"),
      physicalDisability: string()
        .oneOf(["Yes", "No"], "Please select either 'Yes' or 'No'")
        .required("This field is required"),

      emergencyContact: object({
        fullname: string().required("Required*"),
        phonenumber: string()
          .required("Required*")
          .matches(phoneRegex, "Invalid Phone number"),
        address: string().required("Required*"),
      }),
    }),
  }),
  object().shape({
    academic: object()
      .shape({
        department: object({
          _id: string().required("Required*"),
          name: string().required("Required*"),
        }),
        house: object({
          _id: string().required("Required*"),
          name: string().required("Required*"),
        }),

        previousSchool: object({
          name: string().optional(),
          location: string().optional(),
          report: mixed().nullable(),
        }).optional(),

        level: object({
          _id: string().required("Required*"),
          type: string().required("Required*"),
        }),
      })
      .optional(),
  }),
];

export const gradesValidationSchema = object().shape({
  lowestMark: number()
    .required("Required*")
    .min(0, "Marks cannot be less than 0")
    .max(100, "Marks cannot be more than 100"),
  highestMark: number()
    .required("Required*")
    .min(0, "Marks cannot be less than 0")
    .max(100, "Marks cannot be more than 100"),
  grade: string().trim().required("Required*"),
  remarks: string().trim().required("Required*"),
});

export const eventValidationSchema = object().shape({
  type: string().trim().required("Required*"),
  title: string().trim().required("Required*"),
  description: string().trim().required("Required*"),
});

export const newSessionSchemas = [
  object().shape({
    core: object().shape({
      name: string().trim().required("Required*"),
      from: string().required("Required*"),
      to: string()
        .required("Required*")
        .test(
          "is-after-start",
          "End of Academic Year date must be after or the same as the start of Academic Year",
          function (value) {
            const { from } = this.parent;
            return !from || !value || dayjs(value).isSameOrAfter(dayjs(from));
          }
        ),
      term: string().trim().required("Required*"),
      isPromotionTerm: string()
        .oneOf(["Yes", "No"], "Please select either 'Yes' or 'No'")
        .required("This field is required"),
      active: string()
        .oneOf(["Yes", "No"], "Please select either 'Yes' or 'No'")
        .required("This field is required"),
    }),
  }),
  object().shape({
    levels: array()
      .of(
        object().shape({
          name: string().required("Class is required").optional(),
          type: string().optional(),
          initials: string().required("Class is required").optional(),
          levelName: string().required("Class is required").optional(),
        })
      )
      .optional(), // ✅ Optional: Only validates if there are files
  }),
  object().shape({
    students: array().of(object()).optional(),
  }),
  object().shape({
    exams: object().shape({
      midTermExams: object()
        .shape({
          from: string()
            .required("Required*")
            .test("is-within-core-dates", function (value) {
              const { core } = this.from[2].value;

              if (!core?.from || !core?.to || !value) return true;

              const start = dayjs(core.from).format("Do MMMM YYYY");
              const end = dayjs(core.to).format("Do MMMM YYYY");

              const isValid = dayjs(value).isBetween(
                dayjs(core.from),
                dayjs(core.to),
                undefined,
                "[]"
              );

              if (isValid) return true;
              return this.createError({
                message: `Mid Term Exams must be between ${start} and ${end}`,
              });
            }),
          to: string()
            .required("Required*")
            .test(
              "is-after-start",
              "End of Mid-Term must be after or the same as the start of Mid-Term",
              function (value) {
                const { from } = this.parent;
                return (
                  !from || !value || dayjs(value).isSameOrAfter(dayjs(from))
                );
              }
            )
            .test("is-within-core-dates", function (value) {
              const { core } = this.from[2].value;
              if (!core?.from || !core?.to || !value) return true;

              const start = dayjs(core.from).format("Do MMMM YYYY");
              const end = dayjs(core.to).format("Do MMMM YYYY");

              const isValid = dayjs(value).isBetween(
                dayjs(core.from),
                dayjs(core.to),
                undefined,
                "[]"
              );
              if (isValid) return true;
              return this.createError({
                message: `Mid Term Exams must be between ${start} and ${end}`,
              });
            }),
        })
        .optional(),

      revisionWeek: object()
        .shape({
          from: string()
            .required("Required*")
            .test("is-within-core-dates", function (value) {
              const { core } = this.from[2].value;
              if (!core?.from || !core?.to || !value) return true;

              const start = dayjs(core.from).format("Do MMMM YYYY");
              const end = dayjs(core.to).format("Do MMMM YYYY");

              const isValid = dayjs(value).isBetween(
                dayjs(core.from),
                dayjs(core.to),
                undefined,
                "[]"
              );

              if (isValid) return true;

              return this.createError({
                message: `Revision Week must be between ${start} and ${end}`,
              });
            }),
          to: string()
            .required("Required*")
            .test(
              "is-after-start",
              "End of Revision Week must be after or the same as the start of Revision Week",
              function (value) {
                const { from } = this.parent;
                return (
                  !from || !value || dayjs(value).isSameOrAfter(dayjs(from))
                );
              }
            )
            .test("is-within-core-dates", function (value) {
              const { core } = this.from[2].value;
              if (!core?.from || !core?.to || !value) return true;

              const start = dayjs(core.from).format("Do MMMM YYYY");
              const end = dayjs(core.to).format("Do MMMM YYYY");

              const isValid = dayjs(value).isBetween(
                dayjs(core.from),
                dayjs(core.to),
                undefined,
                "[]"
              );
              if (isValid) return true;

              return this.createError({
                message: `Revision Week must be between ${start} and ${end}`,
              });
            }),
        })
        .optional(),

      finalExams: object().shape({
        from: string()
          .required("Required*")
          .test("is-within-core-dates", function (value) {
            const { core } = this.from[2].value;
            if (!core?.from || !core?.to || !value) return true;

            const start = dayjs(core.from).format("Do MMMM YYYY");
            const end = dayjs(core.to).format("Do MMMM YYYY");

            const isValid = dayjs(value).isBetween(
              dayjs(core.from),
              dayjs(core.to),
              undefined,
              "[]"
            );

            if (isValid) return true;
            return this.createError({
              message: `Final Term Exams must be between ${start} and ${end}`,
            });
          }),
        to: string()
          .required("Required*")
          .test(
            "is-after-start",
            "End of Examination Week must be after or the same as the start of Examination Week",
            function (value) {
              const { from } = this.parent;
              return (
                !from || !value || dayjs(value).isSameOrAfter(dayjs(from))
              );
            }
          )
          .test("is-within-core-dates", function (value) {
            const { core } = this.from[2].value;
            if (!core?.from || !core?.to || !value) return true;

            const start = dayjs(core.from).format("YYYY-MM-DD");
            const end = dayjs(core.to).format("YYYY-MM-DD");

            const isValid = dayjs(value).isBetween(
              dayjs(core.from),
              dayjs(core.to),
              undefined,
              "[]"
            );
            if (isValid) return true;

            return this.createError({
              message: `Final Exams must be between ${start} and ${end}`,
            });
          }),
      }),
      scorePreference: string()
        .oneOf(["20/80", "30/70", "40/60", "50/50"], "Invalid score preference")
        .required("Score preference is required"),
      grade: object()
        .shape({
          name: string().required("Grade 1 is required").optional(),
          ratings: array()
            .of(
              object().shape({
                highestMarks: string().required("Class is required").optional(),
                lowestMarks: string().required("Class is required").optional(),
                grade: string().required("Class is required").optional(),
                remarks: string().required("Class is required").optional(),
              })
            )
            .optional(), // ✅ Optional: Only validates if there are files
        })
        .optional(),
    }),
  }),
  object().shape({
    report: object().shape({
      template: string().required("Please select a report template"),

      dimension: string()
        .oneOf(["A4", "A3", "Letter"], "Invalid report dimension")
        .required("Report dimension is required"),
    }),
  }),
];

export const editSessionSchemas = [
  object().shape({
    core: object().shape({
      name: string().trim().required("Required*"),
      from: string().required("Required*"),
      to: string()
        .required("Required*")
        .test(
          "is-after-start",
          "End of Academic Year date must be after or the same as the start of Academic Year",
          function (value) {
            const { from } = this.parent;
            return !from || !value || dayjs(value).isSameOrAfter(dayjs(from));
          }
        ),
      term: string().trim().required("Required*"),
    }),
  }),
  object().shape({
    exams: object().shape({
      midTermExams: object()
        .shape({
          from: string()
            .required("Required*")
            .test("is-within-core-dates", function (value) {
              const { core } = this.from[2].value;

              if (!core?.from || !core?.to || !value) return true;

              const start = dayjs(core.from).format("Do MMMM YYYY");
              const end = dayjs(core.to).format("Do MMMM YYYY");

              const isValid = dayjs(value).isBetween(
                dayjs(core.from),
                dayjs(core.to),
                undefined,
                "[]"
              );

              if (isValid) return true;
              return this.createError({
                message: `Mid Term Exams must be between ${start} and ${end}`,
              });
            }),
          to: string()
            .required("Required*")
            .test(
              "is-after-start",
              "End of Mid-Term must be after or the same as the start of Mid-Term",
              function (value) {
                const { from } = this.parent;
                return (
                  !from || !value || dayjs(value).isSameOrAfter(dayjs(from))
                );
              }
            )
            .test("is-within-core-dates", function (value) {
              const { core } = this.from[2].value;
              if (!core?.from || !core?.to || !value) return true;

              const start = dayjs(core.from).format("Do MMMM YYYY");
              const end = dayjs(core.to).format("Do MMMM YYYY");

              const isValid = dayjs(value).isBetween(
                dayjs(core.from),
                dayjs(core.to),
                undefined,
                "[]"
              );
              if (isValid) return true;
              return this.createError({
                message: `Mid Term Exams must be between ${start} and ${end}`,
              });
            }),
        })
        .optional(),

      revisionWeek: object()
        .shape({
          from: string()
            .required("Required*")
            .test("is-within-core-dates", function (value) {
              const { core } = this.from[2].value;
              if (!core?.from || !core?.to || !value) return true;

              const start = dayjs(core.from).format("Do MMMM YYYY");
              const end = dayjs(core.to).format("Do MMMM YYYY");

              const isValid = dayjs(value).isBetween(
                dayjs(core.from),
                dayjs(core.to),
                undefined,
                "[]"
              );

              if (isValid) return true;

              return this.createError({
                message: `Revision Week must be between ${start} and ${end}`,
              });
            }),
          to: string()
            .required("Required*")
            .test(
              "is-after-start",
              "End of Revision Week must be after or the same as the start of Revision Week",
              function (value) {
                const { from } = this.parent;
                return (
                  !from || !value || dayjs(value).isSameOrAfter(dayjs(from))
                );
              }
            )
            .test("is-within-core-dates", function (value) {
              const { core } = this.from[2].value;
              if (!core?.from || !core?.to || !value) return true;

              const start = dayjs(core.from).format("Do MMMM YYYY");
              const end = dayjs(core.to).format("Do MMMM YYYY");

              const isValid = dayjs(value).isBetween(
                dayjs(core.from),
                dayjs(core.to),
                undefined,
                "[]"
              );
              if (isValid) return true;

              return this.createError({
                message: `Revision Week must be between ${start} and ${end}`,
              });
            }),
        })
        .optional(),

      finalExams: object().shape({
        from: string()
          .required("Required*")
          .test("is-within-core-dates", function (value) {
            const { core } = this.from[2].value;
            if (!core?.from || !core?.to || !value) return true;

            const start = dayjs(core.from).format("Do MMMM YYYY");
            const end = dayjs(core.to).format("Do MMMM YYYY");

            const isValid = dayjs(value).isBetween(
              dayjs(core.from),
              dayjs(core.to),
              undefined,
              "[]"
            );

            if (isValid) return true;
            return this.createError({
              message: `Final Term Exams must be between ${start} and ${end}`,
            });
          }),
        to: string()
          .required("Required*")
          .test(
            "is-after-start",
            "End of Examination Week must be after or the same as the start of Examination Week",
            function (value) {
              const { from } = this.parent;
              return (
                !from || !value || dayjs(value).isSameOrAfter(dayjs(from))
              );
            }
          )
          .test("is-within-core-dates", function (value) {
            const { core } = this.from[2].value;
            if (!core?.from || !core?.to || !value) return true;

            const start = dayjs(core.from).format("YYYY-MM-DD");
            const end = dayjs(core.to).format("YYYY-MM-DD");

            const isValid = dayjs(value).isBetween(
              dayjs(core.from),
              dayjs(core.to),
              undefined,
              "[]"
            );
            if (isValid) return true;

            return this.createError({
              message: `Final Exams must be between ${start} and ${end}`,
            });
          }),
      }),
      scorePreference: string()
        .oneOf(["20/80", "30/70", "40/60", "50/50"], "Invalid score preference")
        .required("Score preference is required"),
    }),
  }),
  object()
    .shape({
      headmaster: object()
        .shape({
          name: string().required("Name is required"),
          phone: string()
            .required("Phone number is required")
            .matches(
              /^(\+\d{1,3})?\(?\d{3}\)?\d{3}\d{4}$/,
              "Invalid Phone number"
            ),
          signature: string().optional(),
        })
        .optional(),
    })
    .optional(),

  object().shape({
    report: object().shape({
      template: string().required("Please select a report template"),

      dimension: string()
        .oneOf(["A4", "A3", "Letter"], "Invalid report dimension")
        .required("Report dimension is required"),
    }),
  }),
];
