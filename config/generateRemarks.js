const {
  CONDUCT,
  INTEREST,
  EXCELLENT,
  VERYGOOD,
  AVERAGE,
  PASS,
  FAIL,
} = require('./generalRemarks');
const generateRemarks = (totalScore) => {
  let teachersComments = '';
  let headteachersComments = '';

  if (totalScore >= 800) {
    teachersComments = EXCELLENT[Math.floor(Math.random() * EXCELLENT.length)];
    headteachersComments =
      EXCELLENT[Math.floor(Math.random() * EXCELLENT.length)];
  } else if (totalScore >= 700) {
    teachersComments = EXCELLENT[Math.floor(Math.random() * EXCELLENT.length)];
    headteachersComments =
      VERYGOOD[Math.floor(Math.random() * VERYGOOD.length)];
  } else if (totalScore >= 600) {
    teachersComments = VERYGOOD[Math.floor(Math.random() * VERYGOOD.length)];
    headteachersComments = AVERAGE[Math.floor(Math.random() * AVERAGE.length)];
  } else if (totalScore >= 500) {
    teachersComments = AVERAGE[Math.floor(Math.random() * AVERAGE.length)];
    headteachersComments = AVERAGE[Math.floor(Math.random() * AVERAGE.length)];
  } else if (totalScore >= 400) {
    teachersComments = PASS[Math.floor(Math.random() * PASS.length)];
    headteachersComments = PASS[Math.floor(Math.random() * PASS.length)];
  } else {
    teachersComments = FAIL[Math.floor(Math.random() * FAIL.length)];
    headteachersComments = FAIL[Math.floor(Math.random() * FAIL.length)];
  }

  return {
    conduct: CONDUCT[Math.floor(Math.random() * CONDUCT.length)],
    interest: INTEREST[Math.floor(Math.random() * INTEREST.length)],
    teachersComments,
    headteachersComments,
  };
};

module.exports = generateRemarks;
