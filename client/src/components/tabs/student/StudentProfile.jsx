/* eslint-disable react/prop-types */
import React, { useContext, useState } from "react";
import {
  AccountBoxRounded,
  DeleteForeverRounded,
  EditRounded,
  MedicalInformationRounded,
  Person,
  PersonRounded,
  PhoneRounded,
  Report,
} from "@mui/icons-material";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

import Swal from "sweetalert2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StudentContext } from "@/context/providers/StudentProvider";
import StudentEdit from "@/pages/student/StudentEdit";
import { disableStudentAccount, getStudentInfo } from "@/api/studentAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import dayjs from "@/lib/dates";
import ViewParent from "@/pages/student/tab/ViewParent";
import MedicalInformationEdit from "@/pages/student/MedicalInformationEdit";
import { useParams, useSearchParams } from "react-router-dom";
import ViewPreviousReport from "@/pages/student/tab/ViewPreviousReport";
import ProfileItem from "@/components/typo/ProfileItem";
import ChipItem from "@/components/list/ChipItem";
import { IconButton, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import GlobalSpinner from "@/components/spinners/GlobalSpinner";
import AcademicEdit from "@/pages/student/AcademicEdit";
const StudentProfile = ({ levelName, student, parents }) => {
  const { type, studentId } = useParams();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { studentDispatch } = useContext(StudentContext);
  const queryClient = useQueryClient();
  const [openViewParent, setOpenViewParent] = useState(false);
  const [openViewPreviousReport, setOpenViewPreviousReport] = useState(false);
  const { breakpoints } = useTheme();
  const matches = useMediaQuery(breakpoints.up("md"));

  const [_, setSearchParams] = useSearchParams();

  ///
  const { data } = useQuery({
    queryKey: ["student/id", studentId],
    queryFn: () => getStudentInfo(studentId),
    enabled: !!studentId,
    initialData: () =>
      queryClient
        .getQueryData(["all-students"])
        ?.find((student) => student?._id === studentId),
  });

  const handleOpenMedicalHistory = () => {
    setSearchParams({
      mi: true,
    });
  };

  //EDIT Student Info
  const openStudentEdit = () => {
    studentDispatch({
      type: "editStudent",
      payload: {
        open: true,
        data: student,
      },
    });
  };

  //EDIT Student Info
  const openAcademicEdit = () => {
    studentDispatch({
      type: "editStudentAcademics",
      payload: {
        open: true,
        data: {
          department: {
            _id: "",
            name: "",
          },
          house: {
            _id: "",
            name: "",
          },
          level: {
            _id: student?.level?._id,
            type: student?.level?.levelName,
          },
          previousSchool: {
            name: "",
            location: "",
            report: null,
          },
          ...student?.academic,
        },
      },
    });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: disableStudentAccount,
  });
  //DISABLE (or enable) a student account. Students are never deleted: a disabled student cannot
  //sign in, and their results, fees and attendance are kept.
  const handleDisableAccount = () => {
    const disabling = Boolean(student?.active);
    Swal.fire({
      title: `${disabling ? "Disable" : "Enable"} student account`,
      text: disabling
        ? "The student will not be able to sign in. Their results, fees and attendance are kept, and you can enable the account again at any time."
        : "The student will be able to sign in again.",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      mutate(
        { id: student?._id, active: disabling ? "Yes" : "No" },
        {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["student/id"] });
            queryClient.invalidateQueries({ queryKey: ["levels"] });
          },
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        }
      );
    });
  };

  const openPreviousReport = () => {
    setOpenViewPreviousReport(true);
  };

  return (
    <>
      <Box>
        <Typography
          variant="h5"
          color="primary.main"
          bgcolor="lightgray"
          p={1}
          sx={{ fontWeight: "bold", width: "100%" }}
        >
          Profile Information
        </Typography>
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          pt={2}
          columnGap={2}
        >
          {matches ? (
            <>
              <Button startIcon={<EditRounded />} onClick={openStudentEdit}>
                Edit
              </Button>
              <Button
                startIcon={<Person />}
                onClick={() => setOpenViewParent(true)}
              >
                Parent Info
              </Button>
              <Button
                startIcon={<MedicalInformationRounded />}
                onClick={handleOpenMedicalHistory}
              >
                Medical History
              </Button>
            </>
          ) : (
            <>
              <Tooltip title="Edit Profile">
                <IconButton onClick={openStudentEdit}>
                  <EditRounded />
                </IconButton>
              </Tooltip>
              <Tooltip title="View Parent Info">
                <IconButton onClick={() => setOpenViewParent(true)}>
                  <Person />
                </IconButton>
              </Tooltip>
              <Tooltip title="Medical History">
                <IconButton onClick={handleOpenMedicalHistory}>
                  <MedicalInformationRounded />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>

        <ChipItem divider={true} label="Basic Info" icon={<PersonRounded />} />
        <Stack py={2} xs={{ bgcolor: "#fff", borderRadius: "12px" }}>
          <ProfileItem label="ID" text={student?.indexnumber} />
          <ProfileItem label="Name" text={student?.fullName} />
          <ProfileItem
            label="Date of Birth"
            text={dayjs(new Date(student?.dateofbirth)).format(
              "Do MMMM, YYYY."
            )}
          />
          <ProfileItem label="Gender" text={student?.gender} />
        </Stack>

        <ChipItem
          divider={true}
          label="Contact Info."
          icon={<PhoneRounded />}
        />
        <Stack py={2}>
          <ProfileItem label="Email Address" text={student?.email} />
          <ProfileItem label="Telephone Number" text={student?.phonenumber} />
          <ProfileItem label="Address" text={student?.address} />
          <ProfileItem label="Residence" text={student?.residence} />
          <ProfileItem label="Nationality" text={student?.nationality} />
        </Stack>

        <ChipItem
          divider={true}
          label="Academic Info."
          icon={<EditRounded />}
        />
        <Stack py={2}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditRounded />}
            sx={{ alignSelf: "end" }}
            onClick={openAcademicEdit}
          >
            Edit
          </Button>
          <ProfileItem
            label="Department"
            text={student?.academic?.department?.name || "Not Available"}
          />
          <ProfileItem label="Current Level" text={type || levelName} />
          <ProfileItem
            label="House/Section"
            text={student?.academic?.house?.name || "Not Available"}
          />
          <ProfileItem
            label="Previous School"
            text={`${
              student?.academic?.previousSchool?.name || "Not Available"
            } `}
          />
          <Button
            startIcon={<Report />}
            onClick={openPreviousReport}
            variant="contained"
            sx={{ alignSelf: "flex-end" }}
          >
            Previous Report
          </Button>
        </Stack>
        <ChipItem
          divider={true}
          label="Account Info."
          icon={<AccountBoxRounded />}
        />
        <ProfileItem
          label="Account Status"
          text={student?.active ? "Active" : "Disabled"}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end", py: 1 }}>
          <Button
            variant="contained"
            color="error"
            endIcon={<DeleteForeverRounded />}
            onClick={handleDisableAccount}
          >
            {student?.active ? "Disable Account" : "Enable Account"}
          </Button>
        </Box>
      </Box>
      <StudentEdit />
      <AcademicEdit />
      <ViewParent
        parents={parents}
        open={openViewParent}
        setOpen={setOpenViewParent}
      />
      <MedicalInformationEdit
        medical={{ ...student?.medical, id: student?._id }}
      />
      <ViewPreviousReport
        report={student?.academic?.previousSchool?.report}
        open={openViewPreviousReport}
        setOpen={setOpenViewPreviousReport}
      />

      {isPending && <GlobalSpinner />}
    </>
  );
};

export default StudentProfile;
