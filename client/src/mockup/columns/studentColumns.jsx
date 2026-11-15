import React from "react";
import { CircleRounded } from "@mui/icons-material";
import {
  Avatar,
  Button,
  FormControlLabel,
  LinearProgress,
  ListItemText,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import _ from "lodash";
import { gradeColor } from "@/config/gradeColor";
import { overallScoreGradeColor } from "@/config/overallScoreGradeColor";
import { Link } from "react-router-dom";

export const STUDENTS_COLUMN = [
  {
    field: "_id",
    title: "ID",
    hidden: true,
  },
  {
    field: "indexnumber",
    title: "Student ID",
    // hidden: true,
  },
  {
    field: "fullName",
    title: "FullName",
    searchable: true,
    customFilterAndSearch: (data, rowData) => {
      return (
        rowData.fullName.toLowerCase().lastIndexOf(data.toLowerCase()) > -1
      );
    },
    hidden: true,
    export: true,
  },

  {
    title: "Profile",
    field: "profile",
    export: false,
    // width: 400,
    searchable: true,
    render: (rowData) => (
      <Stack
        direction="row"
        columnGap={1}
        justifyContent="center"
        alignItems="center"
      >
        <Avatar src={rowData.profile} />
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "nowrap",
                fontWeight: "bold",
              }}
            >
              {rowData.fullName}
            </Typography>
          }
          secondary={
            <Typography variant="caption">{`${_.startCase(rowData.gender)} ,${
              new Date().getFullYear() -
              new Date(rowData.dateofbirth).getUTCFullYear()
            }yrs`}</Typography>
          }
        />
      </Stack>
    ),
  },

  {
    field: "active",
    title: "Status",
    export: false,
    render: ({ active }) => (
      <Button
        sx={{ bgcolor: active ? "success.lighter" : "error.lighter" }}
        startIcon={
          <CircleRounded
            sx={{ color: active ? "green" : "red", width: 10, height: 10 }}
          />
        }
      >
        {active ? "Active" : "Disabled"}
      </Button>
    ),
  },
  {
    field: "levelName",
    title: "Level",
    export: true,
    hidden: true,
    render: ({ levelName }) => (
      <Typography
        variant="caption"
        bgcolor="primary.main"
        color="#fff"
        padding={1}
      >
        {levelName}
      </Typography>
    ),
  },
  {
    field: "dateofbirth",
    title: "Date Of Birth",
    hidden: true,
    export: true,
  },
  {
    field: "gender",
    title: "Gender",
    hidden: true,
    export: true,
  },
  {
    field: null,
    title: "Contact Info",
    render: (rowData) => (
      <ListItemText
        primary={<Typography variant="body2">{rowData.email}</Typography>}
        secondary={
          <Typography variant="caption" color="primary" fontWeight="bold">
            {rowData.phonenumber}
          </Typography>
        }
      />
    ),
  },
  {
    field: "email",
    title: "Email",
    export: true,
    hidden: true,
  },
  {
    field: "phonenumber",
    title: "Telephone No.",
    export: true,
    hidden: true,
  },
  {
    field: "address",
    title: "Address",
    export: true,
    hidden: true,
  },
  // {
  //   field: "residence",
  //   title: "Residence",
  // },
  {
    field: "nationality",
    title: "Nationality",
    hidden: true,
  },
  {
    field: "levelId",
    hidden: true,
  },
  {
    title: "Level",
    field: "levelName",
    // hidden: true,
  },
];

export const RECENT_STUDENTS_COLUMN = [
  {
    field: "_id",
    title: "ID",
    hidden: true,
  },
  {
    field: "indexnumber",
    title: "Student ID",
    hidden: true,
  },
  {
    field: "fullName",
    title: "FullName",
    searchable: true,
    customFilterAndSearch: (data, rowData) => {
      return (
        rowData.fullName.toLowerCase().lastIndexOf(data.toLowerCase()) > -1
      );
    },
    hidden: true,
    export: true,
  },

  {
    title: "Profile",
    field: "profile",
    export: false,
    width: 400,
    searchable: true,
    render: (rowData) => (
      <Stack
        direction="row"
        columnGap={1}
        justifyContent="center"
        alignItems="center"
      >
        <Avatar src={rowData.profile} />
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "nowrap",
                fontWeight: "bold",
              }}
            >
              <Link
                to={`/student/view/${rowData?._id}?_l=${rowData?.levelId}`}
                style={{
                  color: "var(--primary)",
                }}
              >
                {rowData.fullName}
              </Link>
            </Typography>
          }
          secondary={
            <Typography variant="caption">
              {/* {`${_.startCase(rowData.gender)} ,
              ${dayjs().diff(
                dayjs(rowData.dateofbirth),
                "years"
              )}yrs`} */}
              {_.startCase(rowData.gender)}
              {/* {JSON.stringify(rowData.dateofbirth)} */}
            </Typography>
          }
        />
      </Stack>
    ),
  },

  {
    field: "gender",
    title: "Gender",
    hidden: true,
    export: true,
  },
  {
    field: null,
    title: "Contact Info",
    render: (rowData) => (
      <ListItemText
        primary={<Typography variant="body2">{rowData.email}</Typography>}
        secondary={
          <Typography variant="caption" color="primary" fontWeight="bold">
            {rowData.phonenumber}
          </Typography>
        }
      />
    ),
  },
  {
    field: "levelName",
    title: "Current Level",
    export: true,
    // hidden: true,
  },

  {
    field: "levelId",
    hidden: true,
  },
];

export const STUDENTS_ATTENDANCE_COLUMNS = [
  {
    field: "_id",
    title: "ID",
    hidden: true,
  },
  {
    field: "profile",
    title: "Avatar",
    export: false,
    render: (rowData) => <Avatar src={rowData.profile} />,
  },

  {
    field: "fullName",
    title: "FullName",
    export: true,
  },
  {
    field: "status",
    title: "Status",
    render: () => {
      return (
        <RadioGroup
          row
          aria-labelledby="demo-row-radio-buttons-group-label"
          name="row-radio-buttons-group"
        >
          <FormControlLabel
            value="present"
            control={<Radio size="small" />}
            label="Present"
          />
          <FormControlLabel
            value="absent"
            control={<Radio size="small" />}
            label="Absent"
          />
        </RadioGroup>
      );
    },
    export: true,
  },
];
export const STUDENTS_EXAMS_COLUMN = [
  {
    field: "_id",
    title: "ID",
    hidden: true,
  },
  {
    field: "studentId",
    title: "studentId",
    hidden: true,
  },
  {
    field: "indexnumber",
    title: "Index Number",
    hidden: true,
  },
  {
    field: "profile",
    title: "Student",
    export: false,
    render: (rowData) => (
      <Stack
        direction="row"
        columnGap={1}
        justifyContent="center"
        alignItems="center"
      >
        <Avatar src={rowData.profile} />
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "nowrap",
                fontWeight: "bold",
              }}
            >
              {rowData.fullName}
            </Typography>
          }
          secondary={
            <Typography variant="caption">{`${
              rowData?.indexnumber || ""
            },${_.startCase(rowData?.gender)}`}</Typography>
          }
        />
      </Stack>
    ),
    searchable: true,
    customFilterAndSearch: (data, rowData) => {
      return (
        rowData.fullName.toLowerCase().lastIndexOf(data.toLowerCase()) > -1
      );
    },
  },

  {
    title: "Level",
    field: "level",
  },

  {
    title: "Score",
    field: "overallScore",
    render: (data) => (
      <Button
        sx={{
          color: overallScoreGradeColor(data?.overallScore).color,
          bgcolor: overallScoreGradeColor(data?.overallScore).bg,
        }}
      >
        {data?.overallScore}
      </Button>
    ),
  },

  {
    title: "Completed",
    field: "entry",
    render: ({ entry }) => (
      <Stack spacing={1}>
        <LinearProgress
          variant="determinate"
          value={entry?.percent}
          sx={{
            height: 8,
            borderRadius: 1,
            mt: 1,
          }}
          color={entry?.percent === 100 ? "success" : "secondary"}
        />
        <Typography textAlign="center" fontSize={11}>
          {entry?.completed}/{entry?.total}
        </Typography>
      </Stack>
    ),
  },

  {
    field: "levelId",
    hidden: true,
  },
  // {
  //   field: 'levelName',
  //   title: 'Level',
  //   // hidden: true,
  //   export: true,
  // },
];

export const STUDENT_RESULT_COLUMNS = [
  {
    field: "_id",
    title: "ID",
    hidden: true,
    export: false,
  },
  {
    field: "indexnumber",
    title: "Index Number",
  },
  {
    field: "student",
    title: "Student",
  },
  {
    field: "course.subject",
    title: "Subject",
    export: false,
  },
  {
    field: "course.classScore",
    title: "Class Score",
  },
  {
    field: "course.examsScore",
    title: "Exams Score",
  },
  {
    field: "course.totalScore",
    title: "Total Score",
  },
  {
    field: "course.grade",
    title: "Grade",
  },
  {
    field: "course.remarks",
    title: "Remarks",
    render: ({ course }) => {
      return (
        <Button
          size="small"
          sx={{
            color: gradeColor(course?.totalScore).color,
            bgcolor: gradeColor(course?.totalScore).bg,
          }}
        >
          {course?.remarks}
        </Button>
      );
    },
  },
];

export const studentFeesReportColumns = [
  {
    name: "id",
    title: "ID",
    options: {
      display: false,
    },
  },

  {
    name: "studentId",
    options: {
      display: false,
    },
  },
  {
    name: "schoolSessionId",
    options: {
      display: false,
    },
  },
  {
    name: "date",
    title: "Date Of Issue",
  },
  {
    name: "amountPaid",
    title: "Amount Paid",
  },
  {
    name: "amountOutstanding",
    title: "Outstanding Amount",
  },
  {
    name: "issuer",
    title: "Issuer",
  },
];

export const IMPORT_STUDENT_COLUMNS = [
  {
    name: "_id",
    title: "ID",
    hidden: true,
  },
  {
    field: "indexnumber",
    title: "STUDENT ID",
  },
  {
    field: "firstname",
    title: "FIRST NAME",
  },
  {
    field: "surname",
    title: "SURNAME",
  },
  {
    field: "othername",
    title: "OTHER NAME",
  },
  {
    field: "dateofbirth",
    title: "DATE OF BIRTH",
  },
  {
    field: "gender",
    title: "GENDER",
  },
  {
    field: "email",
    title: "EMAIL ADDRESS",
  },
  {
    field: "phonenumber",
    title: "TELEPHONE NUMBER",
  },
  {
    field: "address",
    title: "HOUSE/GPS ADDRESS",
  },
  {
    field: "residence",
    title: "RESIDENCE",
  },
  {
    field: "nationality",
    title: "NATIONALITY",
  },
];
