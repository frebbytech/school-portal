import {
  messageValidationSchema,
  onlyEmailValidationSchema,
  onlyPhoneValidationSchema,
} from "./validationSchema";

const session = JSON.parse(localStorage.getItem("@school_session"));

//session
export const sessionInitialValues = {
  from: "",
  to: "",
  term: "",
  academicYear: "",
  vacationDate: "",
  reOpeningDate: "",
};
export const sessionDefaultValues = {
  core: {
    name: "",
    from: new Date(),
    to: new Date(),
    term: "",
    isPromotionTerm: "",
    active: "No",
  },
  levels: [],
  students: [],
  exams: {
    midTermExams: {
      from: "",
      to: "",
    },
    revisionWeek: {
      from: "",
      to: "",
    },
    finalExams: {
      from: "",
      to: "",
    },
    scorePreference: "50/50",
    grade: {},
  },
  report: {
    template: "",
    dimension: "A4",
  },
};
export const parentDefaultValues = {
  firstname: "",
  surname: "",
  gender: "",
  relationship: "",
  email: "",
  phonenumber: "",
  address: "",
  residence: "",
  nationality: "",
};

export const newStudentDefaultValues = {
  personal: {
    indexnumber: "",
    firstname: "",
    surname: "",
    othername: "",
    gender: "male",
    email: "",
    dateofbirth: "",
    phonenumber: "",
    address: "",
    residence: "",
    nationality: "",
  },
  photo: {
    profile: null,
  },
  parent: [parentDefaultValues],
  medical: {
    heartDisease: "",
    visualImpairment: "",
    asthma: "",
    hearingImpairment: "",
    seizures: "",
    physicalDisability: "",
    emergencyContact: {
      fullname: "",
      phonenumber: "",
      address: "",
    },
  },
  academic: {
    previousSchool: {
      name: "",
      location: "",
      report: null,
    },
    level: {
      _id: "",
      type: "",
    },
  },
};

export const levelInitialValues = {
  level: "",
  type: "",
  subjects: [],
  initials: "",
  department: "",
  teacher: { _id: "", fullName: "" },
};

//student
export const studentInitialValues = {
  firstname: "",
  surname: "",
  othername: "",
  dateofbirth: "",
  gender: "male",
  email: "",
  phonenumber: "",
  address: "",
  residence: "",
  nationality: "",
  session: session,
};

// medical
export const medicalInitialValues = {
  heartDisease: "No",
  asthma: "No",
  siezures: "No",
  visualImpairment: "No",
  hearingImpairment: "No",
  physicalDisability: "No",
  emergencyContact: {
    fullname: "",
    phonenumber: "",
    address: "",
  },
};
export const academicInitialValues = {
  level: {
    _id: "",
    type: "",
  },
  previousSchool: {
    name: "",
    location: "",
  },
};

//student
export const teacherInitialValues = {
  profile: null,
  firstname: "",
  lastname: "",
  username: "",
  dateofbirth: "",
  gender: "",
  email: "",
  phonenumber: "",
  address: "",
  residence: "",
  nationality: "",
};

//student
export const userInitialValues = {
  profile: null,
  firstname: "",
  lastname: "",
  username: "",
  dateofbirth: "",
  gender: "",
  role: "",
  email: "",
  phonenumber: "",
  address: "",
  residence: "",
  nationality: "",
  password: "",
  confirmPassword: "",
};

// export const userInitialValues = {

//   "profile": null,
//   "firstname": "jane",
//   "lastname": "doe",
//   "username": "yyy",
//   "dateofbirth": "02/03/2025",
//   "gender": "male",
//   "email": "nicktest701@gmail.com",
//   "role": "administrator",
//   "phonenumber": "0543772591",
//   "address": "Plot 15,Block D,Kumasi",
//   "residence": "Abdulaikrom",
//   "nationality": "Anguillan",

// }

//parent
export const parentInitialValues = {
  parent1: parentDefaultValues,
  parent2: parentDefaultValues,
};

//sms
export const quickMessageInitialValues = (radioValue) => {
  switch (radioValue) {
    case "sms":
      return {
        init: {
          type: radioValue,
          phonenumber: "",
          title: "",
          message: "",
        },
        val: onlyPhoneValidationSchema,
      };
    case "email":
      return {
        init: {
          type: radioValue,
          title: "",
          email: "",
          message: "",
        },
        val: onlyEmailValidationSchema,
      };

    default:
      return {
        init: {
          type: radioValue,
          title: "",
          email: "",
          message: "",
          phonenumber: "",
        },
        val: messageValidationSchema,
      };
  }
};

export const bulkMessageInitialValues = {
  title: "",
  message: "",
};
