import React from "react";
import { CircleRounded, Edit } from "@mui/icons-material";
import {
  Avatar,
  Button,
  IconButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import _ from "lodash";
import { Link } from "react-router-dom";
export const TEACHERS_COLUMN = [
  {
    field: "_id",
    title: "ID",
    hidden: true,
  },
  {
    field: "fullname",
    title: "FullName",
    hidden: true,
    export: true,
  },
  {
    title: "Profile",
    field: "profile",
    export: false,
    width: 400,
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
              {rowData.fullname}
            </Typography>
          }
          secondary={
            <Typography variant="caption">{`${_.startCase(rowData.gender)},${
              new Date().getFullYear() -
              new Date(rowData.dateofbirth).getUTCFullYear()
            }yrs`}</Typography>
          }
        />
      </Stack>
    ),
  },
  {
    field: "username",
    title: "Username",
  },
  {
    field: "active",
    title: "Status",
    export: false,
    render: ({ active }) => (
      <Button
        startIcon={
          <CircleRounded
            sx={{ color: active ? "green" : "red", width: 10, height: 10 }}
          />
        }
      >
        {active ? "Active" : "Deactivated"}
      </Button>
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
  {
    field: "residence",
    title: "Residence",
  },
  {
    field: "nationality",
    title: "Nationality",
    hidden: true,
    export: true,
  },
];

export const IMPORT_TEACHER_COLUMNS = [
  {
    field: "firstname",
    title: "FIRST NAME",
  },
  {
    field: "surname",
    title: "SURNAME",
  },
  {
    field: "username",
    title: "USERNAME",
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

export const TEACHER_ASSIGNED_COURSES_COLUMNS = [
  {
    field: "_id",
    title: "ID",
    hidden: true,
  },

  {
    title: "Profile",
    field: "profile",
    export: false,
    width: 400,
    render: (rowData) => (
      <Stack
        direction="row"
        columnGap={1}
        justifyContent="center"
        alignItems="center"
      >
        <Avatar src={rowData?.teacher?.profile} />
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "nowrap",
                fontWeight: "bold",
              }}
            >
              {rowData?.teacher?.fullname}
            </Typography>
          }
        />
      </Stack>
    ),
  },
  {
    field: "teacher.fullname",
    title: "Teacher",
    hidden: true,
    export: true,
  },
  {
    field: "academicYear",
    title: "Academic Year",
    export: true,
  },
  {
    field: "term",
    title: "Term",
    export: true,
  },
  {
    field: "level",
    title: "Level",
    export: true,
  },
  // {
  //   field: "noOfStudents",
  //   title: "No. of Students",
  //   export: true,
  // },
  {
    field: "subject",
    title: "Course/Subject",
    export: true,
  },
  {
    field: null,
    title: "Action",
    export: false,
    render: (rowData) => (
      <Link
        to={`/teacher/${rowData?.teacher?._id}/courses`}
        title="View Course"
      >
        <IconButton title="View Course">
          <Edit titleAccess="View Course" />
        </IconButton>
      </Link>
    ),
  },
];
export const TEACHER_ASSIGNED_LEVELS_COLUMNS = [
  {
    field: "_id",
    title: "ID",
    hidden: true,
  },
  {
    title: "Profile",
    field: "profile",
    export: false,
    width: 400,
    render: (rowData) => (
      <Stack
        direction="row"
        columnGap={1}
        justifyContent="center"
        alignItems="center"
      >
        <Avatar src={rowData?.teacher?.profile} />
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "nowrap",
                fontWeight: "bold",
              }}
            >
              {rowData?.teacher?.fullName}
            </Typography>
          }
        />
      </Stack>
    ),
  },
  {
    field: "teacher.fullName",
    title: "Teacher",
    hidden: true,
    export: true,
  },
  {
    field: "level",
    title: "Level",
    export: true,
  },
  {
    field: "noOfStudents",
    title: "No. of Students",
    export: true,
  },
  {
    field: "noOfSubjects",
    title: "No. of Subjects",
    export: true,
  },
  {
    field: null,
    title: "Action",
    export: false,
    render: (rowData) => (
      <Link to={`/teacher/${rowData?.teacher?._id}/levels`} title="View classes">
        <IconButton title="View classes">
          <Edit titleAccess="View classes" />
        </IconButton>
      </Link>
    ),
  },
];
